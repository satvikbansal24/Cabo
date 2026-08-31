import React from 'react';

export default function RulesContent() {
  return (
    <div className="rules-content">
      <h2>Cabo 101</h2>
      <p className="rules-objective">
        <strong>Objective:</strong> end the game with the <strong>lowest total</strong> by strategically managing your cards.
      </p>

      <h3>Card values</h3>
      <table className="rules-values">
        <tbody>
          <tr>
            <td>Joker</td><td>-1</td>
            <td>King</td><td>0</td>
            <td>Ace</td><td>1</td>
          </tr>
          <tr>
            <td>2 – 10</td><td>face value</td>
            <td>Jack</td><td>11</td>
            <td>Queen</td><td>12</td>
          </tr>
        </tbody>
      </table>
      <p className="hint">Suit/color doesn't matter. The deck is a standard 52 cards plus both Jokers.</p>

      <h3>Setup</h3>
      <ul>
        <li>Each player gets four face-down cards in a 2×2 grid.</li>
        <li>You may look at only your <strong>bottom two</strong> cards once, then memorize and forget them at your own risk — you can't look again.</li>
        <li>Card positions never move. If you replace a card, the new one goes exactly where the old one was.</li>
      </ul>

      <h3>Your turn</h3>
      <ol>
        <li>
          <strong>Draw</strong> — from the face-down pile, or from the top of the discard pile (only allowed if the last played card wasn't matched).
        </li>
        <li>
          <strong>Play</strong> — either play the card you just drew face-up (only if it came from the face-down pile), or keep it and slot it into one of your own positions, sending the card that was there to the discard pile instead — without looking at it first.
        </li>
        <li>
          <strong>End your turn</strong> — end normally, or call <strong>Cabo</strong> if you think you have the lowest hand.
        </li>
      </ol>

      <h3>Matching</h3>
      <p>
        The instant any card is played, <strong>everyone</strong> (including whoever just played it) can race to match it —
        whoever claims it first wins the window; being a beat too slow means you keep your card.
      </p>
      <ul>
        <li>
          <strong>Match your own card</strong>: if you think one of your own cards shares the played card's rank, discard it — you now have one fewer card.
        </li>
        <li>
          <strong>Match someone else's card</strong>: same idea, but before they can react — you give them one of your own cards blindly in return.
        </li>
        <li>Guess wrong either way and you draw a penalty card from the face-down pile, unseen.</li>
      </ul>

      <h3>Powers</h3>
      <p>Only triggered by drawing a power card from the face-down pile <em>and choosing to play it</em> (not by keeping it).</p>
      <table className="rules-powers">
        <tbody>
          <tr><td><strong>7 or 8</strong></td><td>Know your fate — look at one of your own cards.</td></tr>
          <tr><td><strong>9 or 10</strong></td><td>Know a friend — look at one of someone else's cards.</td></tr>
          <tr><td><strong>Jack</strong></td><td>Blind swap — swap any two cards on the table, without looking at either.</td></tr>
          <tr><td><strong>Queen</strong></td><td>Look &amp; swap — look at one of your own cards and one of an opponent's; if you do, you <em>must</em> then swap any one of your cards with any one of theirs.</td></tr>
        </tbody>
      </table>

      <h3>Calling Cabo</h3>
      <ul>
        <li>At the end of your turn, if you feel you have the lowest total, call Cabo.</li>
        <li>Everyone else gets exactly one final turn, then all hands are revealed.</li>
        <li>Once called, your cards are locked — you can't match anymore, and nobody can peek at or swap your cards either.</li>
        <li>You need the lowest total by a strict margin to win the call — a tie still counts as a loss for the caller.</li>
        <li>If someone empties their hand before Cabo is called, the round ends immediately and everyone reveals.</li>
      </ul>

      <h3>Scoring (across multiple rounds)</h3>
      <ul>
        <li>Cabo called and the caller wins: caller gets <strong>-30</strong>, everyone else scores their own hand total.</li>
        <li>Cabo called and the caller loses: caller gets <strong>+30</strong>; the lowest hand(s) split <strong>-30</strong>; everyone else scores their own hand total.</li>
        <li>Round ended by an empty hand (no Cabo called): the lowest hand(s) split <strong>-30</strong>; everyone else scores their own hand total.</li>
      </ul>
      <p className="hint">Scores accumulate across rounds. Lowest total when someone crosses the room's target score wins the game.</p>
    </div>
  );
}
