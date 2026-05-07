from __future__ import annotations

import concurrent.futures
import shutil
import ssl
import sys
from pathlib import Path
from typing import List, Optional, Tuple

from .models import AerialVideo, DownloadPlan
from .network import fetch_remote_size
from .terminal import TTY, human_bytes, icon, info, progress_bar, style, warn


MAX_PROBE_WORKERS = 8


def existing_parent(path: Path) -> Path:
    candidate = path
    while not candidate.exists() and candidate.parent != candidate:
        candidate = candidate.parent
    return candidate


def probe_status(done: int, total: int) -> None:
    if TTY:
        message = (
            f"\r{style(icon('probe') + 'Probing remote sizes', 'cyan')} "
            f"{progress_bar(done, total)} {done}/{total}"
        )
        print(message.ljust(90), end="", flush=True)


def plan_one_video(
    video: AerialVideo,
    output_dir: Path,
    overwrite: bool,
    force: bool,
    timeout: int,
    context: Optional[ssl.SSLContext],
) -> Tuple[DownloadPlan, Optional[str]]:
    destination = output_dir / video.filename
    partial = destination.with_name(destination.name + ".part")
    existing_size = destination.stat().st_size if destination.exists() else 0
    partial_size = partial.stat().st_size if partial.exists() else 0
    remote_size, warning = fetch_remote_size(video, timeout, context)

    if force:
        action = "overwrite" if existing_size > 0 else "download"
    elif (
        destination.exists()
        and existing_size > 0
        and remote_size is not None
        and existing_size == remote_size
    ):
        action = "skip"
    elif destination.exists() and existing_size > 0 and remote_size is None:
        action = "overwrite" if overwrite else "skip"
    elif destination.exists() and existing_size > 0 and remote_size is not None:
        action = "resume"
    elif partial_size > 0 and not overwrite:
        action = "resume"
    else:
        action = "download"

    return (
        DownloadPlan(
            video=video,
            destination=destination,
            remote_size=remote_size,
            existing_size=existing_size,
            partial_size=partial_size,
            action=action,
        ),
        warning,
    )


def build_download_plan(
    videos: List[AerialVideo],
    output_dir: Path,
    overwrite: bool,
    force: bool,
    timeout: int,
    context: Optional[ssl.SSLContext],
) -> List[DownloadPlan]:
    plans: List[Optional[DownloadPlan]] = [None] * len(videos)
    warnings: List[str] = []
    total = len(videos)
    completed = 0

    if TTY:
        probe_status(0, total)
    else:
        info(f"Probing remote sizes for {total} videos...")

    worker_count = min(MAX_PROBE_WORKERS, max(total, 1))
    with concurrent.futures.ThreadPoolExecutor(max_workers=worker_count) as executor:
        future_to_index = {
            executor.submit(
                plan_one_video,
                video,
                output_dir,
                overwrite,
                force,
                timeout,
                context,
            ): index
            for index, video in enumerate(videos)
        }
        for future in concurrent.futures.as_completed(future_to_index):
            index = future_to_index[future]
            plan, warning = future.result()
            plans[index] = plan
            if warning:
                warnings.append(warning)
            completed += 1
            probe_status(completed, total)

    if TTY:
        print("")

    for warning in warnings[:5]:
        warn(warning)
    if len(warnings) > 5:
        warn(f"{len(warnings) - 5} more remote size estimates failed.")

    return [plan for plan in plans if plan is not None]


def summarize_plan(plans: List[DownloadPlan], output_dir: Path) -> bool:
    to_download = [plan for plan in plans if plan.action != "skip"]
    skipped_plans = [plan for plan in plans if plan.action == "skip"]
    known_remaining = sum(
        plan.remaining_size or 0
        for plan in to_download
        if plan.remaining_size is not None
    )
    unknown_count = sum(1 for plan in to_download if plan.remaining_size is None)

    disk_root = existing_parent(output_dir)
    available = shutil.disk_usage(disk_root).free

    print("")
    info(f"Will download: {len(to_download)} of {len(plans)} videos")
    info(f"Already present: {len(skipped_plans)}")
    if skipped_plans:
        print("Skipped files:")
        for plan in skipped_plans[:10]:
            print(f"  - {plan.video.filename}")
        if len(skipped_plans) > 10:
            print(f"  ... and {len(skipped_plans) - 10} more")
    if unknown_count:
        print(
            "Estimated remaining size: "
            f"{human_bytes(known_remaining)} plus {unknown_count} unknown file(s)"
        )
    else:
        print(f"Estimated remaining size: {human_bytes(known_remaining)}")
    print(f"Available disk space: {human_bytes(available)}")

    if known_remaining > available:
        print(
            "Error: estimated download size exceeds available disk space.",
            file=sys.stderr,
        )
        return False

    if unknown_count:
        warn(
            "some files did not return Content-Length, so the estimate may be low."
        )

    return True
