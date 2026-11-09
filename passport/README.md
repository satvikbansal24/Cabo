# Passport

A team clue-giving party game for groups from different countries. Each player says where they're from, and the room's deck mixes global cards with country-specific ones, weighted by who's playing. Teams are balanced automatically so each country is spread evenly across them.

This is a standalone app. It shares no code with the Cabo app elsewhere in this repo, and everything lives in this folder.

## How a game works

- **Host screen (TV/laptop):** tap **Host on this screen**. It shows the room code and a QR code, the teams, settings, live timer and scores. It **never shows card text**, so it's safe on a big screen. The host also plays, on their own phone.
- **Phones:** everyone joins with the room code, a name and their country. No accounts.
- **Teams:** new players go to the smallest team. **Auto-balance** evens out team sizes and spreads each country across the teams. The host can move or remove players and rename teams.
- **Turns:** each round, every team gets one 60-second turn. The clue giver rotates within the team. A **checker** from the team that played just before sees the same card and taps **Got it** or **Skip**. Only the giver and the checker see the card.
- **Clue rules:** talk only. No saying the word, any part of it, a translation or a synonym. Breaking a rule counts as a skip.
- **Scoring:** +1 per guessed card. The first skip each turn is free; each skip after that is −1. A card still on screen when time runs out scores 0, unless the checker marks it guessed in the end-of-turn review.
- **End:** after the number of rounds the host set. Cards never repeat within a room, even across games.

If the clue giver is missing, the host can skip their turn. If the checker drops out, the host can hand the job to anyone not on the guessing team.

## Running locally

```bash
cd passport
npm install
npm run dev          # server on :3002, client on :5174
```

Open http://localhost:5174 on the host screen. To join from phones on the same Wi-Fi, use the computer's LAN IP, e.g. `http://192.168.1.20:5174` (run `npx vite --host` for the client).

Production-style single process:

```bash
npm run build && npm start   # everything on :3002 (or $PORT)
```

### Tests

```bash
npm test             # rules, scoring, deck mixing, team balancing (no server)
npm start &          # then:
npm run smoke-test   # host + 4 phones over real sockets
```

Set `TURN_SECONDS=5` when starting the server to try turns quickly.

## Deploying

It's one Node process (API, Socket.IO and the built client on one port). On Render: **New → Web Service**, choose this repo, set **Root Directory** to `passport`, **Build** to `npm install && npm run build`, and **Start** to `npm start`.

Rooms are kept in memory, so restarting the server ends games in progress.

## Card bank

Cards live in `server/cards.js`: one `GLOBAL` list and one pack per country (16 so far). To add a country, add it to `COUNTRIES` and give it a pack in `PACKS`. Players from countries without a pack pick "Somewhere else" and get more global cards.

The mix is set in `server/deck.js`: 35% of the deck is always global, and the remaining 65% is split between the players' countries in proportion to how many players come from each.

## Code map

| Path | What |
| --- | --- |
| `server/game.js` | Room state machine: lobby → ready → active → review → … → over. Also builds each player's view of the room (card text only goes to the giver and checker). |
| `server/deck.js` | Weighted deck building |
| `server/teams.js` | Team balancing |
| `server/index.js` | Express + Socket.IO, room registry, turn timer |
| `client/src/components/Dashboard.jsx` | Host/TV screen |
| `client/src/components/PlayerGame.jsx` | Phone screen during a turn (giver, checker, guesser, watcher) |
| `client/src/brand.js` | Game name, in one place for easy renaming |
