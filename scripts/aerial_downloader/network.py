from __future__ import annotations

import ssl
from typing import Dict, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .models import AerialVideo


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
) -> Tuple[Optional[int], Optional[str]]:
    request = Request(video.url, method="HEAD", headers=request_headers())
    try:
        with urlopen(request, timeout=timeout, context=context) as response:
            content_length = response.headers.get("Content-Length")
            return int(content_length) if content_length else None, None
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        return None, f"could not estimate {video.filename}: {error}"

