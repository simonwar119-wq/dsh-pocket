# Security

DSH Pocket is an experimental remote-control surface for a Mac. Treat every
paired device as equivalent to physical access to that Mac's keyboard, mouse,
screen, and local DSH session.

## Threat model

The bridge is intended for:

- a trusted phone on the same LAN, or
- a trusted phone reaching the Mac through a private/encrypted tunnel.

It is **not** designed to be exposed as an unauthenticated public service.

## Defaults

- The bridge binds to `0.0.0.0` on port `8797` so a phone on the LAN can reach it.
- Pairing uses a six-digit, single-use code valid for 10 minutes.
- Paired devices receive an HttpOnly, SameSite=Strict cookie. The raw device
  token is never stored on the server, only its SHA-256 hash.
- `/api/setup` is loopback-only.
- Mutating requests require `X-DSHPocket: 1` and a same-origin `Origin`.
- The `Host` header is checked against the machine's LAN/Tailscale addresses and
  an optional `DSH_POCKET_TRUSTED_HOSTS` allowlist.
- The DSH login cookie is read locally and is never sent to the phone.

## If you expose it beyond the LAN

1. Put it behind HTTPS (Tailscale Serve/Funnel, Cloudflare Tunnel, Caddy, nginx,
   etc.).
2. Add the public hostname to `DSH_POCKET_TRUSTED_HOSTS`.
3. Do not publish the pairing code or a QR code containing it.
4. Remove devices you no longer use.
5. Prefer a private tailnet over a public tunnel. A public tunnel exposes the
   pairing page to the internet, even though the API requires a paired cookie.
6. The official DSH proxy on `8798` must be protected by the same cookie. Do
   not expose it separately without authentication.

## Reporting a vulnerability

Please use GitHub's **Security → Report a vulnerability** flow for this
repository. Do not open a public issue containing a working exploit, a pairing
code, a device token, a Tailscale hostname, or a screenshot of a real machine.

## Supported versions

Only the `main` branch is supported. This is a personal-scale project, not a
hardened multi-user service.
