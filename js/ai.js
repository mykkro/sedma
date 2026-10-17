/*
 * Sedma – computer player (heuristic).
 * Uses only public information: own hand, cards on the table and cards
 * already taken in previous tricks.
 */
(function (root) {
  'use strict';

  const E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.SedmaEngine;

  const isSeven = (c) => c.rank === '7';
  const isPoint = (c) => E.cardPoints(c) > 0;
  const rankIndex = (c) => E.RANKS.indexOf(c.rank);

  /** Extra value when the current trick will probably be the last one (+10 bonus). */
  function endgameBonus(state, me) {
    return state.talon.length === 0 && state.players[me].hand.length <= 2 ? E.LAST_TRICK_BONUS : 0;
  }

  function trickValue(state, me) {
    return E.trickPoints(state.trick) + endgameBonus(state, me);
  }

  /** Copies of `rank` not in my hand and not yet taken – i.e. possibly held by others. */
  function unknownCopies(state, me, rank) {
    const mine = state.players[me].hand.filter((c) => c.rank === rank).length;
    const gone = state.played.filter((c) => c.rank === rank).length;
    const onTable = state.trick.plays.filter((p) => p.card.rank === rank).length;
    return 4 - mine - gone - onTable;
  }

  /** Pick the card that is cheapest to give away. */
  function cheapest(cards, giveToOpponent) {
    const cost = (c) => {
      if (isSeven(c)) return 60;
      if (isPoint(c)) return giveToOpponent ? 100 : 40;
      return rankIndex(c);
    };
    return cards.slice().sort((a, b) => cost(a) - cost(b))[0];
  }

  function chooseLead(state, me) {
    const hand = state.players[me].hand;
    const sevens = hand.filter(isSeven).length;
    let best = null;
    let bestScore = -Infinity;
    for (const c of hand) {
      const copies = hand.filter((x) => x.rank === c.rank).length;
      const unknown = unknownCopies(state, me, c.rank);
      let score = copies * 6 + (4 - unknown) * 2 - rankIndex(c) * 0.1;
      if (isSeven(c)) score -= 30;
      else if (sevens) score += 3;
      if (isPoint(c)) {
        score -= 15;
        if (copies >= 2 || unknown === 0) score += 12;
      }
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  function chooseFollow(state, me, legal) {
    const t = state.trick;
    const myTeam = E.teamOf(state, me);
    const after = state.numPlayers - E.roundCount(t) - 1; // players still to act this round
    const value = trickValue(state, me);
    const matching = legal.filter((c) => c.rank === t.leadRank && !isSeven(c));
    const sevens = legal.filter(isSeven);

    if (E.teamOf(state, t.holder) === myTeam) {
      // Partner holds the trick. If nobody can take it any more, smear points onto it.
      const safe = after === 0 && E.teamOf(state, t.leader) === myTeam;
      if (safe) {
        const pts = legal.filter((c) => isPoint(c) && !isSeven(c));
        if (pts.length) return pts[0];
      }
      return cheapest(legal, false);
    }

    // Opponents hold the trick.
    if (matching.length) {
      // Prefer the matching card with points (it adds to the trick we take).
      return matching.slice().sort((a, b) => E.cardPoints(b) - E.cardPoints(a))[0];
    }
    if (sevens.length) {
      const rest = legal.filter((c) => !isSeven(c));
      const onlyPointsLeft = rest.length > 0 && rest.every(isPoint);
      if (value >= 10 || onlyPointsLeft || rest.length === 0) return sevens[0];
    }
    return cheapest(legal, true);
  }

  function chooseCard(state, me) {
    const legal = E.legalMoves(state, me);
    if (legal.length <= 1) return legal[0];
    const t = state.trick;
    if (t.plays.length === 0) return chooseLead(state, me);
    if (t.round > 0 && me === t.leader && E.roundCount(t) === 0) {
      // Continuing: spend a lead-rank card before a seven.
      return legal.find((c) => !isSeven(c)) || legal[0];
    }
    return chooseFollow(state, me, legal);
  }

  function chooseContinue(state, me) {
    const t = state.trick;
    const hand = state.players[me].hand;
    const matching = hand.filter((c) => c.rank === t.leadRank && !isSeven(c));
    const sevens = hand.filter(isSeven);
    const value = trickValue(state, me);
    if (matching.length) return true;
    if (sevens.length && value >= 10) return true;
    return false;
  }

  const api = { chooseCard, chooseContinue };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SedmaAI = api;
})(this);
