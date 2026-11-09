import React, { useEffect } from 'react';

export default function Rules({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal-close" aria-label="Close" onClick={onClose}>✕</button>
        <h2 id="rules-title">How to play</h2>

        <h3>Setup</h3>
        <ol>
          <li>The host opens the game on a TV or laptop everyone can see and taps <em>Host on this screen</em>. That screen is the scoreboard and control panel, and it never shows the cards.</li>
          <li>Everyone (host included) joins on their own phone with the room code, their name and where they’re from.</li>
          <li>The deck mixes global cards with cards from each player’s country, weighted by how many people are from where.</li>
          <li>Teams are balanced automatically so each country is spread across the teams. The host can move people around.</li>
        </ol>

        <h3>A turn</h3>
        <ol>
          <li>Each turn, one player from the team that’s up gives clues. This rotates so everyone gets a go.</li>
          <li>A player from the team that played just before is the <strong>checker</strong>. Only the clue giver and the checker can see the card.</li>
          <li>The clue giver has <strong>60 seconds</strong> to describe as many cards as their team can guess.</li>
          <li>The checker taps <strong>Got it</strong> or <strong>Skip</strong> for each card, and the next card appears.</li>
          <li>When time runs out, the checker can fix any mistakes and then confirms the score.</li>
        </ol>

        <h3>Clue rules</h3>
        <ul>
          <li>Talk only: no acting, gestures or pointing.</li>
          <li>Don’t say the word, any part of it, a translation of it or a synonym.</li>
          <li>Breaking a rule counts as a skip.</li>
        </ul>

        <h3>Scoring</h3>
        <ul>
          <li><strong>+1</strong> for each card guessed.</li>
          <li>The <strong>first skip</strong> in a turn is free; each skip after that is <strong>−1</strong>.</li>
          <li>Cards are never reused. The game ends after the number of rounds the host set (each team plays once per round). Highest score wins.</li>
        </ul>
      </div>
    </div>
  );
}
