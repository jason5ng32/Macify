from __future__ import annotations

import sys
from typing import Optional


TTY = sys.stdout.isatty()


def style(text: str, color: str = "", bold: bool = False, dim: bool = False) -> str:
    if not TTY:
        return text

    codes = []
    if bold:
        codes.append("1")
    if dim:
        codes.append("2")
    if color:
        codes.append(
            {
                "red": "31",
                "green": "32",
                "yellow": "33",
                "cyan": "36",
            }[color]
        )
    return f"\033[{';'.join(codes)}m{text}\033[0m" if codes else text


def icon(name: str) -> str:
    if not TTY:
        return ""
    return {
        "info": "ℹ ",
        "probe": "🔍 ",
        "prompt": "❓ ",
        "success": "✓ ",
        "warn": "⚠ ",
        "error": "✗ ",
        "download": "⬇ ",
    }.get(name, "")


def info(message: str) -> None:
    print(style(f"{icon('info')}{message}", "cyan" if TTY else "", dim=TTY))


def success(message: str) -> None:
    print(style(f"{icon('success')}{message}", "green"))


def warn(message: str) -> None:
    print(style(f"{icon('warn')}Warning: {message}", "yellow"), file=sys.stderr)


def error(message: str) -> str:
    return style(f"{icon('error')}Error: {message}", "red")


def human_bytes(size: Optional[int]) -> str:
    if size is None:
        return "unknown"

    value = float(size)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024 or unit == "TB":
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024

    return f"{value:.1f} TB"


def progress_bar(current: int, total: int, width: int = 24) -> str:
    if total <= 0:
        return "[" + "░" * width + "]"
    filled = min(width, int(width * current / total))
    return "[" + "█" * filled + "░" * (width - filled) + "]"
