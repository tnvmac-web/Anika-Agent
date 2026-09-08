# Optional Skills

Official skills maintained by __NEW_ORG__ that are **not activated by default**.

These skills ship with the anika-agent repository but are not copied to
`~/.anika/skills/` during setup. They are discoverable via the Skills Hub:

```bash
anika skills browse               # browse all skills, official shown first
anika skills browse --source official  # browse only official optional skills
anika skills search <query>       # finds optional skills labeled "official"
anika skills install <identifier> # copies to ~/.anika/skills/ and activates
```

## Why optional?

Some skills are useful but not broadly needed by every user:

- **Niche integrations** — specific paid services, specialized tools
- **Experimental features** — promising but not yet proven
- **Heavyweight dependencies** — require significant setup (API keys, installs)

By keeping them optional, we keep the default skill set lean while still
providing curated, tested, official skills for users who want them.
