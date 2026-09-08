"""Shared platform registry for Anika Agent."""

from collections import OrderedDict
from typing import NamedTuple


class PlatformInfo(NamedTuple):
    """Metadata for a single platform entry."""
    label: str
    default_toolset: str


# Ordered so that TUI menus are deterministic.
PLATFORMS: OrderedDict[str, PlatformInfo] = OrderedDict([
    ("cli",            PlatformInfo(label="🖥️  CLI",            default_toolset="anika-cli")),
    ("telegram",       PlatformInfo(label="📱 Telegram",        default_toolset="anika-telegram")),
    ("discord",        PlatformInfo(label="💬 Discord",         default_toolset="anika-discord")),
    ("slack",          PlatformInfo(label="💼 Slack",           default_toolset="anika-slack")),
    ("whatsapp",       PlatformInfo(label="📱 WhatsApp",        default_toolset="anika-whatsapp")),
    ("whatsapp_cloud", PlatformInfo(label="📱 WhatsApp Business (Cloud)", default_toolset="anika-whatsapp")),
    ("signal",         PlatformInfo(label="📡 Signal",          default_toolset="anika-signal")),
    ("bluebubbles",    PlatformInfo(label="💙 BlueBubbles",     default_toolset="anika-bluebubbles")),
    ("email",          PlatformInfo(label="📧 Email",           default_toolset="anika-email")),
    ("homeassistant",  PlatformInfo(label="🏠 Home Assistant",  default_toolset="anika-homeassistant")),
    ("mattermost",     PlatformInfo(label="💬 Mattermost",      default_toolset="anika-mattermost")),
    ("matrix",         PlatformInfo(label="💬 Matrix",          default_toolset="anika-matrix")),
    ("dingtalk",       PlatformInfo(label="💬 DingTalk",        default_toolset="anika-dingtalk")),
    ("feishu",         PlatformInfo(label="🪽 Feishu",          default_toolset="anika-feishu")),
    ("wecom",          PlatformInfo(label="💬 WeCom",           default_toolset="anika-wecom")),
    ("wecom_callback", PlatformInfo(label="💬 WeCom Callback",  default_toolset="anika-wecom-callback")),
    ("weixin",         PlatformInfo(label="💬 Weixin",          default_toolset="anika-weixin")),
    ("qqbot",          PlatformInfo(label="💬 QQBot",           default_toolset="anika-qqbot")),
    ("yuanbao",        PlatformInfo(label="🤖 Yuanbao",         default_toolset="anika-yuanbao")),
    ("webhook",        PlatformInfo(label="🔗 Webhook",         default_toolset="anika-webhook")),
    ("api_server",     PlatformInfo(label="🌐 API Server",      default_toolset="anika-api-server")),
    ("cron",           PlatformInfo(label="⏰ Cron",            default_toolset="anika-cron")),
])


def _plugin_label(entry) -> str:
    return f"{entry.emoji}  {entry.label}" if entry.emoji else entry.label


def platform_label(key: str, default: str = "") -> str:
    """Return the display label for a platform key (builtin, then plugin registry), or *default*."""
    info = PLATFORMS.get(key)
    if info is not None:
        return info.label
    try:
        from gateway.platform_registry import platform_registry
        entry = platform_registry.get(key)
        if entry:
            return _plugin_label(entry)
    except Exception:
        pass
    return default


def get_all_platforms() -> "OrderedDict[str, PlatformInfo]":
    """PLATFORMS plus plugin-registered platforms (appended after builtins) — use for menus."""
    merged = OrderedDict(PLATFORMS)
    try:
        from gateway.platform_registry import platform_registry
        for entry in platform_registry.plugin_entries():
            if entry.name not in merged:
                merged[entry.name] = PlatformInfo(_plugin_label(entry), f"anika-{entry.name}")
    except Exception:
        pass
    return merged
