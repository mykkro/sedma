# Sedma: pravidla a implementace / rules and implementation

[🇨🇿 Česky](#česky) · [🇬🇧 English](#english)

Sedma se hraje v mnoha místních variantách. Tento dokument popisuje variantu, kterou
hra implementuje, a odkazuje na místa v kódu, kde je každé pravidlo naprogramováno.

Sedma has many house variants. This document describes the variant this game
implements and points to the code that enforces each rule.

---

## Česky

### 1. Karty a hráči

| | |
|---|---|
| Balíček | 32 karet: 4 barvy × hodnoty 7, 8, 9, 10, spodek (U), svršek (O), král (K), eso (A) |
| Hráči | 2 (každý sám za sebe) nebo 4 (dva týmy, partneři sedí naproti sobě) |
| Barvy | nemají žádný význam, rozhoduje jen **hodnota** karty |

**Implementace:** `makeDeck()` v [js/engine.js](../js/engine.js) vytvoří karty s `id`
ve tvaru `<barva>-<hodnota>` (např. `srdce-10`, `zaludy-U`). Hráči sedí ve směru
hodinových ručiček s indexy 0…n−1 a tým je `index % 2`. Ve hře 1 × 1 je tedy každý hráč
svým vlastním týmem, ve hře 2 × 2 hrají 0 + 2 proti 1 + 3. Člověk je vždy hráč 0.

### 2. Rozdání

Balíček se zamíchá a každý hráč dostane **4 karty**. Zbytek je **talon** (24 karet
ve hře 1 × 1, 16 ve hře 2 × 2). Při další hře vynáší první další hráč v pořadí.

**Implementace:** `newGame({ numPlayers, firstLeader })`, míchání Fisher–Yates
v `shuffle()`. Rotaci vynášejícího mezi hrami řeší [js/ui.js](../js/ui.js).

### 3. Hra štychu

1. Vynášející zahraje **libovolnou kartu**. Její hodnota je **hodnota štychu**.
2. Ostatní po směru hodinových ručiček přidají každý jednu **libovolnou** kartu.
   Není povinnost přiznávat barvu ani přebíjet.
3. Karta štych **přebije**, pokud má **stejnou hodnotu** jako vynesená karta, nebo
   je to **sedma** (sedma funguje jako žolík).
4. Štych drží ten, kdo jako **poslední** přebil (na začátku vynášející).

**Implementace:** `beats(card, leadRank)` vrací `rank === '7' || rank === leadRank`.
`playCard()` po každé kartě aktualizuje `trick.holder`. `legalMoves()` hráčům, kteří
nevynášejí, povolí celou ruku.

### 4. Otočení kola (pokračování)

Když všichni zahráli po jedné kartě:

- Pokud má vynášející v ruce další kartu **hodnoty štychu nebo sedmu**, smí
  **otočit kolo**. Zahraje takovou kartu (jinou nesmí) a všichni ostatní znovu přidají
  po jedné libovolné kartě. Kolo lze otáčet **opakovaně**, dokud má vynášející
  takovou kartu.
- Kolo jde otočit **bez ohledu na to, kdo štych právě drží**. Když ho drží soupeř,
  vynášející se ho snaží získat zpět. Když ho drží jeho strana, vytahuje ze soupeřů
  další karty, třeba esa a desítky.
- Když vynášející žádnou takovou kartu nemá nebo se rozhodne nepokračovat, štych končí
  a bere ho jeho aktuální držitel.

**Implementace:** po dokončení kola `playCard()` zavolá `canContinue()`, které jen
zjistí, zda má vynášející kartu, pro kterou platí `beats()`. Když ano, hra přejde do
fáze `decide` a vynášející volá `decide(state, true|false)`. Při pokračování se zvýší
`trick.round` a `legalMoves()` vynášejícímu povolí jen karty, pro které platí
`beats()`. V UI se karty, kterými lze otočit kolo, zvýrazní a kliknutím na ni se kolo
rovnou otočí i zahraje (`decide(true)` a `playCard()` v jednom kroku). Tlačítko *Nechat
štych* (nebo *Vzít štych*, když štych drží vaše strana) kolo ukončí.

### 5. Po štychu a dobírání

Vítěz štychu si vezme všechny karty štychu. Pak si všichni **doberou z talonu do
4 karet**: první vítěz štychu, pak ostatní po směru. Vítěz vynáší další štych. Když je
talon prázdný, hraje se dál bez dobírání, dokud nedojdou karty.

Protože v každém kole zahraje každý hráč stejný počet karet, mají všichni hráči vždy
stejně karet a talon se vždy rozdělí beze zbytku.

**Implementace:** `collectTrick()`.

### 6. Bodování

| Co | Bodů |
|---|---|
| každé **eso** | 10 |
| každá **desítka** | 10 |
| **poslední štych** hry | 10 |
| ostatní karty | 0 |

Celkem je ve hře **90 bodů**. Vyhrává strana, která má víc bodů. Remíza není možná,
protože body jsou po desítkách a 45 : 45 nastat nemůže.

Do skóre zápasu se hra počítá takto:

| Výsledek | Bodů do zápasu |
|---|---|
| obyčejná výhra | 1 |
| poražení nezískali **žádné body** | 2 |
| poražení neudělali **ani jeden štych** | 3 |

**Implementace:** `cardPoints()`, `teamPoints()` (přičte bonus za poslední štych)
a `computeResult()` vrací `{ points, winner, stake }`.

> Poznámka k variantám: v některých hospodách se hraje bez otáčení kola, s jiným
> bodováním výhry („bez bodů“ / „bez štychu“), nebo smí otočit kolo jen ten, kdo štych
> prohrává. Tato hra se drží nejběžnější varianty popsané výše.

### 7. Umělá inteligence

Počítačový hráč ([js/ai.js](../js/ai.js)) je heuristický a vidí jen veřejné informace:
svou ruku, karty na stole a karty z již sebraných štychů.

- **Výnos:** preferuje hodnoty, kterých má víc kusů nebo které už z velké části
  vyšly (soupeř je nemůže přebít jinak než sedmou). Nerad vynáší sedmy a esa či
  desítky, pokud je nemá zdvojené.
- **Odpověď, když štych drží soupeř:** přebije kartou stejné hodnoty, pokud ji má
  (a raději bodovou). Sedmu použije jen tehdy, když jsou ve štychu body, nebo mu
  zbývají jen bodové karty. Jinak odhodí nejlevnější kartu, tedy nikoli eso, desítku
  ani sedmu.
- **„Mazání“:** když štych drží partner, hraje jako poslední a nikdo ho už nemůže
  přebít, přidá do štychu eso nebo desítku.
- **Otočení kola:** když štych drží soupeř, pokračuje kartou stejné hodnoty, nebo
  sedmou, jsou-li ve štychu body. Když štych drží jeho strana, otočí kolo jen kartou
  stejné hodnoty, nikdy sedmou. V simulacích to vyhrává zhruba 52 % her proti AI, která
  vlastní štych nikdy neotáčí, a 53–58 % proti AI, která k tomu používá i sedmy.
- Ke konci hry počítá s bonusem 10 bodů za poslední štych.

Testy v [tests/engine.test.js](../tests/engine.test.js) ověřují, že AI vyhrává proti
náhodnému hráči výrazně přes 60 % her (aktuálně asi 91 % ve hře 1 × 1 a 82 % ve hře 2 × 2).

### 8. Průběh hry v UI

Stav hry má fáze `play` → (`decide`) → `collect` → `play` … → `over`.
[js/ui.js](../js/ui.js) po každé změně stav znovu vykreslí. Tahy AI plánuje přes
`setTimeout` s krátkou prodlevou. Po dokončení štychu ho chvíli nechá na stole se
zvýrazněným vítězem. Žetonem (`S.token`) ruší naplánované tahy, když se mezitím začne
nová hra.

---

## English

### 1. Cards and players

| | |
|---|---|
| Deck | 32 cards: 4 suits × ranks 7, 8, 9, 10, Unter/Jack (U), Ober/Queen (O), King (K), Ace (A) |
| Players | 2 (each on their own) or 4 (two teams, partners sit opposite) |
| Suits | irrelevant: only the **rank** matters |

**Implementation:** `makeDeck()` in [js/engine.js](../js/engine.js) creates cards with
an `id` of the form `<suit>-<rank>` (e.g. `srdce-10`, `zaludy-U`; suit ids are Czech:
srdce = hearts, listy = leaves/spades, kule = bells/diamonds, žaludy = acorns/clubs).
Players sit clockwise with indices 0…n−1, and their team is `index % 2`. So in 1 vs 1
each player is their own team, and in 2 vs 2 it is 0 + 2 against 1 + 3. The human is
always player 0.

### 2. Dealing

The deck is shuffled and everyone gets **4 cards**. The rest forms the **stock**
(24 cards in 1 vs 1, 16 in 2 vs 2). The first lead rotates between games.

**Implementation:** `newGame({ numPlayers, firstLeader })`, with a Fisher–Yates
`shuffle()`. [js/ui.js](../js/ui.js) handles the rotation between games.

### 3. Playing a trick

1. The leader plays **any card**. Its rank is the **trick rank**.
2. The others, clockwise, each add **any** card. There is no obligation to follow
   suit or to beat.
3. A card **beats** the trick if it has the **same rank** as the led card or is a
   **seven** (sevens are wild).
4. The trick is held by whoever beat it **last** (initially the leader).

**Implementation:** `beats(card, leadRank)` returns `rank === '7' || rank === leadRank`.
`playCard()` updates `trick.holder` after each card. `legalMoves()` gives non-leading
players their whole hand.

### 4. Turning the round ("otočit kolo")

When everyone has played one card:

- If the leader still has a card of the **trick rank or a seven**, they may **turn the
  round** (continue). They must play such a card, and everyone else adds one more card
  of their choice. The round can be turned **again and again** as long as the leader
  still has such a card.
- This is allowed **no matter who currently holds the trick**. If the opponents hold
  it, the leader tries to win it back. If the leader's side holds it, continuing pulls
  more cards, possibly aces and tens, out of the opponents' hands.
- If the leader has no such card, or declines, the trick ends and goes to its current
  holder.

**Implementation:** after a full round, `playCard()` calls `canContinue()`, which only
checks whether the leader has a card for which `beats()` is true. If so, the game
enters the `decide` phase and the leader calls `decide(state, true|false)`. Continuing
increments `trick.round`, and `legalMoves()` then restricts the leader to beating
cards. In the UI the cards that can turn the round are highlighted, and clicking one
turns the round and plays it in a single step (`decide(true)` followed by
`playCard()`). The *Give up the trick* button (*Take the trick* when your side holds
it) ends the round instead.

### 5. After the trick: drawing

The trick winner takes all its cards. Then everyone **draws from the stock back up to
4 cards**: the winner first, then clockwise. The winner leads the next trick. Once the
stock is empty, play continues without drawing until all hands are empty.

Each round has every player play the same number of cards, so hands always stay the
same size and the stock always divides evenly.

**Implementation:** `collectTrick()`.

### 6. Scoring

| What | Points |
|---|---|
| each **ace** | 10 |
| each **ten** | 10 |
| the **last trick** | 10 |
| other cards | 0 |

There are **90 points** in total, and the side with more points wins. A tie is
impossible, because points come in tens and 45 : 45 cannot happen.

The game counts towards the match score as follows:

| Result | Match points |
|---|---|
| simple win | 1 |
| losers scored **no points** | 2 |
| losers took **no trick** | 3 |

**Implementation:** `cardPoints()`, `teamPoints()` (adds the last-trick bonus), and
`computeResult()`, which returns `{ points, winner, stake }`.

> Variants: some groups play without turning the round, score wins differently, or
> only let a leader who is losing the trick continue. This game uses the common variant
> described above.

### 7. Computer player

The AI ([js/ai.js](../js/ai.js)) is heuristic and uses only public information: its own
hand, the cards on the table, and cards already taken in earlier tricks.

- **Leading:** it prefers ranks it holds several copies of, or ranks that have mostly
  been played already (so opponents can only beat them with a seven). It avoids
  leading sevens, and avoids aces or tens unless it holds a pair.
- **Following when the opponents hold the trick:** it beats with a same-rank card if it
  has one, preferring one with points. It spends a seven only if the trick contains
  points or it has nothing but point cards left. Otherwise it throws its cheapest card,
  never an ace, ten or seven if it can avoid it.
- **Smearing:** when its partner holds the trick, it plays last, and nobody can beat the
  trick any more, it adds an ace or ten.
- **Turning the round:** when the opponents hold the trick, it continues with a
  same-rank card, or with a seven if the trick contains points. When its own side holds
  the trick, it continues only with a same-rank card, never a seven. In simulations
  this wins about 52 % of games against an AI that never turns its own trick, and
  53–58 % against one that also spends sevens on it.
- Near the end of the game it counts the 10-point last-trick bonus.

[tests/engine.test.js](../tests/engine.test.js) checks that the AI wins clearly more
than 60 % of games against a random player (currently about 91 % in 1 vs 1 and 82 % in
2 vs 2).

### 8. Game flow in the UI

The state goes through the phases `play` → (`decide`) → `collect` → `play` … → `over`.
[js/ui.js](../js/ui.js) re-renders after every change and schedules AI moves with a
short `setTimeout`. A finished trick stays on the table briefly with the winner
highlighted. A token (`S.token`) cancels pending AI moves when a new game starts.
