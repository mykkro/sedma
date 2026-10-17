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
  const AVATARS = { 2: ['knight', 'wizard'], 4: ['knight', 'king', 'ranger', 'dwarf'] };
  const ICONS = {
    turn: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><polyline points="20 3 20 8 15 8"/>',
    take: '<path d="M12 3v11"/><polyline points="7 9 12 14 17 9"/><path d="M4 15v5h16v-5"/>',
    flag: '<path d="M5 21V3"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
  };

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
  /** Like t(), but prefers the "<key>Solo" variant in the 1 vs 1 game ("Vy" / "Soupeř"). */
  const tm = (key, vars) =>
    (S.game.numPlayers === 2 && I.has(S.lang, key + 'Solo') ? t(key + 'Solo', vars) : t(key, vars));
  /** Message about player p: the human gets a second-person sentence ("Berete štych"). */
  const say = (key, p, vars) => (isHuman(p) ? t(key + 'You', vars) : t(key, Object.assign({ name: nameOf(p) }, vars)));
  const ownTeamHolds = (g) => E.teamOf(g, g.trick.holder) === E.teamOf(g, g.trick.leader);

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

  /** Name label with the player's avatar. */
  function nameTag(p, cls) {
    const tag = document.createElement('span');
    tag.className = cls;
    const img = document.createElement('img');
    img.className = 'avatar';
    img.src = `assets/avatars/${AVATARS[S.game.numPlayers][p]}.svg`;
    img.title = nameOf(p);
    img.alt = '';
    img.draggable = false;
    const name = document.createElement('span');
    name.textContent = nameOf(p);
    tag.append(img, name);
    return tag;
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
      S.message = say('trickTo', h) + (pts ? ' ' + t('trickPts', { pts }) : '');
      render();
      later(() => {
        const info = E.collectTrick(g);
        addLog(say('trickTo', info.winner) + (info.points ? ' ' + t('trickPts', { pts: info.points }) : ''));
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
        logDecision(g, p, cont);
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
    if (!isHuman(g.turn)) return;
    if (g.phase === 'decide') {
      // Clicking a beating card turns the round and plays it in one step.
      logDecision(g, 0, true);
      E.decide(g, true);
    }
    if (g.phase !== 'play') return;
    E.playCard(g, 0, cardId);
    schedule();
  }

  /** Cards the human may click now – in the decide phase, the cards that turn the round. */
  function clickableCards(g) {
    if (g.phase === 'decide' && isHuman(g.turn)) {
      return g.players[0].hand.filter((c) => E.beats(c, g.trick.leadRank));
    }
    return E.legalMoves(g, 0);
  }

  /** The card used by the "turn the round" action: a lead-rank card before a seven. */
  function bestTurnCard(g) {
    const cards = clickableCards(g);
    return cards.find((c) => c.rank !== '7') || cards[0];
  }

  function humanDecide(cont) {
    const g = S.game;
    if (g.phase !== 'decide' || !isHuman(g.turn)) return;
    logDecision(g, 0, cont);
    E.decide(g, cont);
    schedule();
  }

  function logDecision(g, p, cont) {
    if (cont) addLog(say('continued', p));
    else if (!ownTeamHolds(g)) addLog(say('gaveUp', p)); // taking an own trick is logged on collect
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
    const stake = tm('stake' + r.stake + (won ? 'Won' : 'Lost'));
    $('over-text').textContent = `${tm('teamUs')} ${r.points[0]} : ${r.points[1]} ${tm('teamThem')}. ${stake}`;
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
    el.querySelector('.seat-name').replaceChildren(nameTag(p, 'name-tag'));
    const hand = el.querySelector('.hand');
    hand.innerHTML = '';

    if (isHuman(p)) {
      const legal = new Set(clickableCards(g).map((c) => c.id));
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
    tr.classList.toggle('many', g.trick.plays.length > g.numPlayers);
    let lastRound = 0;
    for (const play of g.trick.plays) {
      const wrap = document.createElement('div');
      wrap.className = 'trick-card';
      if (play.round !== lastRound) { wrap.classList.add('new-round'); lastRound = play.round; }
      if (play.player === g.trick.holder) wrap.classList.add('holder');
      wrap.appendChild(cardImg(play.card));
      wrap.appendChild(nameTag(play.player, 'trick-name'));
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
        <tr><td>${tm('teamUs')}</td><td>${pts[0]}</td><td>${g.tricksWon[0]}</td></tr>
        <tr><td>${tm('teamThem')}</td><td>${pts[1]}</td><td>${g.tricksWon[1]}</td></tr>
      </table>
      <div class="match">${t('match')}: <b>${S.match[0]} : ${S.match[1]}</b></div>`;
  }

  function renderStatus() {
    const g = S.game;
    const status = $('status');
    renderActions(g);
    let msg = S.message || '';
    if (!msg) {
      const rank = g.trick.leadRank ? I.rankName(S.lang, S.deck, g.trick.leadRank) : '';
      if (g.phase === 'decide' && isHuman(g.turn)) msg = t(ownTeamHolds(g) ? 'decideOwn' : 'decide', { rank });
      else if (g.phase === 'play' && isHuman(g.turn)) {
        if (!g.trick.plays.length) msg = t('yourLead');
        else if (g.trick.leader === 0 && E.roundCount(g.trick) === 0) msg = t('yourLeadContinue', { rank });
        else msg = t('yourTurn', { rank });
      } else if (g.turn !== null) msg = t('waiting', { name: nameOf(g.turn) });
    }
    status.textContent = msg;
  }

  function actionButton(icon, label, primary, onClick) {
    const wrap = document.createElement('div');
    wrap.className = 'action';
    const btn = document.createElement('button');
    btn.className = 'action-btn' + (primary ? ' primary' : '');
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[icon]}</svg>`;
    btn.addEventListener('click', onClick);
    const caption = document.createElement('span');
    caption.textContent = label;
    wrap.append(btn, caption);
    return wrap;
  }

  /** Round action buttons to the right of the hand (shown when the human may turn the round). */
  function renderActions(g) {
    const box = $('actions');
    box.replaceChildren();
    if (g.phase !== 'decide' || !isHuman(g.turn)) return;
    const card = bestTurnCard(g);
    box.append(
      actionButton('turn', t('turnAct'), true, () => humanPlay(card.id)),
      ownTeamHolds(g)
        ? actionButton('take', t('takeBtn'), false, () => humanDecide(false))
        : actionButton('flag', t('stopBtn'), false, () => humanDecide(false)));
    box.firstChild.querySelector('button').title = t('turnActTitle', { card: I.cardName(S.lang, S.deck, card) });
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

  function toggleMenu(open) {
    const menu = $('menu');
    const show = open === undefined ? menu.hidden : open;
    menu.hidden = !show;
    $('menu-btn').setAttribute('aria-expanded', String(show));
  }

  function setLogVisible(show) {
    $('log').hidden = !show;
    $('show-log').checked = show;
    store('log', show ? '1' : '0');
  }

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
    $('rules-btn').addEventListener('click', () => { toggleMenu(false); $('rules').showModal(); });
    $('menu-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
    $('menu').addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => toggleMenu(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });
    $('show-log').checked = store('log') === '1';
    $('show-log').addEventListener('change', (e) => setLogVisible(e.target.checked));
    $('log-close').addEventListener('click', () => setLogVisible(false));
    setLogVisible($('show-log').checked);
    $('rules-close').addEventListener('click', () => $('rules').close());
    newGame();
  }

  init();
})();
