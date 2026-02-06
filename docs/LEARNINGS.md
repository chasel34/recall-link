# Learnings

- 2026-01-31: Keep fetch extraction behind `@recall-link/jobs-handlers` via `handleFetch` wrapping `fetchAndExtract`.

- 2026-02-05: Migrated from browser-side AI inference to server-side "User Mode". This ensures consistent output constraints and better security for user API keys (encrypted at rest vs localStorage).
