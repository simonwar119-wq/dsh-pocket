# Contributing

Thanks for taking a look. This is a small, macOS-first project.

## Development

Requirements: macOS, Node.js 22+, Xcode Command Line Tools (the native input
helper is compiled on first use).

```bash
node --check server/index.mjs
node --check server/dsh.mjs
node --check server/sessions.mjs
node --check server/proxy.mjs
node --check server/system.mjs
node --check web/app.js
node --check web/setup.js
node server/index.mjs --no-open
```

There is no `npm install` step; runtime dependencies are Node built-ins plus the
vendored `ws` client.

## Pull requests

- Keep changes small and describe the user-visible behavior.
- Do not commit `.pocket/`, pairing codes, device tokens, logs, screenshots with
  real hostnames, or generated binaries.
- Test on macOS if you touch `server/system.mjs` or `native/input.swift`.
- Security-sensitive changes should explain the threat model and the new
  default behavior.

## Code of conduct

Be direct, be kind, and do not use the project to access a machine you do not
own or have permission to control.
