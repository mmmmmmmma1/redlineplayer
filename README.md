# Edgework

Edgework by Andrew (obaba-samich) & Myles.

A web app for hockey players and track athletes: workouts, an exercise library, and how-to
videos for each exercise. Staff approve every account and every video shared with the team.

It started as two apps: Andrew's Edgework for iOS and Myles's Redline Player. The original
Redline Player page is kept in [`legacy/redline-player.html`](legacy/redline-player.html).

## Run it

Needs Node 22 and ffmpeg.

```bash
npm install
npm run dev
```

Data (the database and videos) goes in `./data`, or in the folder named by `DATA_DIR`.

## Run it on a server

```bash
npm ci && npm run build
npm run create-admin -- --username YourName   # type the password, then Enter
ORIGIN=https://your.site BODY_SIZE_LIMIT=210M node build
```

- `BODY_SIZE_LIMIT` must allow 200 MB video uploads. Every other route refuses bodies over 64 KB,
  so the big limit only matters for uploads.
- Put it behind HTTPS so login cookies are secure, and turn on HSTS at the proxy.
- **Behind a proxy (nginx, Caddy):** tell the app which header has the real visitor IP, or every
  login looks like it comes from the proxy and one person's typos can lock out the whole team:
  `ADDRESS_HEADER=X-Forwarded-For XFF_DEPTH=1` (1 = one proxy in front). Make sure the proxy
  overwrites that header, so visitors can't fake it.
- Failed logins are limited to 5 a minute per username and 20 an hour per address
  (`LOGIN_IP_LIMIT_PER_HOUR`). Raise the hourly one if the whole team shares one network.

## Tests

```bash
npm run check      # type check
npm test           # unit tests
npm run test:e2e   # browser tests
```

GitHub Actions runs all three on every push and pull request.

## Design

- [Design](docs/superpowers/specs/2026-11-25-edgework-web-design.md)
- [Foundation plan](docs/superpowers/plans/2026-11-25-edgework-web-foundation.md)

## License

MIT. See [LICENSE](LICENSE).
