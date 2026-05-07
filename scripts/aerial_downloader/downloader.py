from __future__ import annotations

import concurrent.futures
import ssl
import sys
import threading
import time
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .models import AerialVideo, DownloadPlan
from .network import request_headers
from .terminal import TTY, human_bytes, icon, progress_bar, style, success, warn


MAX_DOWNLOAD_WORKERS = 8
ProgressCallback = Callable[[int], None]
WarningCallback = Callable[[str], None]


def short_name(plan: DownloadPlan) -> str:
    label = plan.video.label.strip()
    if label and label != plan.video.filename:
        return label[:32]
    stem = Path(plan.video.filename).stem
    return stem[:12] + "..." if len(stem) > 15 else plan.video.filename


class DownloadProgress:
    def __init__(self, plans: List[DownloadPlan]) -> None:
        self.total_files = len(plans)
        self.total_bytes = sum(
            plan.remaining_size or 0
            for plan in plans
            if plan.remaining_size is not None
        )
        self.has_unknown_bytes = any(plan.remaining_size is None for plan in plans)
        self.finished_files = 0
        self.transferred_bytes = 0
        self.active: Dict[str, str] = {}
        self.lock = threading.Lock()
        self.rendered_lines = 0
        self.last_render = 0.0
        self.started_at = time.monotonic()

    def start(self, plan: DownloadPlan) -> None:
        with self.lock:
            self.active[plan.video.filename] = short_name(plan)
            self.render(force=True)

    def advance(self, byte_count: int) -> None:
        with self.lock:
            self.transferred_bytes += byte_count
            self.render()

    def note_warning(self, message: str) -> None:
        with self.lock:
            self.clear()
            warn(message)
            self.render(force=True)

    def finish_file(self, plan: DownloadPlan, ok: bool, message: str = "") -> None:
        with self.lock:
            self.active.pop(plan.video.filename, None)
            self.finished_files += 1
            self.clear()
            if ok:
                success(f"done {plan.video.filename}")
            else:
                print(
                    style(
                        f"{icon('error')}failed {plan.video.filename}: {message}",
                        "red",
                    ),
                    file=sys.stderr,
                )
            self.render(force=True)

    def finish(self) -> None:
        with self.lock:
            self.clear()

    def render(self, force: bool = False) -> None:
        if not TTY:
            return

        now = time.monotonic()
        if not force and now - self.last_render < 0.2:
            return
        self.last_render = now

        self.clear()
        total_display = human_bytes(self.total_bytes)
        byte_display = human_bytes(self.transferred_bytes)
        if self.has_unknown_bytes:
            total_display += "+"
        byte_percent = (
            min(int(self.transferred_bytes / self.total_bytes * 100), 100)
            if self.total_bytes
            else 0
        )
        file_percent = (
            min(int(self.finished_files / self.total_files * 100), 100)
            if self.total_files
            else 100
        )
        active = " + ".join(self.active.values()) if self.active else "waiting"
        lines = [
            (
                f"{style(icon('download') + 'Downloading aerials', 'cyan')} "
                f"{self.finished_files} / {self.total_files}   "
                f"{byte_display} / {total_display}"
            ),
            f"   {progress_bar(byte_percent, 100, 34)}  {byte_percent or file_percent}%",
            f"   Active: {active}",
        ]
        print("\n".join(lines), end="", flush=True)
        self.rendered_lines = len(lines)

    def clear(self) -> None:
        if not TTY or self.rendered_lines == 0:
            return

        print("\r\033[2K", end="")
        for _ in range(self.rendered_lines - 1):
            print("\033[1A\033[2K", end="")
        print("\r", end="", flush=True)
        self.rendered_lines = 0


def download_file(
    video: AerialVideo,
    destination: Path,
    timeout: int,
    remote_size: Optional[int],
    overwrite: bool,
    force: bool,
    context: Optional[ssl.SSLContext],
    progress_callback: Optional[ProgressCallback] = None,
    warning_callback: Optional[WarningCallback] = None,
) -> None:
    tmp_destination = destination.with_name(destination.name + ".part")
    if force and tmp_destination.exists():
        tmp_destination.unlink()

    if not force and destination.exists() and destination.stat().st_size > 0:
        destination_size = destination.stat().st_size
        partial_size = tmp_destination.stat().st_size if tmp_destination.exists() else 0
        if destination_size >= partial_size:
            destination.replace(tmp_destination)

    resume_from = tmp_destination.stat().st_size if tmp_destination.exists() else 0
    if remote_size is not None and resume_from >= remote_size and resume_from > 0:
        tmp_destination.replace(destination)
        return

    extra_headers = {}
    if resume_from > 0:
        extra_headers["Range"] = f"bytes={resume_from}-"

    request = Request(video.url, headers=request_headers(extra_headers))

    try:
        response = urlopen(request, timeout=timeout, context=context)
    except HTTPError as error:
        if error.code == 416 and remote_size is not None and resume_from >= remote_size:
            tmp_destination.replace(destination)
            return
        raise

    with response:
        status = getattr(response, "status", None)
        if resume_from > 0 and status == 206:
            mode = "ab"
        else:
            if resume_from > 0 and status != 206 and warning_callback:
                warning_callback(
                    f"server did not resume {video.filename}; restarting this file"
                )
            mode = "wb"

        with tmp_destination.open(mode) as output:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                output.write(chunk)
                if progress_callback:
                    progress_callback(len(chunk))

    tmp_destination.replace(destination)


def download_one_plan(
    plan: DownloadPlan,
    retries: int,
    timeout: int,
    overwrite: bool,
    force: bool,
    context: Optional[ssl.SSLContext],
    progress: DownloadProgress,
) -> bool:
    progress.start(plan)
    for attempt in range(retries + 1):
        try:
            download_file(
                plan.video,
                plan.destination,
                timeout,
                plan.remote_size,
                overwrite,
                force,
                context,
                progress_callback=progress.advance,
                warning_callback=progress.note_warning,
            )
            progress.finish_file(plan, ok=True)
            return True
        except (HTTPError, URLError, TimeoutError, OSError) as error:
            if attempt >= retries:
                progress.finish_file(plan, ok=False, message=str(error))
                return False
            wait_seconds = min(2 ** attempt, 8)
            progress.note_warning(f"retrying {plan.video.filename} after error: {error}")
            time.sleep(wait_seconds)

    return False


def run_downloads(
    plans: List[DownloadPlan],
    retries: int,
    timeout: int,
    overwrite: bool,
    force: bool,
    requested_parallel: int,
    context: Optional[ssl.SSLContext],
) -> Tuple[int, int, int]:
    skipped = sum(1 for plan in plans if plan.action == "skip")
    to_download = [plan for plan in plans if plan.action != "skip"]
    if not to_download:
        return 0, skipped, 0

    parallel = max(1, min(requested_parallel, MAX_DOWNLOAD_WORKERS, len(to_download)))
    progress = DownloadProgress(to_download)
    downloaded = 0
    failed = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=parallel) as executor:
        futures = [
            executor.submit(
                download_one_plan,
                plan,
                retries,
                timeout,
                overwrite,
                force,
                context,
                progress,
            )
            for plan in to_download
        ]
        for future in concurrent.futures.as_completed(futures):
            if future.result():
                downloaded += 1
            else:
                failed += 1

    progress.finish()
    return downloaded, skipped, failed
