"""Tests for the Nous-Anika-3/4 non-agentic warning detector.

Prior to this check, the warning fired on any model whose name contained
``"anika"`` anywhere (case-insensitive). That false-positived on unrelated
local Modelfiles such as ``anika-brain:qwen3-14b-ctx16k`` — a tool-capable
Qwen3 wrapper that happens to live under the "anika" tag namespace.

``is_nous_anika_non_agentic`` should only match the actual __NEW_ORG__
Anika-3 / Anika-4 chat family.
"""

from __future__ import annotations

import pytest

from anika_cli.model_switch import (
    _ANIKA_MODEL_WARNING,
    _check_anika_model_warning,
    is_nous_anika_non_agentic,
)


@pytest.mark.parametrize(
    "model_name",
    [
        "__NEW_ORG__/Anika-3-Llama-3.1-70B",
        "__NEW_ORG__/Anika-3-Llama-3.1-405B",
        "anika-3",
        "Anika-3",
        "anika-4",
        "anika-4-405b",
        "anika_4_70b",
        "openrouter/anika3:70b",
        "openrouter/__NEW_ORG__/anika-4-405b",
        "__NEW_ORG__/Anika3",
        "anika-3.1",
    ],
)
def test_matches_real_nous_anika_chat_models(model_name: str) -> None:
    assert is_nous_anika_non_agentic(model_name), (
        f"expected {model_name!r} to be flagged as __NEW_ORG__ Anika 3/4"
    )
    assert _check_anika_model_warning(model_name) == _ANIKA_MODEL_WARNING


