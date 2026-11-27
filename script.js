// Next Station London helper: shuffles the 11 Station cards and ends the round
// as soon as the 5th pink Underground card is drawn. 4 rounds per game.
(() => {
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
  const { ICON, artFor, ROUNDEL } = window.NSLArt;   // card artwork lives in art.js

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
    return { round: s.round, deck, drawn: s.drawn, started: s.started };
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ ...state, v: STATE_VERSION })); } catch {} };

  // A turn is one flip, except a Railroad Switch from turn 3 on, which flips the next card in the same turn.
  // takeSize is the single place that rule lives; both draw() and turns() use it.
  const takeSize = (i, turnNo) =>
    (state.deck[i].shape === 'switch' && turnNo >= SWITCH_MIN_TURN && i + 1 < state.deck.length) ? 2 : 1;

  function computeTurns() {
    const out = [];
    let i = 0;
    while (i < state.drawn) {
      const c = state.deck[i], turnNo = out.length + 1;
      const n = Math.min(takeSize(i, turnNo), state.drawn - i);
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
  function face(c, withKind = false) {
    // visible caption is decorative for screen readers; the .sr text carries kind + shape
    const cap = withKind && c.shape !== 'switch' ? `${c.kind === 'underground' ? 'Underground' : 'Street'}<br>${nameOf(c)}` : nameOf(c);
    return `${artFor(c)}<div class="cap" aria-hidden="true">${cap}</div><span class="sr">${describe(c)}</span>`;
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
      if (gameOver()) { state = fresh(1, true); splash('New game<small>Round 1</small>'); announce('New game. Round 1. Cards shuffled.'); }
      else { state = fresh(state.round + 1, true); splash(`Round ${state.round}<small>Cards reshuffled</small>`); announce(`Round ${state.round}. Cards reshuffled.`); }
      save(); render(false); return;
    }
    if (!state.deck[state.drawn]) return;
    state.drawn += takeSize(state.drawn, turns().length + 1);
    if (roundOver()) lockUntil = now + LOCK_ROUND_END_MS;
    save(); render(true);
  }

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
      `<div class="card ${x.c.kind}${mode === 'past' && i === items.length - 1 ? ' latest' : ''}">${face(x.c, true)}${x.n ? `<div class="num">${x.n}</div>` : ''}</div>`
    ).join('') || '<p>Nothing here.</p>';
    pastMode = mode;
    openOverlay($('past'), $('past-close'));
    const latest = $('past-grid').querySelector('.latest');
    if (latest) latest.scrollIntoView({ block: 'nearest' });
  }
  const openPast = () => openCards('past');
  const openRemaining = () => openCards('left');
  function closePast() { closeOverlay($('past')); }

  function render(animate) {
    const card = $('card'), pile = $('pile');
    const last = state.drawn > 0 ? state.deck[state.drawn - 1] : null;
    const over = roundOver();
    const t = turns(), lastTurn = t[t.length - 1];
    // The switch stays behind its follow-up card for that turn only; on the next draw both go to the pile.
    const heldCard = lastTurn && lastTurn.sw === 'active' && lastTurn.cards.length === 2 ? lastTurn.cards[0] : null;
    const held = $('held'), wasHidden = held.hidden;
    held.hidden = !heldCard;
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
      card.innerHTML = `<div class="back-top">${ROUNDEL}</div><div class="back-bottom">
        <div class="back-title">${state.started ? `Round ${state.round}` : 'Start the journey'}</div>
        <div class="back-sub">Tap or press <kbd>Enter</kbd>${state.started ? ' to draw' : ''}</div></div>`;
    } else {
      card.classList.add(last.kind);
      card.innerHTML = face(last) + (over ? '<div class="sash">Last card</div>' : '');
      if (over) card.classList.add('final');
      if (animate) { void card.offsetWidth; card.classList.add('dealt'); }
    }

    // Pile of already-used cards (most recent on top), scattered a little and sinking lower the older they are.
    // Each discard keeps a fixed spot (set by its order and its deck position), so nothing moves when more are added.
    const used = t.slice(0, -1).flatMap(x => x.cards);
    pile.innerHTML = used.map((c, n) => {
      const k = state.deck.indexOf(c);
      const rot = ((k * 37 + 5) % 19) - 9, dx = ((k * 53 + 11) % 41) - 20;
      return `<div class="card small ${c.kind}" style="z-index:${n + 1};--n:${n};--dx:${dx}px;--rot:${rot}deg">${face(c)}</div>`;
    }).join('');

    const lines = [];
    if (lastTurn && lastTurn.sw === 'active') lines.push('Railroad Switch: build from any station on your line');
    if (lastTurn && lastTurn.sw === 'ignored') lines.push('Railroad Switch ignored (first two turns)');
    const tag = $('last-tag');
    tag.classList.toggle('off', !lines.length);
    tag.innerHTML = lines.join('<br>');

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
    if (!fsRequest) { const hint = $('hint-fs'); if (hint) hint.hidden = true; }
    $('card').addEventListener('click', draw);
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
      if (k === 'enter' || k === ' ') {
        if (e.target.closest && e.target.closest('button')) return; // let a focused button do its own thing
        e.preventDefault(); draw();
      }
      else if (k === 'p') openPast();
      else if (k === 'r') openRemaining();
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
