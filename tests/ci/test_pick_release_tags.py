"""Tests for release selection used by the install/update E2E workflow."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
PICK_RELEASE_TAGS = REPO_ROOT / "scripts" / "sandbox" / "pick-release-tags.sh"


def test_picker_returns_empty_json_when_repository_has_no_release_tags(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "--quiet", str(repo)], check=True)

    result = subprocess.run(
        ["bash", str(PICK_RELEASE_TAGS), "--repo", str(repo)],
        check=True,
        capture_output=True,
        text=True,
    )

    assert json.loads(result.stdout) == []
    assert "No release tags found" in result.stderr
