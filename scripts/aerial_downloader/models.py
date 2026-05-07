from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


@dataclass(frozen=True)
class AerialVideo:
    label: str
    url: str
    filename: str
    categories: List[str]


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
