from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import List

from .downloader import MAX_DOWNLOAD_WORKERS, run_downloads
from .manifest import (
    DEFAULT_QUALITY,
    NEW_VIDEO_DIR,
    apply_limit,
    collect_videos,
    filter_by_category,
    first_existing_manifest,
    load_manifest,
    matching_local_count,
    print_categories,
    print_numbered_categories,
    select_categories_by_numbers,
    select_random,
)
from .models import AerialVideo, DownloadPlan
from .network import ssl_context
from .planner import build_download_plan, summarize_plan
from .terminal import error, human_bytes, icon, info, style


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
        "--random",
        type=int,
        help="Select this many random videos from the chosen scope.",
    )
    parser.add_argument(
        "--parallel",
        type=int,
        default=3,
        help=f"Concurrent downloads. Default: 3, max: {MAX_DOWNLOAD_WORKERS}.",
    )
    parser.add_argument(
        "--category",
        help="Comma-separated category names to include, for example: Landscapes,Cities.",
    )
    parser.add_argument(
        "--list-categories",
        action="store_true",
        help="List available categories from the manifest and exit.",
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


def choose_interactive_scope(
    videos: List[AerialVideo],
    output_dir: Path,
) -> List[AerialVideo]:
    print("What would you like to do?")
    print("  1) Download the full catalog")
    print("  2) Download a random N videos")
    print("  3) Download by category")
    choice = input("Choose 1, 2, or 3 [1]: ").strip() or "1"

    if choice == "1":
        selected = videos
    elif choice == "2":
        count_text = input("How many random videos? ").strip()
        try:
            count = int(count_text)
        except ValueError as err:
            raise ValueError("Random video count must be a number.") from err
        selected = select_random(videos, count)
    elif choice == "3":
        items = print_numbered_categories(videos)
        category_arg = input(
            f"{style(icon('prompt') + 'Choose categories', 'yellow', bold=True)} "
            "(comma-separated numbers, e.g. 1,3): "
        ).strip()
        selected = select_categories_by_numbers(videos, category_arg, items)
    else:
        raise ValueError("Invalid choice.")

    print("")
    info(f"Selected scope: {len(selected)} videos")
    info(f"Local matching files: {matching_local_count(selected, output_dir)}")
    return selected


def confirm_download(yes: bool) -> bool:
    if yes:
        return True
    if not sys.stdin.isatty():
        print("Error: refusing to download without confirmation. Pass --yes.", file=sys.stderr)
        return False

    answer = input(
        f"{style(icon('prompt') + 'Continue downloading?', 'yellow', bold=True)} [y/N] "
    ).strip().lower()
    return answer in {"y", "yes"}


def print_dry_run(plans: List[DownloadPlan]) -> None:
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


def main() -> int:
    args = parse_args()
    interactive_scope = len(sys.argv) == 1
    try:
        if args.manifest and not args.output_dir and not args.list_categories:
            raise ValueError("--output-dir is required when --manifest is set.")
        if args.parallel < 1:
            raise ValueError("--parallel must be greater than 0.")

        manifest_path = first_existing_manifest(args.manifest)
        output_dir = args.output_dir or NEW_VIDEO_DIR
        manifest = load_manifest(manifest_path)
        videos = collect_videos(manifest, args.quality)
        if args.list_categories:
            print_categories(videos)
            return 0
        if interactive_scope:
            if not sys.stdin.isatty():
                raise ValueError(
                    "Pass --dry-run, --yes, or another flag when running non-interactively."
                )
            videos = choose_interactive_scope(videos, output_dir)
        else:
            videos = filter_by_category(videos, args.category)
            videos = select_random(videos, args.random)
            videos = apply_limit(videos, args.limit)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as err:
        print(error(str(err)), file=sys.stderr)
        return 1

    info(f"Manifest: {manifest_path}")
    info(f"Output:   {output_dir}")
    info(f"Catalog:  {len(videos)} videos")

    if not videos:
        print(error("No downloadable videos found in the selected scope."), file=sys.stderr)
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
        print_dry_run(plans)
        return 0

    if not confirm_download(args.yes):
        print("Canceled.")
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)
    downloaded, skipped, failed = run_downloads(
        plans,
        args.retries,
        args.timeout,
        args.overwrite,
        args.force,
        args.parallel,
        context,
    )

    print(
        f"Done. Downloaded: {downloaded}. Skipped: {skipped}. Failed: {failed}."
    )
    return 1 if failed else 0
