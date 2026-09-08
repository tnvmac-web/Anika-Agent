"""Resolve ANIKA_HOME for standalone skill scripts.

Skill scripts may run outside the Anika process (e.g. system Python,
nix env, CI) where ``anika_constants`` is not importable.  This module
provides the same ``get_anika_home()`` and ``display_anika_home()``
contracts as ``anika_constants`` without requiring it on ``sys.path``.

When ``anika_constants`` IS available it is used directly so that any
future enhancements (profile resolution, Docker detection, etc.) are
picked up automatically.  The fallback path replicates the core logic
from ``anika_constants.py`` using only the stdlib.

All scripts under ``google-workspace/scripts/`` should import from here
instead of duplicating the ``ANIKA_HOME = Path(os.getenv(...))`` pattern.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from anika_constants import display_anika_home as display_anika_home
    from anika_constants import get_anika_home as get_anika_home
except (ModuleNotFoundError, ImportError):

    def get_anika_home() -> Path:
        """Return the Anika home directory (default: ~/.anika).

        Mirrors ``anika_constants.get_anika_home()``."""
        val = os.environ.get("ANIKA_HOME", "").strip()
        return Path(val) if val else Path.home() / ".anika"

    def display_anika_home() -> str:
        """Return a user-friendly ``~/``-shortened display string.

        Mirrors ``anika_constants.display_anika_home()``."""
        home = get_anika_home()
        try:
            return "~/" + home.relative_to(Path.home()).as_posix()
        except ValueError:
            return str(home)
