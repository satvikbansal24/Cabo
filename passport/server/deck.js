import { COUNTRIES, GLOBAL, PACKS } from './cards.js';

// Share of the deck that is always global, no matter who is playing. The rest
// is split between country packs in proportion to how many players are from
// each country (players from countries without a pack add to the global
// share instead).
export const BASE_GLOBAL_SHARE = 0.35;

export function deckMix(countries) {
  const total = countries.length;
  if (total === 0) return [{ source: 'global', share: 1 }];
  const counts = {};
  let unsupported = 0;
  for (const c of countries) {
    if (PACKS[c]) counts[c] = (counts[c] || 0) + 1;
    else unsupported++;
  }
  const countryShare = 1 - BASE_GLOBAL_SHARE;
  const mix = [
    { source: 'global', share: BASE_GLOBAL_SHARE + countryShare * (unsupported / total) },
  ];
  for (const [c, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    mix.push({ source: c, share: countryShare * (n / total) });
  }
  return mix;
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Builds a deck in draw order (draw with pop()). Every draw picks a source
// at random by its share, so the order follows the mix the whole way through,
// not just overall. A source that runs out drops out and the others fill in.
// Cards in `exclude` (already played in this room) are left out.
export function buildDeck(countries, { exclude = new Set(), rng = Math.random } = {}) {
  const mix = deckMix(countries);
  const sources = mix
    .map(({ source, share }) => {
      const cards = (source === 'global' ? GLOBAL : PACKS[source]).filter((t) => !exclude.has(t));
      return {
        weight: share,
        cards: shuffle(cards.map((text) => ({ text, origin: source })), rng),
      };
    })
    .filter((s) => s.cards.length > 0);

  const deck = [];
  const seen = new Set();
  while (sources.length) {
    const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0);
    let r = rng() * totalWeight;
    let idx = 0;
    while (idx < sources.length - 1 && r >= sources[idx].weight) {
      r -= sources[idx].weight;
      idx++;
    }
    const card = sources[idx].cards.pop();
    if (!sources[idx].cards.length) sources.splice(idx, 1);
    // The same text can appear in more than one pack; keep the first.
    if (seen.has(card.text)) continue;
    seen.add(card.text);
    deck.push(card);
  }
  return deck.reverse();
}

export function originLabel(origin) {
  return origin === 'global' ? 'Global' : COUNTRIES[origin]?.name || origin;
}
