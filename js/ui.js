/* Sedma – browser UI. Depends on SedmaEngine, SedmaAI, SedmaI18n. */
(function () {
  'use strict';

  const E = window.SedmaEngine;
  const AI = window.SedmaAI;
  const I = window.SedmaI18n;

  const AI_DELAY = 750;
  const COLLECT_DELAY = 1500;
  const SEATS = { 2: ['bottom', 'top'], 4: ['bottom', 'left', 'top', 'right'] };
  const NAME_KEYS = { 2: ['you', 'computer'], 4: ['you', 'leftOpp', 'partner', 'rightOpp'] };

  const $ = (id) => document.getElementById(id);

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem('sedma.' + key);
      localStorage.setItem('sedma.' + key, value);
    } catch (e) { /* storage unavailable – settings just won't persist */ }
    return null;
  }

  const params = new URLSearchParams(location.search);
  const S = {
    lang: params.get('lang') || store('lang') || ((navigator.language || '').startsWith('cs') ? 'cs' : 'en'),
    deck: params.get('deck') || store('deck') || 'german',
    mode: Number(params.get('mode') || store('mode') || 2),
    game: null,
    match: [0, 0],
    firstLeader: Number(params.get('lead') || 0),
    log: [],
    token: 0,
    message: null,
  };
  if (!['cs', 'en'].includes(S.lang)) S.lang = 'en';
  if (!['german', 'french'].includes(S.deck)) S.deck = 'german';
  if (S.mode !== 4) S.mode = 2;

  const t = (key, vars) => I.t(S.lang, key, vars);
  const nameOf = (p) => t(NAME_KEYS[S.game.numPlayers][p]);
  const isHuman = (p) => p === 0;

  function cardSrc(card) {
    return `assets/cards/${S.deck}/${card.id}.svg`;
  }
  function backSrc() {
    return S.deck === 'french' ? 'assets/cards/french/back.svg' : 'assets/cards/back.svg';
  }

  function cardImg(card, extraClass) {
    const img = document.createElement('img');
    img.className = 'card' + (extraClass ? ' ' + extraClass : '');
    img.src = cardSrc(card);
    img.alt = I.cardName(S.lang, S.deck, card);
    img.title = img.alt;
    img.draggable = false;
    return img;
  }

  function backImg() {
    const img = document.createElement('img');
    img.className = 'card back';
    img.src = backSrc();
    img.alt = '';
    img.draggable = false;
    return img;
  }

  // ---------- game flow ----------

  function newGame() {
    S.token++;
    S.game = E.newGame({ numPlayers: S.mode, firstLeader: S.firstLeader % S.mode });
    S.firstLeader = (S.firstLeader + 1) % S.mode; // the lead rotates between games
    S.log = [];
    S.message = null;
    $('over').close?.();
    render();
    schedule();
  }

  function schedule() {
    const g = S.game;
    const token = S.token;
    const later = (fn, ms) => setTimeout(() => { if (token === S.token) fn(); }, ms);

    if (g.phase === 'over') {
      later(showResult, 600);
      return;
    }
    if (g.phase === 'collect') {
      const h = g.trick.holder;
      const pts = E.trickPoints(g.trick);
      S.message = t('trickTo', { name: nameOf(h) }) + (pts ? ' ' + t('trickPts', { pts }) : '');
      render();
      later(() => {
        const info = E.collectTrick(g);
        addLog(t('trickTo', { name: nameOf(info.winner) }) + (info.points ? ' ' + t('trickPts', { pts: info.points }) : ''));
        if (g.phase === 'over') addLog(t('lastTrickBonus') + ' → ' + nameOf(info.winner));
        S.message = null;
        render();
        schedule();
      }, COLLECT_DELAY);
      return;
    }
    if (isHuman(g.turn)) { render(); return; }

    render();
    later(() => {
      const p = g.turn;
      if (g.phase === 'decide') {
        const cont = AI.chooseContinue(g, p);
        addLog(t(cont ? 'continued' : 'gaveUp', { name: nameOf(p) }));
        E.decide(g, cont);
      } else {
        const c = AI.chooseCard(g, p);
        E.playCard(g, p, c.id);
      }
      schedule();
    }, AI_DELAY);
  }

  function humanPlay(cardId) {
    const g = S.game;
    if (g.phase !== 'play' || !isHuman(g.turn)) return;
    E.playCard(g, 0, cardId);
    schedule();
  }

  function humanDecide(cont) {
    const g = S.game;
    if (g.phase !== 'decide' || !isHuman(g.turn)) return;
    addLog(t(cont ? 'continued' : 'gaveUp', { name: nameOf(0) }));
    E.decide(g, cont);
    schedule();
  }

  function addLog(text) {
    S.log.unshift(text);
    S.log.length = Math.min(S.log.length, 30);
  }

  function showResult() {
    const r = S.game.result;
    const won = r.winner === 0;
    S.match[r.winner] += r.stake;
    store('match', JSON.stringify(S.match));
    $('over-title').textContent = won ? t('youWin') : t('youLose');
    $('over-text').textContent = `${t('teamUs')} ${r.points[0]} : ${r.points[1]} ${t('teamThem')}. ${t('stake' + r.stake)}`;
    $('over').classList.toggle('lost', !won);
    renderScore();
    $('over').showModal ? $('over').showModal() : $('over').setAttribute('open', '');
  }

  // ---------- rendering ----------

  function renderSeat(p) {
    const g = S.game;
    const seat = SEATS[g.numPlayers][p];
    const el = $('seat-' + seat);
    el.hidden = false;
    el.classList.toggle('active', g.turn === p);
    el.querySelector('.seat-name').textContent = nameOf(p);
    const hand = el.querySelector('.hand');
    hand.innerHTML = '';

    if (isHuman(p)) {
      const legal = new Set(E.legalMoves(g, 0).map((c) => c.id));
      const sorted = g.players[0].hand.slice().sort((a, b) =>
        E.RANKS.indexOf(a.rank) - E.RANKS.indexOf(b.rank) || a.suit.localeCompare(b.suit));
      for (const c of sorted) {
        const btn = document.createElement('button');
        btn.className = 'card-btn';
        const playable = legal.has(c.id);
        btn.disabled = !playable;
        if (playable) btn.classList.add('playable');
        btn.appendChild(cardImg(c));
        btn.setAttribute('aria-label', I.cardName(S.lang, S.deck, c));
        btn.addEventListener('click', () => humanPlay(c.id));
        hand.appendChild(btn);
      }
    } else {
      for (let i = 0; i < g.players[p].hand.length; i++) hand.appendChild(backImg());
    }
  }

  function renderTrick() {
    const g = S.game;
    const tr = $('trick');
    tr.innerHTML = '';
    let lastRound = 0;
    for (const play of g.trick.plays) {
      const wrap = document.createElement('div');
      wrap.className = 'trick-card';
      if (play.round !== lastRound) { wrap.classList.add('new-round'); lastRound = play.round; }
      if (play.player === g.trick.holder) wrap.classList.add('holder');
      wrap.appendChild(cardImg(play.card));
      const lbl = document.createElement('span');
      lbl.textContent = nameOf(play.player);
      wrap.appendChild(lbl);
      tr.appendChild(wrap);
    }
    if (!g.trick.plays.length && g.lastTrick && g.phase !== 'over') {
      const hint = document.createElement('div');
      hint.className = 'trick-hint';
      hint.textContent = S.log[0] || '';
      tr.appendChild(hint);
    }
  }

  function renderTalon() {
    const g = S.game;
    const el = $('talon-pile');
    el.innerHTML = '';
    if (g.talon.length) el.appendChild(backImg());
    $('talon-count').textContent = `${t('talon')}: ${g.talon.length}`;
  }

  function renderScore() {
    const g = S.game;
    const pts = E.teamPoints(g);
    $('score').innerHTML = `
      <table>
        <tr><th></th><th>${t('points')}</th><th>${t('tricks')}</th></tr>
        <tr><td>${t('teamUs')}</td><td>${pts[0]}</td><td>${g.tricksWon[0]}</td></tr>
        <tr><td>${t('teamThem')}</td><td>${pts[1]}</td><td>${g.tricksWon[1]}</td></tr>
      </table>
      <div class="match">${t('match')}: <b>${S.match[0]} : ${S.match[1]}</b></div>`;
  }

  function renderStatus() {
    const g = S.game;
    const status = $('status');
    const buttons = $('decide');
    buttons.hidden = !(g.phase === 'decide' && isHuman(g.turn));
    let msg = S.message || '';
    if (!msg) {
      const rank = g.trick.leadRank ? I.rankName(S.lang, S.deck, g.trick.leadRank) : '';
      if (g.phase === 'decide' && isHuman(g.turn)) msg = t('decide');
      else if (g.phase === 'play' && isHuman(g.turn)) {
        if (!g.trick.plays.length) msg = t('yourLead');
        else if (g.trick.leader === 0 && E.roundCount(g.trick) === 0) msg = t('yourLeadContinue', { rank });
        else msg = t('yourTurn', { rank });
      } else if (g.turn !== null) msg = t('waiting', { name: nameOf(g.turn) });
    }
    status.textContent = msg;
  }

  function renderLog() {
    const ul = $('log-list');
    ul.innerHTML = '';
    for (const line of S.log) {
      const li = document.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    }
  }

  function renderTexts() {
    document.documentElement.lang = S.lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $('rules-body').innerHTML = t('rulesHtml');
    $('mode').value = String(S.mode);
    $('deck').value = S.deck;
    document.querySelectorAll('.lang-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
  }

  function render() {
    const g = S.game;
    renderTexts();
    $('table').className = 'table mode-' + g.numPlayers;
    for (const seat of ['top', 'left', 'right']) $('seat-' + seat).hidden = true;
    for (let p = 0; p < g.numPlayers; p++) renderSeat(p);
    renderTrick();
    renderTalon();
    renderScore();
    renderStatus();
    renderLog();
  }

  // ---------- wiring ----------

  function init() {
    try { S.match = JSON.parse(store('match')) || [0, 0]; } catch (e) { S.match = [0, 0]; }
    $('new-game').addEventListener('click', newGame);
    $('next-game').addEventListener('click', () => { $('over').close(); newGame(); });
    $('mode').addEventListener('change', (e) => {
      S.mode = Number(e.target.value);
      store('mode', S.mode);
      S.match = [0, 0];
      store('match', JSON.stringify(S.match));
      newGame();
    });
    $('deck').addEventListener('change', (e) => { S.deck = e.target.value; store('deck', S.deck); render(); });
    document.querySelectorAll('.lang-btn').forEach((b) => b.addEventListener('click', () => {
      S.lang = b.dataset.lang; store('lang', S.lang); render();
    }));
    $('btn-continue').addEventListener('click', () => humanDecide(true));
    $('btn-stop').addEventListener('click', () => humanDecide(false));
    $('rules-btn').addEventListener('click', () => $('rules').showModal());
    $('rules-close').addEventListener('click', () => $('rules').close());
    newGame();
  }

  init();
})();
