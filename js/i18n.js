/* Sedma – translations (Czech / English). */
(function (root) {
  'use strict';

  const STRINGS = {
    cs: {
      title: 'Sedma',
      subtitle: 'karetní hra pro 2 nebo 4 hráče',
      newGame: 'Nová hra',
      mode: 'Režim',
      mode2: '1 × 1 (vy vs. počítač)',
      mode4: '2 × 2 (vy + partner vs. 2 počítače)',
      deck: 'Karty',
      deckGerman: 'Mariášové (německé)',
      deckFrench: 'Francouzské',
      language: 'Jazyk',
      rules: 'Pravidla',
      close: 'Zavřít',
      talon: 'Talon',
      you: 'Vy',
      computer: 'Počítač',
      partner: 'Partner',
      leftOpp: 'Soupeř vlevo',
      rightOpp: 'Soupeř vpravo',
      teamUs: 'My',
      teamThem: 'Soupeři',
      teamUsSolo: 'Vy',
      teamThemSolo: 'Soupeř',
      points: 'Body',
      tricks: 'Štychy',
      match: 'Skóre zápasu',
      yourLead: 'Vynášíte – zahrajte libovolnou kartu.',
      yourLeadContinue: 'Otáčíte kolo – zahrajte kartu „{rank}“ nebo sedmu.',
      yourTurn: 'Jste na tahu – můžete přebít kartou „{rank}“ nebo sedmou.',
      waiting: '{name} přemýšlí…',
      decide: 'Štych drží soupeř. Otočte kolo kartou „{rank}“ nebo sedmou, nebo štych nechte.',
      decideOwn: 'Štych je váš. Otočte kolo kartou „{rank}“ nebo sedmou, nebo štych vezměte.',
      stopBtn: 'Nechat štych',
      turnAct: 'Otočit kolo',
      turnActTitle: 'Otočit kolo – zahraje {card}',
      takeBtn: 'Vzít štych',
      trickTo: '{name} bere štych',
      trickToYou: 'Berete štych',
      trickPts: '(+{pts} b.)',
      lastTrickBonus: 'Poslední štych +10 b.',
      gameOver: 'Konec hry',
      youWin: 'Vyhráli jste!',
      youLose: 'Prohráli jste.',
      stake1Won: 'Obyčejná výhra (1 bod).',
      stake1Lost: 'Obyčejná prohra (1 bod).',
      stake2Won: 'Soupeři nezískali žádné body – dvojnásobná výhra (2 body).',
      stake2WonSolo: 'Soupeř nezískal žádné body – dvojnásobná výhra (2 body).',
      stake2Lost: 'Nezískali jste žádné body – dvojnásobná prohra (2 body).',
      stake3Won: 'Soupeři neudělali ani štych – trojnásobná výhra (3 body).',
      stake3WonSolo: 'Soupeř neudělal ani štych – trojnásobná výhra (3 body).',
      stake3Lost: 'Neudělali jste ani štych – trojnásobná prohra (3 body).',
      nextGame: 'Další hra',
      log: 'Průběh hry',
      showLog: 'Zobrazit průběh hry',
      continued: '{name} otáčí kolo',
      continuedYou: 'Otáčíte kolo',
      gaveUp: '{name} nechává štych',
      gaveUpYou: 'Necháváte štych',
      rulesHtml: `
        <p><b>Sedma</b> se hraje s 32 kartami. Na začátku dostane každý 4 karty, zbytek tvoří talon.</p>
        <ul>
          <li><b>Body</b> mají jen esa a desítky (po 10 b.) a poslední štych (10 b.). Celkem 90 bodů, vyhrává strana s víc body.</li>
          <li>Barvy nehrají roli. Štych přebije karta <b>stejné hodnoty</b> jako vynesená karta, nebo <b>sedma</b> (sedma je „žolík“).</li>
          <li>Štych bere ten, kdo jako poslední zahrál kartu stejné hodnoty jako první karta nebo sedmu.</li>
          <li>Když všichni zahrají, může vynášející <b>otočit kolo</b> – zahraje další kartu stejné hodnoty nebo sedmu a všichni hrají znovu, a to i opakovaně. Jde to, i když štych zrovna drží jeho strana.</li>
          <li>Po štychu si hráči doberou do 4 karet (první bere vítěz štychu), vítěz pak vynáší.</li>
          <li>Ve hře 2 × 2 sedí partneři naproti sobě.</li>
        </ul>`,
    },
    en: {
      title: 'Sedma',
      subtitle: 'a Czech card game for 2 or 4 players',
      newGame: 'New game',
      mode: 'Mode',
      mode2: '1 vs 1 (you vs computer)',
      mode4: '2 vs 2 (you + partner vs 2 computers)',
      deck: 'Cards',
      deckGerman: 'German suited (Czech)',
      deckFrench: 'French suited',
      language: 'Language',
      rules: 'Rules',
      close: 'Close',
      talon: 'Stock',
      you: 'You',
      computer: 'Computer',
      partner: 'Partner',
      leftOpp: 'Left opponent',
      rightOpp: 'Right opponent',
      teamUs: 'Us',
      teamThem: 'Opponents',
      teamUsSolo: 'You',
      teamThemSolo: 'Opponent',
      points: 'Points',
      tricks: 'Tricks',
      match: 'Match score',
      yourLead: 'Your lead – play any card.',
      yourLeadContinue: 'You continue – play a “{rank}” or a seven.',
      yourTurn: 'Your turn – a “{rank}” or a seven takes the trick.',
      waiting: '{name} is thinking…',
      decide: 'The opponents hold the trick. Play a “{rank}” or a seven to continue, or give it up.',
      decideOwn: 'Your side holds the trick. Play a “{rank}” or a seven to continue, or take it.',
      stopBtn: 'Give up the trick',
      turnAct: 'Turn the round',
      turnActTitle: 'Turn the round – plays the {card}',
      takeBtn: 'Take the trick',
      trickTo: '{name} takes the trick',
      trickToYou: 'You take the trick',
      trickPts: '(+{pts} pts)',
      lastTrickBonus: 'Last trick +10 pts',
      gameOver: 'Game over',
      youWin: 'You won!',
      youLose: 'You lost.',
      stake1Won: 'Simple win (1 point).',
      stake1Lost: 'Simple loss (1 point).',
      stake2Won: 'The opponents scored no points – double win (2 points).',
      stake2WonSolo: 'Your opponent scored no points – double win (2 points).',
      stake2Lost: 'You scored no points – double loss (2 points).',
      stake3Won: 'The opponents took no trick – triple win (3 points).',
      stake3WonSolo: 'Your opponent took no trick – triple win (3 points).',
      stake3Lost: 'You took no trick – triple loss (3 points).',
      nextGame: 'Next game',
      log: 'Game log',
      showLog: 'Show game log',
      continued: '{name} continues',
      continuedYou: 'You continue',
      gaveUp: '{name} gives up the trick',
      gaveUpYou: 'You give up the trick',
      rulesHtml: `
        <p><b>Sedma</b> is played with 32 cards. Everyone gets 4 cards, the rest forms the stock.</p>
        <ul>
          <li><b>Points</b>: only aces and tens (10 each) and the last trick (10). 90 in total, the side with more points wins.</li>
          <li>Suits do not matter. A card of the <b>same rank</b> as the led card, or any <b>seven</b> (wild), beats the trick.</li>
          <li>The trick goes to whoever last played a card of the led rank or a seven.</li>
          <li>After everybody has played, the leader may <b>continue</b> (“turn the round”) with another card of the led rank or a seven – then everybody plays again, as many times as the leader can. This is allowed even when the leader's side already holds the trick.</li>
          <li>After a trick everyone draws back to 4 cards (the winner first) and the winner leads.</li>
          <li>In the 2 vs 2 game partners sit opposite each other.</li>
        </ul>`,
    },
  };

  const RANK_NAMES = {
    german: {
      cs: { 7: 'sedma', 8: 'osma', 9: 'devítka', 10: 'desítka', U: 'spodek', O: 'svršek', K: 'král', A: 'eso' },
      en: { 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', U: 'under', O: 'over', K: 'king', A: 'ace' },
    },
    french: {
      cs: { 7: 'sedma', 8: 'osma', 9: 'devítka', 10: 'desítka', U: 'kluk', O: 'dáma', K: 'král', A: 'eso' },
      en: { 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', U: 'jack', O: 'queen', K: 'king', A: 'ace' },
    },
  };

  const SUIT_NAMES = {
    german: {
      cs: { srdce: 'srdce', listy: 'listy', kule: 'kule', zaludy: 'žaludy' },
      en: { srdce: 'hearts', listy: 'leaves', kule: 'bells', zaludy: 'acorns' },
    },
    french: {
      cs: { srdce: 'srdce', listy: 'piky', kule: 'kára', zaludy: 'kříže' },
      en: { srdce: 'hearts', listy: 'spades', kule: 'diamonds', zaludy: 'clubs' },
    },
  };

  function t(lang, key, vars) {
    let s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  function cardName(lang, deck, card) {
    const r = RANK_NAMES[deck][lang][card.rank];
    const s = SUIT_NAMES[deck][lang][card.suit];
    return lang === 'cs' ? `${r} (${s})` : `${r} of ${s}`;
  }

  function rankName(lang, deck, rank) {
    return RANK_NAMES[deck][lang][rank];
  }

  function has(lang, key) {
    return Boolean(STRINGS[lang] && STRINGS[lang][key]);
  }

  root.SedmaI18n = { t, has, cardName, rankName };
})(this);
