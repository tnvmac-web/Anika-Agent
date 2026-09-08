"""Resolve ANIKA_HOME for standalone skill scripts.

Skill scripts may run outside the Anika process (system Python, nix env,
CI) where ``anika_constants`` is not importable.  This module provides the
same ``get_anika_home()`` contract without requiring it on ``sys.path``.

When ``anika_constants`` IS available it is used directly so profile
resolution and any future enhancements are picked up automatically.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from anika_constants import get_anika_home as get_anika_home
except (ModuleNotFoundError, ImportError):

    def get_anika_home() -> Path:
        """Return the Anika home directory (default: ``~/.anika``)."""
        val = os.environ.get("ANIKA_HOME", "").strip()
        return Path(val) if val else Path.home() / ".anika"
