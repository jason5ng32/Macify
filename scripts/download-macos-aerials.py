#!/usr/bin/env python3
"""Download macOS Aerial videos listed in the local Aerial manifest.

This helper is intended for Macify users who want a complete local video
library before pointing Macify at a local HTTP server.
"""

from __future__ import annotations

import argparse
import json
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

LEGACY_MANIFEST = Path(
    "/Library/Application Support/com.apple.idleassetsd/Customer/entries.json"
)
LEGACY_VIDEO_DIR = Path(
    "/Library/Application Support/com.apple.idleassetsd/Customer/4KSDR240FPS"
)

SYSTEM_MANIFEST = Path(
    "/System/Library/PrivateFrameworks/"
    "WallpaperAerialAssets.framework/Versions/A/Resources/entries.json"
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download missing macOS Aerial videos from the local manifest."
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        help="Path to entries.json. Defaults to the current macOS user manifest, then legacy/system fallbacks.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Directory for downloaded videos. Defaults to the matching macOS Aerial videos directory.",
    )
    parser.add_argument(
        "--quality",
        default=DEFAULT_QUALITY,
        help=f"Manifest URL key to prefer. Default: {DEFAULT_QUALITY}",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Download again even when a destination file already exists.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List what would be downloaded without writing files.",
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
    return parser.parse_args()


def first_existing_manifest(explicit_manifest: Optional[Path]) -> Path:
    if explicit_manifest:
        if explicit_manifest.exists():
            return explicit_manifest
        raise FileNotFoundError(f"Manifest not found: {explicit_manifest}")

    for candidate in (NEW_MANIFEST, LEGACY_MANIFEST, SYSTEM_MANIFEST):
        if candidate.exists():
            return candidate

    looked_at = "\n  ".join(
        str(p) for p in (NEW_MANIFEST, LEGACY_MANIFEST, SYSTEM_MANIFEST)
    )
    raise FileNotFoundError(f"No macOS Aerial manifest found. Looked at:\n  {looked_at}")


def default_output_dir(manifest_path: Path) -> Path:
    manifest_text = str(manifest_path)
    if "com.apple.idleassetsd" in manifest_text:
        return LEGACY_VIDEO_DIR
    return NEW_VIDEO_DIR


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


def download_file(video: AerialVideo, destination: Path, timeout: int) -> None:
    request = Request(
        video.url,
        headers={
            "User-Agent": "Macify-aerial-downloader/1.0",
            "Accept": "video/*,*/*",
        },
    )
    tmp_destination = destination.with_name(destination.name + ".part")

    with urlopen(request, timeout=timeout) as response:
        with tmp_destination.open("wb") as output:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                output.write(chunk)

    tmp_destination.replace(destination)


def main() -> int:
    args = parse_args()
    try:
        manifest_path = first_existing_manifest(args.manifest)
        output_dir = args.output_dir or default_output_dir(manifest_path)
        manifest = load_manifest(manifest_path)
        videos = collect_videos(manifest, args.quality)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    if args.limit is not None:
        videos = videos[: args.limit]

    print(f"Manifest: {manifest_path}")
    print(f"Output:   {output_dir}")
    print(f"Videos:   {len(videos)}")

    if not videos:
        print("No downloadable videos found in the manifest.", file=sys.stderr)
        return 1

    if args.dry_run:
        for video in videos:
            destination = output_dir / video.filename
            if destination.exists() and args.overwrite:
                status = "overwrite"
            elif destination.exists():
                status = "exists"
            else:
                status = "missing"
            print(f"[{status}] {video.filename} - {video.label}")
        return 0

    output_dir.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    skipped = 0
    failed = 0

    for index, video in enumerate(videos, start=1):
        destination = output_dir / video.filename
        prefix = f"[{index}/{len(videos)}]"

        if destination.exists() and destination.stat().st_size > 0 and not args.overwrite:
            print(f"{prefix} skip {video.filename}")
            skipped += 1
            continue

        print(f"{prefix} download {video.filename} - {video.label}")
        for attempt in range(args.retries + 1):
            try:
                download_file(video, destination, args.timeout)
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
