from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import unquote, urlparse

from .models import AerialVideo


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


def is_video_url(value: Any) -> bool:
    if not isinstance(value, str) or not value.startswith(("http://", "https://")):
        return False
    return Path(urlparse(value).path).suffix.lower() in {".mov", ".mp4", ".m4v"}


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


def category_name_from_key(localized_name_key: Any) -> Optional[str]:
    if not isinstance(localized_name_key, str) or not localized_name_key:
        return None
    for prefix in ("AerialCategory", "AerialSubcategory"):
        if localized_name_key.startswith(prefix):
            return localized_name_key[len(prefix) :]
    return localized_name_key


def build_category_index(manifest: Any) -> Dict[str, str]:
    if not isinstance(manifest, dict):
        return {}

    category_index: Dict[str, str] = {}
    for category in manifest.get("categories", []) or []:
        if not isinstance(category, dict):
            continue

        category_id = category.get("id")
        category_name = category_name_from_key(category.get("localizedNameKey"))
        if isinstance(category_id, str) and category_name:
            category_index[category_id] = category_name

        for subcategory in category.get("subcategories", []) or []:
            if not isinstance(subcategory, dict):
                continue
            subcategory_id = subcategory.get("id")
            if isinstance(subcategory_id, str) and category_name:
                category_index[subcategory_id] = category_name

    return category_index


def filename_from_url(url: str, asset: Dict[str, Any]) -> str:
    asset_id = asset.get("id")
    if isinstance(asset_id, str) and asset_id:
        return f"{asset_id}.mov"

    filename = unquote(Path(urlparse(url).path).name)
    if filename:
        return filename

    fallback_name = asset.get("shotID") or "aerial-video"
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
    category_index = build_category_index(manifest)

    for asset in manifest_assets(manifest):
        url = choose_url(asset, preferred_quality)
        if not url or url in seen_urls:
            continue

        filename = filename_from_url(url, asset)
        categories = sorted(
            {
                category_index[category_id]
                for category_id in asset.get("categories", []) or []
                if category_id in category_index
            }
        )
        videos.append(
            AerialVideo(
                label=label_for_asset(asset, filename),
                url=url,
                filename=filename,
                categories=categories,
            )
        )
        seen_urls.add(url)

    return videos


def category_counts(videos: List[AerialVideo]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for video in videos:
        for category in video.categories or ["Uncategorized"]:
            counts[category] = counts.get(category, 0) + 1
    return dict(sorted(counts.items()))


def category_items(videos: List[AerialVideo]) -> List[Tuple[str, int]]:
    return list(category_counts(videos).items())


def print_categories(videos: List[AerialVideo]) -> None:
    items = category_items(videos)
    if not items:
        print("No categories found in the manifest.")
        return

    print("Available categories:")
    for category, count in items:
        print(f"  - {category}: {count}")


def print_numbered_categories(videos: List[AerialVideo]) -> List[Tuple[str, int]]:
    items = category_items(videos)
    if not items:
        print("No categories found in the manifest.")
        return []

    print("Available categories:")
    for index, (category, count) in enumerate(items, start=1):
        print(f"  {index}) {category:<16} ({count} videos)")
    return items


def parse_category_filter(category_arg: Optional[str]) -> Set[str]:
    if not category_arg:
        return set()
    return {
        category.strip().lower()
        for category in category_arg.split(",")
        if category.strip()
    }


def filter_by_category(
    videos: List[AerialVideo],
    category_arg: Optional[str],
) -> List[AerialVideo]:
    requested = parse_category_filter(category_arg)
    if not requested:
        return videos

    available = {category.lower() for category in category_counts(videos)}
    unknown = sorted(requested - available)
    if unknown:
        available_text = ", ".join(category for category, _ in category_items(videos))
        raise ValueError(
            "Unknown category: "
            f"{', '.join(unknown)}. Available categories: {available_text}"
        )

    return [
        video
        for video in videos
        if requested.intersection(category.lower() for category in video.categories)
    ]


def select_categories_by_numbers(
    videos: List[AerialVideo],
    selection: str,
    items: List[Tuple[str, int]],
) -> List[AerialVideo]:
    if not selection.strip():
        raise ValueError("No categories selected.")

    selected_indexes: Set[int] = set()
    invalid_tokens: List[str] = []
    for token in selection.split(","):
        token = token.strip()
        if not token:
            invalid_tokens.append(token)
            continue
        try:
            index = int(token)
        except ValueError:
            invalid_tokens.append(token)
            continue
        if index < 1 or index > len(items):
            invalid_tokens.append(token)
            continue
        selected_indexes.add(index)

    if invalid_tokens:
        raise ValueError(
            "Invalid category selection: "
            f"{', '.join(token or '<empty>' for token in invalid_tokens)}."
        )

    selected_names = {items[index - 1][0].lower() for index in selected_indexes}
    return [
        video
        for video in videos
        if selected_names.intersection(category.lower() for category in video.categories)
    ]


def select_random(videos: List[AerialVideo], count: Optional[int]) -> List[AerialVideo]:
    if count is None:
        return videos
    if count < 1:
        raise ValueError("--random must be greater than 0.")
    if count >= len(videos):
        return videos
    return random.sample(videos, count)


def apply_limit(videos: List[AerialVideo], limit: Optional[int]) -> List[AerialVideo]:
    if limit is None:
        return videos
    if limit < 1:
        raise ValueError("--limit must be greater than 0.")
    return videos[:limit]


def matching_local_count(videos: List[AerialVideo], output_dir: Path) -> int:
    return sum(1 for video in videos if (output_dir / video.filename).exists())
