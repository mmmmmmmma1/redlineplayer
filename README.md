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

`BODY_SIZE_LIMIT` must allow 200 MB video uploads. Put it behind HTTPS so login cookies are secure.

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
