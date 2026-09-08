# Anika CLI Reference

Live sources when anything looks stale: `anika --help`, `anika <command> --help`,
https://anika-agent.__NEW_DOMAIN__/docs/reference/cli-commands

### Global Flags

```
anika [flags] [command]        (no subcommand = interactive chat)

  --version, -V             Show version
  -z, --oneshot PROMPT      One-shot: print ONLY the final response (for scripts/pipes)
  -m MODEL  --provider P    Model/provider override for this invocation
  -t, --toolsets LIST       Comma-separated toolsets for this invocation
  --resume, -r SESSION      Resume session by ID or title
  --continue, -c [NAME]     Resume by name, or most recent session
  --worktree, -w            Isolated git worktree mode (parallel agents)
  --skills, -s SKILL        Preload skills (comma-separate or repeat)
  --profile, -p NAME        Use a named profile
  --yolo                    Skip dangerous command approval
  --tui / --cli             Force the Ink TUI / classic REPL
  --ignore-rules            Skip AGENTS.md/SOUL.md/memory/skill injection
  --safe-mode               Disable ALL customizations (troubleshooting)
  --pass-session-id         Include session ID in system prompt
```

### Chat

```
anika chat [flags]
  -q, --query TEXT          Single query, non-interactive
  --image PATH              Attach a local image to a single query
  -Q, --quiet               Suppress banner, spinner, tool previews
  --checkpoints             Enable filesystem checkpoints (/rollback)
  --max-turns N             Cap tool-calling iterations
  --source TAG              Session source tag (default: cli)
```
(plus the global flags above)

### Configuration

```
anika setup [section]      Wizard (model|tts|terminal|gateway|tools|agent)
anika model                Interactive model/provider picker
anika fallback [add|remove|list]  Fallback provider chain
anika config [show|edit|get|set|unset|path|env-path|check|migrate]
anika login / logout       OAuth sign-in / clear stored auth
anika doctor [--fix]       Check dependencies and config
anika status [--all]       Component status
```

### Tools & Skills

```
anika tools [list|enable NAME|disable NAME]   Per-platform toolsets (curses UI with no args)

anika skills list|browse|search QUERY|inspect ID
anika skills install ID    Hub identifier OR a direct https://…/SKILL.md URL
anika skills config        Enable/disable skills per platform
anika skills check|update|uninstall|publish PATH
anika skills tap add REPO  Add a GitHub repo as a skill source
anika bundles              Skill bundles (one /<name> alias loads several skills)
```

### MCP Servers

```
anika mcp add NAME (--url or --command) | remove | list | test NAME
anika mcp catalog | install NAME     Curated catalog install
anika mcp configure NAME             Toggle tool selection
anika mcp serve                      Run Anika as an MCP server
```
Details (transport, tool discovery, catalog): `references/native-mcp.md`.

### Gateway (Messaging Platforms)

```
anika gateway run|install|start|stop|restart|status|setup
```

20+ platforms: Telegram, Discord, Slack, WhatsApp (Baileys + Business Cloud API), iMessage (Photon — `anika photon setup`), Signal, Email, SMS, Matrix, Mattermost, Teams, LINE, SimpleX, ntfy, Google Chat, Home Assistant, DingTalk, Feishu, WeCom, Weixin, API Server, Webhooks. Open WebUI connects via the API Server adapter. Most adapters ship under `plugins/platforms/`.
Docs: https://anika-agent.__NEW_DOMAIN__/docs/user-guide/messaging/

### Sessions

```
anika sessions list|browse|rename ID TITLE|delete ID|export OUT|prune|stats
```

### Cron / Webhooks

```
anika cron list|create SCHED|edit ID|pause|resume|run ID|remove|status
    Schedules: '30m', 'every 2h', '0 9 * * *', ISO timestamp
anika webhook subscribe NAME|list|remove NAME|test NAME
```
Webhook payloads/routes: `references/webhooks.md`.

### Profiles

```
anika profile list|create NAME (--clone|--clone-all|--clone-from)|use|show|delete
anika profile rename A B | alias NAME | export NAME | import FILE
```

### Credentials & Pools

```
anika auth                 Interactive credential manager
anika auth add [PROVIDER]  Add OAuth or API-key credential (nous, openai-codex, qwen-oauth, …)
anika auth list|remove P IDX|reset PROVIDER|status
```
Multiple credentials per provider form a pool that rotates automatically and skips exhausted keys.

### Other

```
anika desktop / gui        Native desktop app
anika dashboard            Web admin panel + embedded chat (--stop / --status)
anika proxy                OpenAI-compatible local proxy backed by an OAuth provider
anika portal               Quick setup / sign in via __NEW_ORG__ Portal
anika kanban <verb>        Multi-agent work-queue board
anika project              Named multi-folder workspaces
anika skin list|use|set    Switch/tweak skins (see references/themes.md)
anika pets <verb>          Pet mascots (see references/petdex.md)
anika memory setup|status|off|reset   Memory provider
anika secrets bitwarden|onepassword   External secret stores
anika moa                  Mixture-of-Agents slots
anika hooks / security / backup / import / checkpoints / console
anika logs [-f] [errors]   View agent/error logs
anika send                 One-off message through a gateway platform
anika pairing / plugins / insights / journey / computer-use
anika acp                  ACP server (IDE integration)
anika completion bash|zsh|fish
anika update / uninstall / claw migrate
```

Plugin- and provider-supplied subcommands (e.g. `anika photon setup`) only appear once their plugin is installed/active.

### Where to Find Things

| Looking for... | Location |
|---|---|
| Config options | `anika config edit` · [Configuration docs](https://anika-agent.__NEW_DOMAIN__/docs/user-guide/configuration) |
| Tools / toolsets | `anika tools list` · [Tools reference](https://anika-agent.__NEW_DOMAIN__/docs/reference/tools-reference) |
| Skills catalog | `anika skills browse` · [Skills catalog](https://anika-agent.__NEW_DOMAIN__/docs/reference/skills-catalog) |
| Provider setup | `anika model` · [Providers guide](https://anika-agent.__NEW_DOMAIN__/docs/integrations/providers) |
| Env variables | `anika config env-path` · [Env vars reference](https://anika-agent.__NEW_DOMAIN__/docs/reference/environment-variables) |
| Gateway logs | `~/.anika/logs/gateway.log` (or `anika logs`) |
| Sessions | `anika sessions browse` (reads state.db) |
