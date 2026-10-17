// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');
const AI = require('../js/ai.js');

const card = (suit, rank) => ({ id: suit + '-' + rank, suit, rank });

/** Small deterministic PRNG so failures are reproducible. */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a 2-player state with fixed hands and an empty talon. */
function fixedState(hands, numPlayers = 2) {
  const s = E.newGame({ numPlayers, rng: mulberry32(1) });
  s.talon = [];
  hands.forEach((h, i) => { s.players[i].hand = h; });
  return s;
}

test('deck has 32 unique cards and 80 card points', () => {
  const deck = E.makeDeck();
  assert.equal(deck.length, 32);
  assert.equal(new Set(deck.map((c) => c.id)).size, 32);
  assert.equal(deck.reduce((s, c) => s + E.cardPoints(c), 0), 80);
});

test('new game deals 4 cards each', () => {
  for (const n of [2, 4]) {
    const s = E.newGame({ numPlayers: n });
    s.players.forEach((p) => assert.equal(p.hand.length, 4));
    assert.equal(s.talon.length, 32 - 4 * n);
  }
});

test('seven and lead rank take over the trick', () => {
  const s = fixedState([[card('srdce', '9'), card('kule', 'K')], [card('listy', '7'), card('kule', '8')]]);
  E.playCard(s, 0, 'srdce-9');
  E.playCard(s, 1, 'listy-7');
  assert.equal(s.trick.holder, 1);
  // Leader has no 9 or 7 left -> cannot continue, trick goes to player 1.
  assert.equal(s.phase, 'collect');
  E.collectTrick(s);
  assert.equal(s.tricksWon[1], 1);
  assert.equal(s.leader, 1);
});

test('non-matching card does not take the trick', () => {
  const s = fixedState([[card('srdce', '9')], [card('kule', 'A')]]);
  E.playCard(s, 0, 'srdce-9');
  E.playCard(s, 1, 'kule-A');
  assert.equal(s.trick.holder, 0);
  E.collectTrick(s);
  assert.equal(s.phase, 'over');
  // ace (10) + last trick bonus (10)
  assert.deepEqual(s.result.points, [20, 0]);
});

test('leader may continue only with lead rank or seven when beaten', () => {
  const s = fixedState([
    [card('srdce', '9'), card('kule', '9'), card('listy', 'A')],
    [card('zaludy', '9'), card('kule', '8'), card('listy', '10')],
  ]);
  E.playCard(s, 0, 'srdce-9');
  E.playCard(s, 1, 'zaludy-9');
  assert.equal(s.phase, 'decide');
  E.decide(s, true);
  assert.deepEqual(E.legalMoves(s, 0).map((c) => c.id), ['kule-9']);
  E.playCard(s, 0, 'kule-9');
  assert.equal(s.trick.holder, 0);
  // Opponent may play anything in the continuation round.
  assert.equal(E.legalMoves(s, 1).length, 2);
  E.playCard(s, 1, 'listy-10');
  assert.equal(s.phase, 'collect'); // leader's team holds -> no further decision
  E.collectTrick(s);
  assert.equal(s.captured[0].length, 4);
});

test('leader may give up the trick', () => {
  const s = fixedState([
    [card('srdce', '9'), card('kule', '9')],
    [card('zaludy', '9'), card('kule', '8')],
  ]);
  E.playCard(s, 0, 'srdce-9');
  E.playCard(s, 1, 'zaludy-9');
  E.decide(s, false);
  E.collectTrick(s);
  assert.equal(s.tricksWon[1], 1);
  assert.equal(s.turn, 1);
});

test('leader may turn the round even when their own side holds the trick', () => {
  const s = fixedState([
    [card('srdce', '8'), card('kule', '8')],
    [card('srdce', 'K'), card('kule', 'K')],
    [card('listy', '8'), card('listy', 'K')],
    [card('zaludy', 'K'), card('zaludy', 'O')],
  ], 4);
  E.playCard(s, 0, 'srdce-8');
  E.playCard(s, 1, 'srdce-K');
  E.playCard(s, 2, 'listy-8');
  E.playCard(s, 3, 'zaludy-K');
  assert.equal(s.trick.holder, 2); // partner holds
  assert.equal(s.phase, 'decide'); // leader still has an 8
  E.decide(s, true);
  assert.deepEqual(E.legalMoves(s, 0).map((c) => c.id), ['kule-8']);
});

test('leader may turn the round repeatedly while they have beating cards', () => {
  const s = fixedState([
    [card('srdce', '9'), card('kule', '9'), card('listy', '7')],
    [card('srdce', '8'), card('kule', '8'), card('listy', '8')],
  ]);
  E.playCard(s, 0, 'srdce-9');
  E.playCard(s, 1, 'srdce-8');
  assert.equal(s.phase, 'decide'); // own trick, still holds a 9 and a 7
  E.decide(s, true);
  E.playCard(s, 0, 'kule-9');
  E.playCard(s, 1, 'kule-8');
  assert.equal(s.phase, 'decide'); // still holds the 7
  E.decide(s, true);
  assert.deepEqual(E.legalMoves(s, 0).map((c) => c.id), ['listy-7']);
  E.playCard(s, 0, 'listy-7');
  E.playCard(s, 1, 'listy-8');
  assert.equal(s.trick.round, 2);
  assert.equal(s.phase, 'collect');
  E.collectTrick(s);
  assert.equal(s.captured[0].length, 6);
});

test('without a beating card the trick ends after the round', () => {
  const s = fixedState([
    [card('srdce', '8'), card('kule', 'O')],
    [card('srdce', 'K'), card('kule', 'K')],
  ]);
  E.playCard(s, 0, 'srdce-8');
  E.playCard(s, 1, 'srdce-K');
  assert.equal(s.phase, 'collect');
});

test('winner draws first when refilling', () => {
  const s = E.newGame({ numPlayers: 2, rng: mulberry32(7) });
  s.players[0].hand = [card('srdce', '9')];
  s.players[1].hand = [card('kule', '9')];
  s.talon = [card('listy', '8'), card('listy', 'A')]; // pop() takes from the end
  E.playCard(s, 0, 'srdce-9');
  E.playCard(s, 1, 'kule-9');
  assert.equal(s.phase, 'collect'); // leader has no 9 or 7 left
  E.collectTrick(s);
  assert.equal(s.players[1].hand[0].id, 'listy-A');
  assert.equal(s.players[0].hand[0].id, 'listy-8');
});

test('stake: 3 when losers took no trick, 2 when they scored nothing', () => {
  const s = fixedState([[], []]);
  s.captured = [E.makeDeck(), []];
  s.tricksWon = [8, 0];
  s.lastTrickTeam = 0;
  assert.deepEqual(E.computeResult(s), { points: [90, 0], winner: 0, stake: 3 });
  s.tricksWon = [7, 1];
  assert.equal(E.computeResult(s).stake, 2);
});

function randomChoice(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

/** Play a whole game; `policy[player]` is 'ai' or 'random'. Returns final state. */
function simulate(numPlayers, policy, rng, firstLeader = 0) {
  const s = E.newGame({ numPlayers, rng, firstLeader });
  let steps = 0;
  while (s.phase !== 'over') {
    assert.ok(++steps < 500, 'game did not terminate');
    if (s.phase === 'collect') { E.collectTrick(s); continue; }
    const p = s.turn;
    if (s.phase === 'decide') {
      E.decide(s, policy[p] === 'ai' ? AI.chooseContinue(s, p) : rng() < 0.5);
      continue;
    }
    const legal = E.legalMoves(s, p);
    assert.ok(legal.length > 0, 'player has no legal move');
    const c = policy[p] === 'ai' ? AI.chooseCard(s, p) : randomChoice(legal, rng);
    assert.ok(legal.includes(c), 'AI chose an illegal card');
    E.playCard(s, p, c.id);
  }
  return s;
}

test('simulated games keep invariants (2 and 4 players)', () => {
  const rng = mulberry32(42);
  for (const n of [2, 4]) {
    for (let g = 0; g < 1500; g++) {
      const policy = Array.from({ length: n }, () => (rng() < 0.5 ? 'ai' : 'random'));
      const s = simulate(n, policy, rng, g % n);
      assert.equal(s.captured[0].length + s.captured[1].length, 32);
      assert.equal(s.result.points[0] + s.result.points[1], E.TOTAL_POINTS);
      assert.notEqual(s.result.points[0], s.result.points[1]);
      assert.equal(s.talon.length, 0);
    }
  }
});

test('AI beats a random player clearly', () => {
  const rng = mulberry32(2024);
  for (const n of [2, 4]) {
    let aiWins = 0;
    const games = 2000;
    for (let g = 0; g < games; g++) {
      const policy = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'ai' : 'random'));
      const s = simulate(n, policy, rng, g % n);
      if (s.result.winner === 0) aiWins++;
    }
    const rate = aiWins / games;
    console.log(`  ${n} players: AI team win rate vs random = ${(rate * 100).toFixed(1)}%`);
    assert.ok(rate > 0.6, `AI win rate too low: ${rate}`);
  }
});
