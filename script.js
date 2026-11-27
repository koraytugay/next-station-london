// Next Station London helper: shuffles the 11 Station cards and ends the round
// as soon as the 5th pink Underground card is drawn. 4 rounds per game.
(() => {
  // If the artwork script is missing or stale the page cannot work: say so instead of staying blank.
  if (!window.NSLArt) {
    document.body.classList.remove('loading');
    const msg = document.getElementById('fatal-msg');
    if (msg) msg.textContent = 'Part of the page did not load. Check your connection and reload.';
    const box = document.getElementById('fatal'); if (box) box.hidden = false;
    document.querySelectorAll('.stage, .footer-hint').forEach((el) => { el.hidden = true; });
    return;
  }
  const TOTAL_ROUNDS = 4;
  const PINK_TO_END = 5;
  const SWITCH_MIN_TURN = 3;   // a Railroad Switch flipped on turn 1 or 2 is ignored
  const SHAPES = ['circle', 'triangle', 'square', 'pentagon', 'joker'];
  // 11 Station cards: 5 Underground (pink/yellow) + 6 Street (blue).
  // Pink: circle, triangle, square, pentagon, joker. Blue: the same five + Railroad Switch.
  const DECK = [
    ...SHAPES.map(s => ({ shape: s, kind: 'underground' })),
    ...SHAPES.map(s => ({ shape: s, kind: 'street' })),
    { shape: 'switch', kind: 'street' },
  ];
  const KEY = 'ns-london-helper';
  // Bump when the shape of the saved game changes; saves from any other version are ignored.
  const STATE_VERSION = 4;
  const NAMES = { joker: 'Joker', switch: 'Railroad Switch' };
  const THEME_KEY = 'ns-london-helper-theme';
  const THEMES = [['dusk', 'Dusk'], ['day', 'Day'], ['night', 'Night'], ['calm', 'Calm']];
  const { ICON, artFor } = window.NSLArt;   // card artwork lives in art.js

  const shuffle = (arr) => {
    const a = arr.slice();
    const r = new Uint32Array(a.length);
    crypto.getRandomValues(r);
    for (let i = a.length - 1; i > 0; i--) {
      const j = r[i] % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // A turn is one flip, except a Railroad Switch from turn 3 on, which flips the next card in the same turn.
  // takeSize is the single place that rule lives; both draw() and turns() use it.
  const takeSize = (deck, i, turnNo) =>
    (deck[i].shape === 'switch' && turnNo >= SWITCH_MIN_TURN && i + 1 < deck.length) ? 2 : 1;

  let state;
  const fresh = (round = 1, started = false) => ({ round, deck: shuffle(DECK), drawn: 0, started });
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  // Accept a saved game only if it is exactly what we could have saved; rebuild the deck from the canonical cards
  // so nothing from storage ever reaches the page as markup.
  function restore(s) {
    if (!s || typeof s !== 'object' || s.v !== STATE_VERSION || !Array.isArray(s.deck) || s.deck.length !== DECK.length) return null;
    if (!Number.isInteger(s.round) || s.round < 1 || s.round > TOTAL_ROUNDS) return null;
    if (!Number.isInteger(s.drawn) || s.drawn < 0 || s.drawn > DECK.length) return null;
    if (typeof s.started !== 'boolean' || (s.drawn > 0 && !s.started)) return null;
    const deck = [];
    for (const c of s.deck) {
      const canon = c && DECK.find(d => d.kind === c.kind && d.shape === c.shape);
      if (!canon || deck.includes(canon)) return null;
      deck.push(canon);
    }
    if (!possibleDrawCounts(deck).includes(s.drawn)) return null;
    return { round: s.round, deck, drawn: s.drawn, started: s.started };
  }
  // Replays the rules over a deck: every `drawn` value a real game can reach, i.e. each turn boundary up to and
  // including the card that ends the round (a Railroad Switch and its follow-up are never split, nothing is drawn after).
  function possibleDrawCounts(deck) {
    const counts = [0];
    let i = 0, turnNo = 1, pink = 0;
    while (i < deck.length && pink < PINK_TO_END) {
      const n = takeSize(deck, i, turnNo);
      for (let k = 0; k < n; k++) if (deck[i + k].kind === 'underground') pink++;
      i += n; turnNo++;
      counts.push(i);
    }
    return counts;
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ ...state, v: STATE_VERSION })); } catch {} };

  function computeTurns() {
    const out = [];
    let i = 0;
    while (i < state.drawn) {
      const c = state.deck[i], turnNo = out.length + 1;
      const n = Math.min(takeSize(state.deck, i, turnNo), state.drawn - i);
      const sw = c.shape !== 'switch' ? null : (turnNo >= SWITCH_MIN_TURN ? 'active' : 'ignored');
      out.push({ cards: state.deck.slice(i, i + n), sw });
      i += n;
    }
    return out;
  }
  // Recomputed only when the deck or the number of drawn cards changes.
  let turnsCache = { deck: null, drawn: -1, value: [] };
  function turns() {
    if (turnsCache.deck !== state.deck || turnsCache.drawn !== state.drawn) {
      turnsCache = { deck: state.deck, drawn: state.drawn, value: computeTurns() };
    }
    return turnsCache.value;
  }

  const undergroundDrawn = () => state.deck.slice(0, state.drawn).filter(c => c.kind === 'underground').length;
  const roundOver = () => undergroundDrawn() >= PINK_TO_END;
  const gameOver = () => roundOver() && state.round >= TOTAL_ROUNDS;

  const $ = (id) => document.getElementById(id);

  const nameOf = (c) => NAMES[c.shape] || c.shape;
  const describe = (c) => c.shape === 'switch' ? 'Railroad Switch' : `${c.kind === 'underground' ? 'Underground' : 'Street'} ${nameOf(c)}`;
  // The artwork says what the card is; the hidden .sr text gives screen readers its kind and shape.
  function face(c) {
    return `${artFor(c)}<span class="sr">${describe(c)}</span>`;
  }
  // One polite announcement per action (cleared first so repeats are still read out).
  function announce(msg) {
    const el = $('sr-status');
    el.textContent = '';
    setTimeout(() => { el.textContent = msg; }, 30);
  }

  function splash(html) {
    const s = $('splash');
    $('splash-text').innerHTML = html;
    s.hidden = false;
    s.style.animation = 'none'; void s.offsetWidth; s.style.animation = '';
    clearTimeout(splash.t);
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--splash-ms')) || 1600; // same value drives the CSS animation
    splash.t = setTimeout(() => { s.hidden = true; }, ms);
  }

  // Guard against accidental double taps: a short pause after every draw, and a longer one after the card that
  // ends a round, so a stray second tap cannot reshuffle straight past it.
  let lockUntil = 0;
  const LOCK_MS = 350, LOCK_ROUND_END_MS = 900;
  function draw() {
    if (!$('past').hidden) return closePast();
    const now = performance.now();
    if (now < lockUntil) return;
    lockUntil = now + LOCK_MS;
    keepAwake();
    if (!state.started) {
      state.started = true;
      splash('Round 1<small>Mind the gap</small>'); announce('Round 1. Mind the gap. Draw the first card.');
      save(); render(false); return;
    }
    if (roundOver()) {
      const sh = captureShuffle();
      if (gameOver()) { state = fresh(1, true); splash('New game<small>Round 1</small>'); announce('New game. Round 1. Cards shuffled.'); }
      else { state = fresh(state.round + 1, true); splash(`Round ${state.round}<small>Cards reshuffled</small>`); announce(`Round ${state.round}. Cards reshuffled.`); }
      save(); render(false);
      if (sh) { playShuffle(sh); lockUntil = now + SHUFFLE_MS + 500; }
      return;
    }
    if (!state.deck[state.drawn]) return;
    if (!$('table').hidden) closeTable();
    state.drawn += takeSize(state.deck, state.drawn, turns().length + 1);
    if (roundOver()) lockUntil = now + LOCK_ROUND_END_MS;
    save(); render(true);
  }

  // Themes: a single button (or T) cycles through them; the choice is remembered.
  let themeIdx = 0;
  function applyTheme(idx, say) {
    themeIdx = idx;
    const [id, name] = THEMES[idx];
    document.documentElement.setAttribute('data-theme', id);
    $('btn-theme').setAttribute('aria-label', `Change theme. Current: ${name}`);
    $('btn-theme').title = `Theme: ${name}`;
    try { localStorage.setItem(THEME_KEY, id); } catch { /* ignore */ }
    if (say) announce(`Theme: ${name}`);
  }
  const cycleTheme = () => applyTheme((themeIdx + 1) % THEMES.length, true);

  // Fullscreen: not available everywhere (iPhone Safari has none), may be prefixed, and the promise can reject.
  const fsEl = document.documentElement;
  const fsRequest = fsEl.requestFullscreen || fsEl.webkitRequestFullscreen;
  const fsExit = document.exitFullscreen || document.webkitExitFullscreen;
  function toggleFullscreen() {
    if (!fsRequest) return;
    try {
      const on = document.fullscreenElement || document.webkitFullscreenElement;
      const p = on ? fsExit && fsExit.call(document) : fsRequest.call(fsEl);
      if (p && p.catch) p.catch(() => {});
    } catch { /* ignore */ }
  }

  // Keep the screen on while a game is running (the phone sits next to a paper sheet). The lock is released by the
  // browser whenever the tab is hidden, so ask again when it becomes visible. Failures are ignored.
  let wakeLock = null;
  async function keepAwake() {
    if (!('wakeLock' in navigator) || wakeLock) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch { wakeLock = null; }
  }

  // --- overlays: lock the page behind them, move focus in, give it back on close ---
  let opener = null;
  function openOverlay(el, focusEl) {
    if (el.hidden && !opener) opener = document.activeElement;
    el.hidden = false;
    $('stage').setAttribute('inert', '');
    focusEl.focus({ preventScroll: true });
  }
  function closeOverlay(el) {
    if (el.hidden) return;
    el.hidden = true;
    $('stage').removeAttribute('inert');
    const back = opener; opener = null;
    if (back && back.isConnected && back !== document.body && back.focus) back.focus({ preventScroll: true });
  }
  // keep Tab inside the open overlay
  function trapTab(e, root) {
    const f = [...root.querySelectorAll('button')];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function newGame() {
    if (!state.started) return;
    openOverlay($('confirm'), $('confirm-no'));
  }
  function closeConfirm() { closeOverlay($('confirm')); }
  function confirmNewGame() {
    closeConfirm();
    state = fresh(); save(); render(false);
  }

  // mode 'past': cards drawn this round, in order. mode 'left': cards still in the deck, in a FIXED order
  // (never the real draw order, so nothing is given away).
  let pastMode = null;
  function openCards(mode) {
    let items;   // [{c, n}] n = turn number (the two cards of a Railroad Switch turn share one number)
    if (mode === 'past') {
      items = turns().flatMap((t, i) => t.cards.map(c => ({ c, n: i + 1 })));
      $('past-title').textContent = 'Drawn this round';
      $('past-sub').textContent = items.length ? 'In the order they were drawn. The latest card is highlighted.' : '';
    } else {
      const left = state.deck.slice(state.drawn);
      const rank = (c) => DECK.findIndex(d => d.kind === c.kind && d.shape === c.shape);
      items = left.slice().sort((a, b) => rank(a) - rank(b)).map(c => ({ c }));
      const pink = left.filter(c => c.kind === 'underground').length;
      $('past-title').textContent = 'Still in the deck';
      $('past-sub').textContent = `${left.length} cards left, ${pink} Underground. Order is hidden.`;
    }
    $('past-grid').innerHTML = items.map((x, i) =>
      `<div class="card ${x.c.kind}${mode === 'past' && i === items.length - 1 ? ' latest' : ''}">${face(x.c)}${x.n ? `<div class="num">${x.n}</div>` : ''}</div>`
    ).join('') || '<p>Nothing here.</p>';
    pastMode = mode;
    openOverlay($('past'), $('past-close'));
    const latest = $('past-grid').querySelector('.latest');
    if (latest) latest.scrollIntoView({ block: 'nearest' });
  }
  // The table: laid out over the play area. Click the deck (left) for the cards still in it, the discard pile (right) for the past ones. Desktop only.
  let closingTable = 0;
  function openTable(mode) {
    const el = $('table');
    let html, title;
    if (mode === 'past') {
      const items = turns().flatMap((t, i) => t.cards.map(c => ({ c, n: i + 1 })));
      title = `${items.length} cards drawn, in order`;
      html = items.map((x, i) => `<div class="card ${x.c.kind}" style="--i:${i}">${face(x.c)}</div>`).join('');
    } else {
      const left = state.deck.slice(state.drawn);
      const rank = (c) => DECK.findIndex(d => d.kind === c.kind && d.shape === c.shape);
      title = `${left.length} cards left, ${left.filter(c => c.kind === 'underground').length} Underground. Order is hidden`;
      html = left.slice().sort((a, b) => rank(a) - rank(b)).map((c, i) => `<div class="card ${c.kind}" style="--i:${i}">${face(c)}</div>`).join('');
    }
    $('table-title').textContent = title;
    $('table-grid').innerHTML = html || '<p>Nothing here.</p>';
    el.classList.toggle('from-right', mode === 'past');
    clearTimeout(closingTable);
    el.classList.remove('closing'); el.hidden = false; void el.offsetWidth; el.classList.add('open');
  }
  function closeTable() {
    const el = $('table');
    if (el.hidden) return;
    el.classList.remove('open'); el.classList.add('closing');
    closingTable = setTimeout(() => { el.hidden = true; el.classList.remove('closing'); }, 220);
  }
  const openPast = () => openCards('past');
  const openRemaining = () => openCards('left');
  function closePast() { closeOverlay($('past')); }

  // --- draw animation (desktop, where the deck and the pile are on screen) ---
  // The card on the table slowly travels to the discard pile, and the next one is flipped over from the deck.
  const DISCARD_MS = 950, REVEAL_MS = 900, REVEAL_DELAY_MS = 260;
  const calm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let fxToken = 0;
  const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  // Look at the screen BEFORE it is redrawn: where the deck's top card, and the cards on the table, are right now.
  function captureFx() {
    const deckTop = $('deck').querySelector('.card');
    if (calm.matches || !deckTop || !deckTop.offsetWidth) return null;
    const grab = (el) => {
      const r = el.getBoundingClientRect(), c = centre(r);
      const node = el.cloneNode(true);
      node.className = el.className.split(' ').filter(x => !['held', 'peek', 'dealt', 'back'].includes(x)).join(' ');
      return { node, cx: c.x, cy: c.y, w: el.offsetWidth, h: el.offsetHeight };
    };
    const src = [];
    if (!$('held').hidden) src.push(grab($('held')));
    if (!$('card').classList.contains('back')) src.push(grab($('card')));
    const d = deckTop.getBoundingClientRect();
    return { deck: { ...centre(d), w: deckTop.offsetWidth }, oldPile: $('pile').children.length, src };
  }
  function fly(node, w, h, cx, cy) {
    node.style.cssText = `position:fixed;left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;margin:0;z-index:50;pointer-events:none;transform-origin:50% 50%;`;
    document.body.appendChild(node);
    return node;
  }
  function playFx(fx, last) {
    const token = ++fxToken, pile = $('pile'), card = $('card');
    const targets = [...pile.children].slice(-fx.src.length || undefined);
    // 1. the cards on the table go to the pile, slowly
    if (fx.src.length && pile.children.length - fx.oldPile >= fx.src.length) {
      fx.src.forEach((s, i) => {
        const t = targets[i], tc = centre(t.getBoundingClientRect());
        const rot = parseFloat(t.style.getPropertyValue('--rot')) || 0, k = t.offsetWidth / s.w;
        t.style.visibility = 'hidden';
        const el = fly(s.node, s.w, s.h, s.cx, s.cy);
        el.animate([{ transform: 'none' }, { transform: `translate(${tc.x - s.cx}px, ${tc.y - s.cy}px) rotate(${rot}deg) scale(${k})` }],
          { duration: DISCARD_MS, delay: i * 120, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'both' }).finished
          .catch(() => {}).then(() => { el.remove(); t.style.visibility = ''; });
      });
    }
    // 2. the next card is turned over on the deck and slides to the table
    if (last) {
      const r = card.getBoundingClientRect(), c = centre(r), w = card.offsetWidth, h = card.offsetHeight;
      const front = card.cloneNode(true); front.className = card.className.split(' ').filter(x => x !== 'dealt').join(' ');
      front.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;margin:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;';
      const back = document.createElement('div'); back.className = 'card small back';
      back.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;margin:0;border-width:4px;border-radius:18px;transform:rotateY(180deg);backface-visibility:hidden;-webkit-backface-visibility:hidden;';
      const el = document.createElement('div'); el.append(front, back);
      fly(el, w, h, c.x, c.y); el.style.transformStyle = 'preserve-3d';
      const k = fx.deck.w / w, dx = fx.deck.x - c.x, dy = fx.deck.y - c.y;
      card.style.visibility = 'hidden';
      el.animate([
        { transform: `perspective(1400px) translate(${dx}px, ${dy}px) scale(${k}) rotateY(180deg)` },
        { transform: `perspective(1400px) translate(${dx * .35}px, ${dy * .35 - 50}px) scale(${(1 + k) / 2 + .12}) rotateY(90deg)`, offset: .45 },
        { transform: 'perspective(1400px) none' }
      ], { duration: REVEAL_MS, delay: REVEAL_DELAY_MS, easing: 'cubic-bezier(.3,.7,.25,1)', fill: 'backwards' }).finished
        .catch(() => {}).then(() => { el.remove(); if (token === fxToken) card.style.visibility = ''; });
    }
  }

  // --- end-of-round shuffle (desktop): every card on the table, in the discard pile and in the draw pile is turned face
  // down, gathered in the middle, riffled together and laid back neatly on the draw pile. ---
  const GATHER_MS = 700, STEP_MS = 380, CUTS = 4, LAY_MS = 600;   // CUTS: how many times the pile is cut and riffled
  const SHUFFLE_MS = GATHER_MS + CUTS * 2 * STEP_MS + LAY_MS;
  function captureShuffle() {
    const deckEls = [...$('deck').querySelectorAll('.card')];
    if (calm.matches || !deckEls.length || !deckEls[0].offsetWidth) return null;
    const grab = (el, face) => {
      const c = centre(el.getBoundingClientRect());
      const node = el.cloneNode(true);
      node.className = el.className.split(' ').filter(x => !['held', 'peek', 'dealt', 'latest'].includes(x)).join(' ');
      return { node, cx: c.x, cy: c.y, w: el.offsetWidth, h: el.offsetHeight, face };
    };
    const items = [...$('pile').children].map(el => grab(el, true));
    if (!$('held').hidden) items.push(grab($('held'), true));
    if (!$('card').classList.contains('back')) items.push(grab($('card'), true));
    deckEls.forEach(el => items.push(grab(el, false)));
    return { items, smallW: deckEls[0].offsetWidth };
  }
  function playShuffle(sh) {
    const deck = $('deck'), card = $('card'), token = ++fxToken;
    const slots = [...deck.querySelectorAll('.card')].map(el => centre(el.getBoundingClientRect()));
    const g = centre($('stack').getBoundingClientRect());
    if (!slots.length) return;
    deck.style.visibility = 'hidden'; card.style.visibility = 'hidden';
    const rnd = (a) => (Math.random() - .5) * a, sw = sh.smallW * .85;
    const order = sh.items.map((_, i) => i).sort(() => Math.random() - .5);   // who ends up where in the new deck
    const flyers = sh.items.map((it, i) => {
      const el = document.createElement('div');
      if (it.face) {
        it.node.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;margin:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;';
        const back = document.createElement('div'); back.className = 'card small back';
        back.style.cssText = `position:absolute;inset:0;width:100%;height:100%;margin:0;border-width:${it.w > 200 ? 4 : 3}px;border-radius:${it.w > 200 ? 18 : 12}px;transform:rotateY(180deg);backface-visibility:hidden;-webkit-backface-visibility:hidden;`;
        el.append(it.node, back);
      } else {
        it.node.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;margin:0;';
        el.append(it.node);
      }
      fly(el, it.w, it.h, it.cx, it.cy);
      if (it.face) el.style.transformStyle = 'preserve-3d';   // after fly(), which resets the inline style; without it the backface hiding does not work
      const slot = order[i] % slots.length, k = sh.smallW / it.w, side = i % 2 ? 1 : -1, ry = it.face ? 180 : 0;
      el.style.zIndex = 50 + (slots.length - slot) * 100 + (i % 100);
      const f = (x, y, r, sc, flip) => `perspective(1400px) translate(${x - it.cx}px, ${y - it.cy}px) rotate(${r}deg) scale(${sc})${it.face ? ` rotateY(${flip}deg)` : ''}`;
      // timings in ms, at the pace that felt right: gather, then CUTS cut-and-riffle rounds, then lay the stack down
      const at = (ms) => ms / SHUFFLE_MS;
      const frames = [
        { transform: f(it.cx, it.cy, 0, 1, 0), offset: 0 },
        { transform: f(g.x + rnd(14), g.y + rnd(14), rnd(14), k, ry), offset: at(GATHER_MS) }      // gathered, face down
      ];
      for (let c = 0; c < CUTS; c++) {
        const t0 = GATHER_MS + c * 2 * STEP_MS, sd = c % 2 ? -side : side;
        frames.push({ transform: f(g.x + sd * sw, g.y + rnd(20), sd * 7 + rnd(6), k, ry), offset: at(t0 + STEP_MS) });     // cut in two...
        frames.push({ transform: f(g.x + rnd(16), g.y + rnd(16), rnd(12), k, ry), offset: at(t0 + 2 * STEP_MS) });          // ...riffled together
      }
      frames.push({ transform: f(slots[slot].x, slots[slot].y, 0, k, ry), offset: 1 });                                       // laid back on the draw pile
      frames.forEach(fr => { fr.easing = 'ease-in-out'; });   // ease every move on its own, so each cut keeps the same pace
      el.animate(frames, { duration: SHUFFLE_MS, delay: Math.min(i * 10, 500), easing: 'linear', fill: 'both' });
      return el;
    });
    setTimeout(() => {
      flyers.forEach(el => el.remove());
      if (token !== fxToken) return;
      deck.style.visibility = ''; card.style.visibility = '';
      void card.offsetWidth; card.classList.add('dealt');
    }, SHUFFLE_MS + 700);
  }

  function render(animate) {
    const card = $('card'), pile = $('pile');
    const fx = animate ? captureFx() : null;
    if (!fx) card.style.visibility = '';
    const last = state.drawn > 0 ? state.deck[state.drawn - 1] : null;
    const over = roundOver();
    const t = turns(), lastTurn = t[t.length - 1];
    // The switch stays behind its follow-up card for that turn only; on the next draw both go to the pile.
    const heldCard = lastTurn && lastTurn.sw === 'active' && lastTurn.cards.length === 2 ? lastTurn.cards[0] : null;
    const held = $('held'), wasHidden = held.hidden;
    held.hidden = !heldCard;
    $('stack').classList.toggle('has-held', !!heldCard);
    if (heldCard) {
      held.className = 'card held';
      held.innerHTML = artFor(heldCard) + `<div class="held-cap"><svg aria-hidden="true" viewBox="0 0 100 100">${ICON.switch}</svg>Railroad Switch</div>`;
      if (animate && wasHidden) { void held.offsetWidth; held.classList.add('peek'); }
    }

    $('btn-new').disabled = !state.started;
    $('round').textContent = `Round ${state.round} / ${TOTAL_ROUNDS}`;
    $('count').textContent = `Turn ${t.length}`;

    card.className = 'card';
    $('stack').classList.toggle('is-final', over && !!last);
    if (!last) {
      card.classList.add('back');
      card.innerHTML = `<div class="back-bottom">
        <div class="back-title">${state.started ? `Round ${state.round}` : 'Start the journey'}</div>
        <div class="back-sub">Tap or press <kbd>Enter</kbd>${state.started ? ' to draw' : ''}</div></div>`;
    } else {
      card.classList.add(last.kind);
      card.innerHTML = face(last) + (over ? '<div class="sash">Last card</div>' : '');
      if (over) card.classList.add('final');
      if (animate && !fx) { void card.offsetWidth; card.classList.add('dealt'); }
    }

    // Pile of already-used cards (most recent on top), scattered a little and sinking lower the older they are.
    // Each discard keeps a fixed spot (set by its order and its deck position), so nothing moves when more are added.
    const used = t.slice(0, -1).flatMap(x => x.cards);
    pile.innerHTML = used.map((c, n) => {
      const k = state.deck.indexOf(c);
      // a small integer hash of the deck position, so every card gets its own tilt and offset (and the same ones every render)
      const h = (m) => { let x = Math.imul(k + 1, 0x9E3779B1) ^ Math.imul(m, 0x85EBCA6B); x = Math.imul(x ^ (x >>> 15), 0x2C1B3C6D); x ^= x >>> 12; x = Math.imul(x, 0x297A2D39); return ((x ^ (x >>> 15)) >>> 0) / 4294967296; };
      const rot = ((h(1) - .5) * 44).toFixed(1), dx = Math.round((h(2) - .5) * 64), dy = Math.round((h(3) - .5) * 24);
      return `<div class="card small ${c.kind}" style="z-index:${n + 1};--n:${n};--dx:${dx}px;--dy:${dy}px;--rot:${rot}deg">${face(c)}</div>`;
    }).join('');


    // The draw deck: a neat stack of backs, thinner as it runs out.
    const leftN = state.deck.length - state.drawn;
    $('deck').hidden = leftN <= 0;
    $('deck').innerHTML = Array.from({ length: Math.min(leftN, 6) }, (_, n) =>
      `<div class="card small back" style="z-index:${6 - n};--n:${n}"></div>`).join('');

    if (fx) playFx(fx, last);

    const n = undergroundDrawn();
    $('stops').setAttribute('aria-label', `${n} of ${PINK_TO_END} Underground cards drawn`);
    card.setAttribute('aria-label', !last ? (state.started ? `Round ${state.round}. Draw the first card` : 'Start the journey') : (over ? 'Round over. Draw to continue' : 'Draw next card'));
    if (animate && lastTurn) {
      const parts = lastTurn.cards.length === 2 ? `${describe(lastTurn.cards[0])}, then ${describe(lastTurn.cards[1])}` : describe(lastTurn.cards[0]);
      const extra = [];
      if (lastTurn.sw === 'ignored') extra.push('Railroad Switch ignored, first two turns');
      if (lastTurn.sw === 'active') extra.push('Build from any station on your line');
      if (over) extra.push(gameOver() ? 'Last card of the game' : 'Last card of the round, draw one last section');
      announce([`Turn ${t.length}`, parts, ...extra].join('. ') + '.');
    }
    $('stops').innerHTML = Array.from({ length: PINK_TO_END }, (_, i) =>
      `<div class="stop${i < n ? ' on' : ''}${over && i === PINK_TO_END - 1 ? ' final' : ''}"></div>`).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    state = restore(load()) || fresh();
    let savedTheme = null; try { savedTheme = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
    applyTheme(Math.max(0, THEMES.findIndex(([id]) => id === savedTheme)), false);
    $('btn-theme').addEventListener('click', (e) => { if (e.detail) e.currentTarget.blur(); cycleTheme(); });
    if (!fsRequest) { const hint = $('hint-fs'); if (hint) hint.hidden = true; }
    $('card').addEventListener('click', draw);
    // desktop only: the deck and the pile are hidden on small screens
    $('deck').addEventListener('click', () => openTable('left'));
    $('deck').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openTable('left'); } });
    $('pile').addEventListener('click', () => openTable('past'));
    $('table').addEventListener('click', closeTable);
    document.addEventListener('keydown', (e) => {
      // Leave browser shortcuts (Cmd/Ctrl+R, Ctrl+P, F5...) and held-down keys alone.
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const k = e.key.toLowerCase();
      if (!$('confirm').hidden) {
        // Only handle our own keys; Enter/Space on a focused button, F5 etc. keep their default behaviour.
        if (k === 'tab') trapTab(e, $('confirm'));
        else if (k === 'y') { e.preventDefault(); confirmNewGame(); }
        else if (k === 'n' || k === 'escape') { e.preventDefault(); closeConfirm(); }
        return;
      }
      if (!$('past').hidden) {
        if (k === 'tab') trapTab(e, $('past'));
        else if (k === 'escape' || k === 'enter' || k === ' ' || k === 'backspace') { e.preventDefault(); closePast(); }
        else if (k === 'p' || k === 'r') {
          const mode = k === 'p' ? 'past' : 'left';
          if (mode === pastMode) closePast(); else openCards(mode);
        }
        return;
      }
      if (k === 'escape' && !$('table').hidden) { e.preventDefault(); closeTable(); return; }
      if (k === 'enter' || k === ' ') {
        if (e.target.closest && e.target.closest('button')) return; // let a focused button do its own thing
        e.preventDefault(); draw();
      }
      else if (k === 'p') openPast();
      else if (k === 'r') openRemaining();
      else if (k === 't') cycleTheme();
      else if (k === 'f') toggleFullscreen();
      else if (k === 'n') newGame();
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.started) keepAwake(); });
    // Another tab changed the saved game: adopt it instead of overwriting it on our next move.
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY || !e.newValue) return;
      let incoming = null;
      try { incoming = restore(JSON.parse(e.newValue)); } catch { /* ignore */ }
      if (incoming) { state = incoming; render(false); }
    });
    $('past').addEventListener('click', closePast);
    $('past-close').addEventListener('click', closePast);
    // After a mouse/touch click, drop focus so Enter/Space draw again instead of re-pressing the button.
    const tool = (fn) => (e) => { if (e.detail) e.currentTarget.blur(); fn(); };
    $('btn-past').addEventListener('click', tool(openPast));
    $('btn-remaining').addEventListener('click', tool(openRemaining));
    $('btn-new').addEventListener('click', tool(newGame));
    $('confirm-yes').addEventListener('click', confirmNewGame);
    $('confirm-no').addEventListener('click', closeConfirm);
    $('confirm').addEventListener('click', (e) => { if (e.target === $('confirm')) closeConfirm(); });
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    try { render(false); }
    catch (err) { console.error(err); state = fresh(); save(); render(false); }
    finally { requestAnimationFrame(() => document.body.classList.remove('loading')); }
  });
})();
