#!/usr/bin/env python3
"""Download macOS Aerial videos listed in the local Aerial manifest.

This helper is intended for Macify users who want a complete local video
library before pointing Macify at a local HTTP server.
"""

from __future__ import annotations

import argparse
import json
import shutil
import ssl
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen


NEW_MANIFEST = (
    Path.home()
    / "Library/Application Support/com.apple.wallpaper/aerials/manifest/entries.json"
)
NEW_VIDEO_DIR = (
    Path.home() / "Library/Application Support/com.apple.wallpaper/aerials/videos"
)

DEFAULT_QUALITY = "url-4K-SDR-240FPS"
FALLBACK_URL_KEYS = (
    "url-4K-SDR-240FPS",
    "url-4K-HDR-240FPS",
    "url-1080-SDR-240FPS",
    "url-1080-HDR-240FPS",
)


@dataclass(frozen=True)
class AerialVideo:
    label: str
    url: str
    filename: str


@dataclass(frozen=True)
class DownloadPlan:
    video: AerialVideo
    destination: Path
    remote_size: Optional[int]
    existing_size: int
    partial_size: int
    action: str

    @property
    def remaining_size(self) -> Optional[int]:
        if self.action == "skip":
            return 0
        if self.remote_size is None:
            return None
        if self.action == "resume":
            local_progress = max(self.existing_size, self.partial_size)
            return max(self.remote_size - local_progress, 0)
        return self.remote_size


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download the full macOS Aerial catalog from the local manifest."
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        help="Path to entries.json. Defaults to the current macOS user manifest.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Directory for downloaded videos. Required when --manifest is set.",
    )
    parser.add_argument(
        "--quality",
        default=DEFAULT_QUALITY,
        help=f"Manifest URL key to prefer. Default: {DEFAULT_QUALITY}",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Redownload files whose size does not match the remote size.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Redownload every file, even when the local size matches the remote size.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Estimate and list what would be downloaded without writing files.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Download at most this many videos. Useful for testing.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=2,
        help="Retry count per file after the first failed attempt. Default: 2",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=60,
        help="Network timeout in seconds. Default: 60",
    )
    parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Skip the interactive confirmation prompt.",
    )
    parser.add_argument(
        "--insecure-ssl",
        action="store_true",
        help="Disable HTTPS certificate verification for Apple's Aerial host.",
    )
    return parser.parse_args()


def first_existing_manifest(explicit_manifest: Optional[Path]) -> Path:
    if explicit_manifest:
        if explicit_manifest.exists():
            return explicit_manifest
        raise FileNotFoundError(f"Manifest not found: {explicit_manifest}")

    if NEW_MANIFEST.exists():
        return NEW_MANIFEST

    raise FileNotFoundError(
        "No macOS Aerial manifest found. Looked at:\n"
        f"  {NEW_MANIFEST}\n\n"
        "Open System Settings -> Screen Saver -> Aerial first so macOS can "
        "create the local manifest, or pass both --manifest and --output-dir."
    )


def load_manifest(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as manifest_file:
        return json.load(manifest_file)


def manifest_assets(manifest: Any) -> List[Dict[str, Any]]:
    if isinstance(manifest, list):
        return [asset for asset in manifest if isinstance(asset, dict)]

    if not isinstance(manifest, dict):
        raise ValueError("Manifest must be a JSON object or array.")

    assets = manifest.get("assets")
    if isinstance(assets, list):
        return [asset for asset in assets if isinstance(asset, dict)]
    if isinstance(assets, dict):
        return [asset for asset in assets.values() if isinstance(asset, dict)]

    raise ValueError("Manifest does not contain an assets list or object.")


def choose_url(asset: Dict[str, Any], preferred_quality: str) -> Optional[str]:
    value = asset.get(preferred_quality)
    if is_video_url(value):
        return value

    for key in FALLBACK_URL_KEYS:
        value = asset.get(key)
        if is_video_url(value):
            return value

    for key, value in asset.items():
        if key.startswith("url") and is_video_url(value):
            return value

    return None


def is_video_url(value: Any) -> bool:
    if not isinstance(value, str) or not value.startswith(("http://", "https://")):
        return False
    return Path(urlparse(value).path).suffix.lower() in {".mov", ".mp4", ".m4v"}


def filename_from_url(url: str, asset: Dict[str, Any]) -> str:
    filename = unquote(Path(urlparse(url).path).name)
    if filename:
        return filename

    fallback_name = asset.get("id") or asset.get("shotID") or "aerial-video"
    return f"{fallback_name}.mov"


def label_for_asset(asset: Dict[str, Any], fallback_filename: str) -> str:
    label = (
        asset.get("accessibilityLabel")
        or asset.get("localizedName")
        or asset.get("name")
    )
    return str(label or asset.get("shotID") or fallback_filename)


def collect_videos(manifest: Any, preferred_quality: str) -> List[AerialVideo]:
    videos: List[AerialVideo] = []
    seen_urls: Set[str] = set()

    for asset in manifest_assets(manifest):
        url = choose_url(asset, preferred_quality)
        if not url or url in seen_urls:
            continue

        filename = filename_from_url(url, asset)
        videos.append(
            AerialVideo(
                label=label_for_asset(asset, filename),
                url=url,
                filename=filename,
            )
        )
        seen_urls.add(url)

    return videos


def human_bytes(size: Optional[int]) -> str:
    if size is None:
        return "unknown"

    value = float(size)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024 or unit == "TB":
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024

    return f"{value:.1f} TB"


def request_headers(extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    headers = {
        "User-Agent": "Macify-aerial-downloader/1.0",
        "Accept": "video/*,*/*",
    }
    if extra_headers:
        headers.update(extra_headers)
    return headers


def ssl_context(insecure_ssl: bool) -> Optional[ssl.SSLContext]:
    if insecure_ssl:
        return ssl._create_unverified_context()
    return None


def fetch_remote_size(
    video: AerialVideo,
    timeout: int,
    context: Optional[ssl.SSLContext],
) -> Optional[int]:
    request = Request(video.url, method="HEAD", headers=request_headers())
    try:
        with urlopen(request, timeout=timeout, context=context) as response:
            content_length = response.headers.get("Content-Length")
            return int(content_length) if content_length else None
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        print(f"  warning: could not estimate {video.filename}: {error}", file=sys.stderr)
        return None


def existing_parent(path: Path) -> Path:
    candidate = path
    while not candidate.exists() and candidate.parent != candidate:
        candidate = candidate.parent
    return candidate


def build_download_plan(
    videos: List[AerialVideo],
    output_dir: Path,
    overwrite: bool,
    force: bool,
    timeout: int,
    context: Optional[ssl.SSLContext],
) -> List[DownloadPlan]:
    plans: List[DownloadPlan] = []
    print("Estimating remote sizes...")

    for index, video in enumerate(videos, start=1):
        destination = output_dir / video.filename
        partial = destination.with_name(destination.name + ".part")
        existing_size = destination.stat().st_size if destination.exists() else 0
        partial_size = partial.stat().st_size if partial.exists() else 0
        remote_size = fetch_remote_size(video, timeout, context)

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

        plans.append(
            DownloadPlan(
                video=video,
                destination=destination,
                remote_size=remote_size,
                existing_size=existing_size,
                partial_size=partial_size,
                action=action,
            )
        )
        print(
            f"  [{index}/{len(videos)}] {video.filename}: "
            f"{human_bytes(remote_size)}"
        )

    return plans


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
    print(f"Will download: {len(to_download)} of {len(plans)} videos")
    print(f"Already present: {len(skipped_plans)}")
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
        print(
            "Warning: some files did not return Content-Length, so the estimate "
            "may be low.",
            file=sys.stderr,
        )

    return True


def confirm_download(yes: bool) -> bool:
    if yes:
        return True
    if not sys.stdin.isatty():
        print("Error: refusing to download without confirmation. Pass --yes.", file=sys.stderr)
        return False

    answer = input("Continue downloading? [y/N] ").strip().lower()
    return answer in {"y", "yes"}


def parse_content_range_total(content_range: Optional[str]) -> Optional[int]:
    if not content_range or "/" not in content_range:
        return None

    total = content_range.rsplit("/", 1)[-1]
    if total == "*":
        return None

    try:
        return int(total)
    except ValueError:
        return None


def print_progress(downloaded: int, total: Optional[int], final: bool = False) -> None:
    if total:
        percent = min(downloaded / total * 100, 100)
        message = f"  {human_bytes(downloaded)} / {human_bytes(total)} ({percent:.1f}%)"
    else:
        message = f"  {human_bytes(downloaded)} downloaded"

    end = "\n" if final else "\r"
    print(message.ljust(80), end=end, flush=True)


def download_file(
    video: AerialVideo,
    destination: Path,
    timeout: int,
    remote_size: Optional[int],
    overwrite: bool,
    force: bool,
    context: Optional[ssl.SSLContext],
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
        print_progress(remote_size, remote_size, final=True)
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
            print_progress(remote_size, remote_size, final=True)
            return
        raise

    with response:
        status = getattr(response, "status", None)
        content_length = response.headers.get("Content-Length")
        response_size = int(content_length) if content_length else None
        range_total = parse_content_range_total(response.headers.get("Content-Range"))

        if resume_from > 0 and status == 206:
            mode = "ab"
            downloaded = resume_from
            total_size = range_total or remote_size
        else:
            if resume_from > 0 and status != 206:
                print("  server did not resume; restarting this file")
            mode = "wb"
            downloaded = 0
            total_size = remote_size or response_size

        last_progress = 0.0
        with tmp_destination.open(mode) as output:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                output.write(chunk)
                downloaded += len(chunk)
                now = time.monotonic()
                if now - last_progress >= 0.5:
                    print_progress(downloaded, total_size)
                    last_progress = now

    print_progress(downloaded, total_size, final=True)

    tmp_destination.replace(destination)


def main() -> int:
    args = parse_args()
    try:
        if args.manifest and not args.output_dir:
            raise ValueError("--output-dir is required when --manifest is set.")

        manifest_path = first_existing_manifest(args.manifest)
        output_dir = args.output_dir or NEW_VIDEO_DIR
        manifest = load_manifest(manifest_path)
        videos = collect_videos(manifest, args.quality)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    if args.limit is not None:
        videos = videos[: args.limit]

    print(f"Manifest: {manifest_path}")
    print(f"Output:   {output_dir}")
    print(f"Catalog:  {len(videos)} videos")

    if not videos:
        print("No downloadable videos found in the manifest.", file=sys.stderr)
        return 1

    context = ssl_context(args.insecure_ssl)
    plans = build_download_plan(
        videos,
        output_dir,
        args.overwrite,
        args.force,
        args.timeout,
        context,
    )
    if not summarize_plan(plans, output_dir):
        return 1

    if args.dry_run:
        for plan in plans:
            remaining = plan.remaining_size
            size_note = (
                f", remaining {human_bytes(remaining)}"
                if remaining not in (None, 0)
                else ""
            )
            if remaining is None and plan.action != "skip":
                size_note = ", remaining unknown"
            print(f"[{plan.action}] {plan.video.filename}{size_note} - {plan.video.label}")
        return 0

    if not confirm_download(args.yes):
        print("Canceled.")
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    skipped = 0
    failed = 0

    for index, plan in enumerate(plans, start=1):
        video = plan.video
        destination = plan.destination
        prefix = f"[{index}/{len(plans)}]"

        if plan.action == "skip":
            print(f"{prefix} skip {video.filename}")
            skipped += 1
            continue

        action = "resume" if plan.action == "resume" else "download"
        print(f"{prefix} {action} {video.filename} - {video.label}")
        for attempt in range(args.retries + 1):
            try:
                download_file(
                    video,
                    destination,
                    args.timeout,
                    plan.remote_size,
                    args.overwrite,
                    args.force,
                    context,
                )
                downloaded += 1
                break
            except (HTTPError, URLError, TimeoutError, OSError) as error:
                if attempt >= args.retries:
                    print(f"  failed: {error}", file=sys.stderr)
                    failed += 1
                else:
                    wait_seconds = min(2 ** attempt, 8)
                    print(f"  retrying after error: {error}")
                    time.sleep(wait_seconds)

    print(
        f"Done. Downloaded: {downloaded}. Skipped: {skipped}. Failed: {failed}."
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
