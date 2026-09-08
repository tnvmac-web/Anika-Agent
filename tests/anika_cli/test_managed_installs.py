from types import SimpleNamespace
from unittest.mock import patch

from anika_cli.config import recommended_update_command
from anika_cli.main import cmd_update
from tools.skills_hub_official import OptionalSkillSource


def test_recommended_update_command_defaults_to_anika_update(monkeypatch):
    monkeypatch.delenv("ANIKA_MANAGED", raising=False)

    # Also short-circuit the .managed marker path — CI runners may have an
    # ambient ~/.anika/.managed if a prior test left ANIKA_HOME pointing
    # somewhere with that marker, which would make get_managed_update_command()
    # return "Update your Nix flake input ..." instead of falling through to
    # detect_install_method().
    with patch("anika_cli.config.get_managed_update_command", return_value=None), \
         patch("anika_cli.config.detect_install_method", return_value="git"):
        assert recommended_update_command() == "anika update"


def test_optional_skill_source_honors_env_override(monkeypatch, tmp_path):
    optional_dir = tmp_path / "optional-skills"
    optional_dir.mkdir()
    monkeypatch.setenv("ANIKA_OPTIONAL_SKILLS", str(optional_dir))

    source = OptionalSkillSource()

    assert source._optional_dir == optional_dir
