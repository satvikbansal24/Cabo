// Team balancing. "Fair" means:
//  1. Team sizes differ by at most one.
//  2. Players from the same country are spread across teams as evenly as
//     possible, so no team gets a home advantage on that country's cards.
//
// The biggest country groups are placed first. Each player goes to the team
// with the fewest people from their country, with ties broken by team size.

export function balanceTeams(players, numTeams, rng = Math.random) {
  const byCountry = new Map();
  for (const p of shuffleCopy(players, rng)) {
    if (!byCountry.has(p.country)) byCountry.set(p.country, []);
    byCountry.get(p.country).push(p);
  }
  const groups = [...byCountry.values()].sort((a, b) => b.length - a.length);
  const teams = Array.from({ length: numTeams }, () => ({ ids: [], countries: {} }));
  // Rotating the starting team between groups stops team 0 always getting
  // the extra player.
  let offset = 0;
  for (const group of groups) {
    for (const p of group) {
      let best = null;
      for (let k = 0; k < numTeams; k++) {
        const t = teams[(k + offset) % numTeams];
        const score = [t.countries[p.country] || 0, t.ids.length];
        if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && score[1] < best.score[1])) {
          best = { t, score };
        }
      }
      best.t.ids.push(p.id);
      best.t.countries[p.country] = (best.t.countries[p.country] || 0) + 1;
    }
    offset++;
  }
  return teams.map((t) => t.ids);
}

// Best team for one new player without reshuffling anyone else.
export function bestTeamFor(country, teamMembers) {
  let best = 0;
  let bestScore = null;
  teamMembers.forEach((members, i) => {
    const score = [members.length, members.filter((m) => m.country === country).length];
    if (!bestScore || score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1])) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

function shuffleCopy(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
