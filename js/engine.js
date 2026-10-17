/*
 * Sedma – game engine (pure logic, no DOM).
 * Works in the browser (window.SedmaEngine) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  const SUITS = ['srdce', 'listy', 'kule', 'zaludy'];
  const RANKS = ['7', '8', '9', '10', 'U', 'O', 'K', 'A'];
  const HAND_SIZE = 4;
  const LAST_TRICK_BONUS = 10;
  const TOTAL_POINTS = 90;

  function makeDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) deck.push({ id: suit + '-' + rank, suit, rank });
    }
    return deck;
  }

  function shuffle(arr, rng) {
    const r = rng || Math.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Aces and tens ("ostré") are worth 10 points, everything else 0. */
  function cardPoints(card) {
    return card.rank === 'A' || card.rank === '10' ? 10 : 0;
  }

  /** A card takes over the trick if it matches the lead rank or is a seven. */
  function beats(card, leadRank) {
    return card.rank === '7' || card.rank === leadRank;
  }

  function teamOf(state, player) {
    return state.players[player].team;
  }

  function nextPlayer(state, player) {
    return (player + 1) % state.numPlayers;
  }

  function newTrick(leader) {
    return { leader, leadRank: null, plays: [], holder: null, round: 0, roundStart: 0 };
  }

  /**
   * Create a new deal. Players sit clockwise 0..n-1, teams are index % 2
   * (so in the 4 player game partners sit opposite each other).
   */
  function newGame(opts) {
    const o = opts || {};
    const numPlayers = o.numPlayers === 4 ? 4 : 2;
    const firstLeader = (o.firstLeader || 0) % numPlayers;
    const deck = shuffle(makeDeck(), o.rng);
    const players = [];
    for (let i = 0; i < numPlayers; i++) players.push({ hand: [], team: i % 2 });
    for (let k = 0; k < HAND_SIZE; k++) {
      for (let i = 0; i < numPlayers; i++) {
        players[(firstLeader + i) % numPlayers].hand.push(deck.pop());
      }
    }
    return {
      numPlayers,
      players,
      talon: deck,
      leader: firstLeader,
      turn: firstLeader,
      trick: newTrick(firstLeader),
      phase: 'play', // 'play' | 'decide' | 'collect' | 'over'
      captured: [[], []],
      tricksWon: [0, 0],
      played: [], // every card already taken in a finished trick (public knowledge)
      lastTrick: null,
      lastTrickTeam: null,
      result: null,
    };
  }

  function roundCount(trick) {
    return trick.plays.length - trick.roundStart;
  }

  function legalMoves(state, player) {
    if (state.phase !== 'play' || state.turn !== player) return [];
    const hand = state.players[player].hand;
    const t = state.trick;
    // When the leader continues the trick, they must play a beating card.
    if (t.round > 0 && player === t.leader && roundCount(t) === 0) {
      return hand.filter((c) => beats(c, t.leadRank));
    }
    return hand.slice();
  }

  /** After a full round the leader may continue ("otočit kolo") whenever they
   *  still hold a card that beats (lead rank or a seven) – no matter who
   *  currently holds the trick. */
  function canContinue(state) {
    const t = state.trick;
    return state.players[t.leader].hand.some((c) => beats(c, t.leadRank));
  }

  function playCard(state, player, cardId) {
    const legal = legalMoves(state, player);
    const card = legal.find((c) => c.id === cardId);
    if (!card) throw new Error('Illegal move: player ' + player + ' card ' + cardId);
    const hand = state.players[player].hand;
    hand.splice(hand.indexOf(card), 1);

    const t = state.trick;
    t.plays.push({ player, card, round: t.round });
    if (t.plays.length === 1) {
      t.leadRank = card.rank;
      t.holder = player;
    } else if (beats(card, t.leadRank)) {
      t.holder = player;
    }

    if (roundCount(t) === state.numPlayers) {
      if (canContinue(state)) {
        state.phase = 'decide';
        state.turn = t.leader;
      } else {
        state.phase = 'collect';
        state.turn = null;
      }
    } else {
      state.turn = nextPlayer(state, player);
    }
    return card;
  }

  function decide(state, continueTrick) {
    if (state.phase !== 'decide') throw new Error('Not in decide phase');
    const t = state.trick;
    if (continueTrick) {
      t.round += 1;
      t.roundStart = t.plays.length;
      state.phase = 'play';
      state.turn = t.leader;
    } else {
      state.phase = 'collect';
      state.turn = null;
    }
  }

  function trickPoints(trick) {
    return trick.plays.reduce((s, p) => s + cardPoints(p.card), 0);
  }

  /** Give the finished trick to its holder, refill hands and start the next trick. */
  function collectTrick(state) {
    if (state.phase !== 'collect') throw new Error('Not in collect phase');
    const t = state.trick;
    const winner = t.holder;
    const team = teamOf(state, winner);
    const cards = t.plays.map((p) => p.card);
    state.captured[team].push(...cards);
    state.played.push(...cards);
    state.tricksWon[team] += 1;
    state.lastTrick = { winner, team, plays: t.plays, points: trickPoints(t) };

    // Refill to HAND_SIZE, winner draws first, then clockwise.
    let i = winner;
    while (state.talon.length && state.players.some((p) => p.hand.length < HAND_SIZE)) {
      if (state.players[i].hand.length < HAND_SIZE) state.players[i].hand.push(state.talon.pop());
      i = nextPlayer(state, i);
    }

    state.leader = winner;
    if (state.players.every((p) => p.hand.length === 0)) {
      state.lastTrickTeam = team;
      state.phase = 'over';
      state.turn = null;
      state.result = computeResult(state);
    } else {
      state.trick = newTrick(winner);
      state.phase = 'play';
      state.turn = winner;
    }
    return state.lastTrick;
  }

  function teamPoints(state) {
    const pts = state.captured.map((cards) => cards.reduce((s, c) => s + cardPoints(c), 0));
    if (state.lastTrickTeam !== null) pts[state.lastTrickTeam] += LAST_TRICK_BONUS;
    return pts;
  }

  /**
   * Winner is the team with more points (90 in total, a tie is impossible).
   * Stakes: 1 = simple win, 2 = losers scored no points,
   * 3 = losers took no trick at all.
   */
  function computeResult(state) {
    const points = teamPoints(state);
    const winner = points[0] > points[1] ? 0 : 1;
    const loser = 1 - winner;
    let stake = 1;
    if (state.tricksWon[loser] === 0) stake = 3;
    else if (points[loser] === 0) stake = 2;
    return { points, winner, stake };
  }

  const api = {
    SUITS, RANKS, HAND_SIZE, TOTAL_POINTS, LAST_TRICK_BONUS,
    makeDeck, shuffle, cardPoints, beats, teamOf, nextPlayer,
    newGame, legalMoves, canContinue, playCard, decide, collectTrick,
    trickPoints, teamPoints, computeResult, roundCount,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SedmaEngine = api;
})(this);
