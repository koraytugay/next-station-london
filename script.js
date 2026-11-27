// Next Station London helper: shuffles the 11 Station cards and ends the round
// as soon as the 5th pink Underground card is drawn. 4 rounds per game.
(() => {
  const TOTAL_ROUNDS = 4;
  const PINK_TO_END = 5;
  const SHAPES = ['circle', 'triangle', 'square', 'pentagon', 'joker'];
  // 11 Station cards: 5 Underground (pink/yellow) + 6 Street (blue).
  // Pink: circle, triangle, square, pentagon, joker. Blue: the same five + Railroad Switch.
  const DECK = [
    ...SHAPES.map(s => ({ shape: s, kind: 'underground' })),
    ...SHAPES.map(s => ({ shape: s, kind: 'street' })),
    { shape: 'switch', kind: 'street' },
  ];
  const KEY = 'ns-london-helper-v3';
  const NAMES = { joker: 'Joker', switch: 'Railroad Switch' };
  const N = '#1b1750';

  const ICON = {
    circle: `<circle cx="50" cy="50" r="30" fill="${N}"/>`,
    triangle: `<polygon points="50,16 86,80 14,80" fill="${N}" stroke="${N}" stroke-width="4" stroke-linejoin="round"/>`,
    square: `<rect x="22" y="22" width="56" height="56" rx="4" fill="${N}"/>`,
    pentagon: `<polygon points="50,14 86,40 72,84 28,84 14,40" fill="${N}" stroke="${N}" stroke-width="4" stroke-linejoin="round"/>`,
    joker: `<path d="M40 8h20v32h32v20H60v32H40V60H8V40h32z" fill="#ffd23a" stroke="${N}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="22" cy="22" r="9" fill="${N}"/><polygon points="78,13 88,31 68,31" fill="${N}"/>
      <polygon points="22,69 31,76 28,87 16,87 13,76" fill="${N}"/><rect x="69" y="69" width="18" height="18" rx="2" fill="${N}"/>`,
    switch: `<rect width="100" height="100" fill="${N}"/>
      <path d="M22 86 L38 14" stroke="#e0457b" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path d="M42 86 L58 14" stroke="#ffe94a" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path d="M62 86 L78 14" stroke="#e0457b" stroke-width="9" stroke-linecap="round" fill="none"/>
      <circle cx="80" cy="78" r="13" fill="#4aa8e8" stroke="#fff" stroke-width="3"/><path d="M80 70v16M72 78h16" stroke="#fff" stroke-width="3"/>`,
  };
  const PINK = '#e0457b', YEL = '#ffe94a', SKY = '#8ccbf0', CREAM = '#fff8e6';

  // little commuter: head + body
  const fig = (x, y, c) => `<circle cx="${x}" cy="${y}" r="5" fill="${N}"/><rect x="${x - 5}" y="${y + 6}" width="10" height="20" rx="5" fill="${c}"/>`;
  const W = 'fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';
  const spokes = (cx, cy, r, n) => Array.from({ length: n }, (_, i) => { const t = i * 2 * Math.PI / n; return `<line x1="${cx}" y1="${cy}" x2="${(cx + r * Math.cos(t)).toFixed(1)}" y2="${(cy + r * Math.sin(t)).toFixed(1)}"/>`; }).join('');
  const tree = (x) => `<circle cx="${x}" cy="168" r="11" fill="#58b368"/><rect x="${x - 2}" y="176" width="4" height="10" fill="${N}"/>`;
  const bus = (x, c) => `<rect x="${x}" y="156" width="64" height="28" rx="5" fill="${c}"/><g fill="#fff"><rect x="${x + 6}" y="162" width="11" height="9" rx="1"/><rect x="${x + 21}" y="162" width="11" height="9" rx="1"/><rect x="${x + 36}" y="162" width="11" height="9" rx="1"/><rect x="${x + 51}" y="162" width="9" height="9" rx="1"/></g><circle cx="${x + 14}" cy="185" r="6" fill="${N}"/><circle cx="${x + 50}" cy="185" r="6" fill="${N}"/>`;

  const LANDMARK = {
    circle: `<g ${W}><rect x="196" y="62" width="26" height="123"/><polygon points="194,62 209,30 224,62"/><circle cx="209" cy="80" r="7"/><line x1="209" y1="30" x2="209" y2="16"/><rect x="232" y="138" width="62" height="47"/><path d="M242 138v47M254 138v47M266 138v47M278 138v47"/></g>`,
    triangle: `<g ${W}><rect x="150" y="92" width="22" height="93"/><polygon points="148,92 161,62 174,92"/><rect x="214" y="92" width="22" height="93"/><polygon points="212,92 225,62 238,92"/><rect x="172" y="122" width="42" height="63"/><circle cx="193" cy="138" r="8"/><path d="M110 185V150h40M236 150h50v35"/></g>`,
    square: `<g ${W}><polygon points="206,185 222,34 238,185"/><path d="M222 34v-14"/><path d="M150 185V120q0-52 22-52t22 52v65"/><path d="M150 100h44M150 125h44M150 150h44"/><rect x="250" y="120" width="40" height="65"/></g>`,
    pentagon: `<g ${W}><rect x="150" y="80" width="26" height="105"/><polygon points="148,80 163,52 178,80"/><rect x="240" y="80" width="26" height="105"/><polygon points="238,80 253,52 268,80"/><path d="M176 100h64M176 112h64"/><path d="M110 150h40M266 150h30"/><path d="M176 150q32 38 64 0"/></g>`,
    joker: `<g ${W}><circle cx="215" cy="100" r="66"/><circle cx="215" cy="100" r="58"/><g stroke-width="1.5">${spokes(215, 100, 58, 14)}</g><polygon points="215,100 185,185 245,185"/></g><g fill="#fff">${[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(i => { const t = i * 2 * Math.PI / 14; return `<circle cx="${(215 + 66 * Math.cos(t)).toFixed(1)}" cy="${(100 + 66 * Math.sin(t)).toFixed(1)}" r="3.5"/>`; }).join('')}</g>`,
    switch: `<g ${W}><rect x="150" y="90" width="22" height="95"/><polygon points="148,90 161,62 174,90"/><path d="M110 185v-30h40M172 130h50v55M222 120h60v65"/><circle cx="252" cy="96" r="10"/></g>`,
  };
  const balloon = `<g ${W} transform="translate(40 78)"><circle cx="0" cy="0" r="15"/><path d="M-10 12l6 14M10 12l-6 14"/><rect x="-7" y="26" width="14" height="8"/></g>`;
  const streetArt = (c) => `<rect width="200" height="280" fill="${SKY}"/><rect y="232" width="200" height="48" fill="#74bde8"/>
    <g ${W} opacity=".7"><path d="M18 40q10-8 22 0M150 30q8-6 18 0"/></g>${c.shape === 'joker' ? balloon : ''}
    <g transform="translate(-130 19.25) scale(1.15)">${LANDMARK[c.shape]}</g>
    <line x1="0" y1="232" x2="200" y2="232" stroke="#fff" stroke-width="3"/>
    <g transform="translate(0 82)">${tree(104)}${bus(120, c.shape === 'switch' ? YEL : PINK)}</g>`;

  const SCENE = {
    escalator: `<path d="M20 195L170 92v16L50 195z" fill="#fff"/><path d="M20 195L170 92" stroke="${N}" stroke-width="3" fill="none"/><path d="M40 181L180 84" stroke="${N}" stroke-width="3" fill="none"/>${fig(90, 112, N)}${fig(130, 92, PINK)}${fig(215, 130, '#4aa8e8')}${fig(255, 128, PINK)}`,
    platform: `<g fill="#d8bd14"><rect x="40" y="82" width="10" height="106"/><rect x="150" y="82" width="10" height="106"/><rect x="262" y="82" width="10" height="106"/></g>${fig(70, 120, PINK)}${fig(96, 124, '#4aa8e8')}${fig(122, 118, N)}${fig(190, 124, PINK)}${fig(216, 118, '#4aa8e8')}`,
    train: `<rect x="24" y="100" width="252" height="76" rx="20" fill="#fff" stroke="${N}" stroke-width="3"/><rect x="24" y="126" width="252" height="12" fill="${PINK}"/><g fill="${N}"><rect x="44" y="108" width="40" height="22" rx="5"/><rect x="100" y="108" width="40" height="22" rx="5"/><rect x="160" y="108" width="40" height="22" rx="5"/><rect x="216" y="108" width="40" height="22" rx="5"/></g><circle cx="70" cy="178" r="8" fill="${N}"/><circle cx="230" cy="178" r="8" fill="${N}"/>`,
  };
  const SCENE_FOR = { square: 'escalator', circle: 'platform', triangle: 'platform', pentagon: 'train', joker: 'train' };
  const undergroundArt = (c) => `<rect width="200" height="280" fill="${YEL}"/>
    <svg x="0" y="156" width="200" height="114" viewBox="20 80 240 120" preserveAspectRatio="xMidYMax meet">${SCENE[SCENE_FOR[c.shape]]}</svg>
    <rect y="270" width="200" height="10" fill="#d8bd14"/>
    <rect y="12" width="200" height="140" fill="${PINK}"/><rect y="6" width="200" height="7" fill="${N}"/><rect y="150" width="200" height="7" fill="${N}"/>`;

  // symbol in a white ring (or the switch tile)
  const badge = (c) => {
    const under = c.kind === 'underground';
    const [cx, cy, r] = under ? [100, 82, 48] : [56, 226, 36];
    if (c.shape === 'switch') {
      return `<g transform="translate(${cx - 32} ${cy - 32})"><rect width="64" height="64" rx="12" fill="${N}" stroke="#fff" stroke-width="3"/><g transform="scale(.64)">${ICON.switch.replace(/<rect[^>]*>/, '')}</g></g>`;
    }
    const k = 0.76 * 2 * r / 100;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CREAM}" stroke="${N}" stroke-width="${under ? 7 : 6}"/><g transform="translate(${cx - 50 * k} ${cy - 50 * k}) scale(${k})">${ICON[c.shape]}</g>`;
  };
  const artFor = (c) => `<svg viewBox="0 0 200 280" preserveAspectRatio="xMidYMid slice">${c.kind === 'street' ? streetArt(c) : undergroundArt(c)}${badge(c)}</svg>`;
  const ROUNDEL = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fff8e6" stroke="#1b1750" stroke-width="5"/><circle cx="50" cy="50" r="31" fill="none" stroke="#e0457b" stroke-width="12"/><rect x="12" y="41" width="76" height="18" rx="2" fill="#1b1750"/></svg>';

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
  const fresh = () => ({ round: 1, deck: shuffle(DECK), drawn: 0, started: false });
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  // A turn is one flip, except a Railroad Switch (turn 3+) which flips the next card too.
  // Switch on turn 1 or 2 is ignored (no extra flip).
  const switchActive = (turnNo) => turnNo >= 3;
  function turns() {
    const out = [];
    let i = 0;
    while (i < state.drawn) {
      const c = state.deck[i], turnNo = out.length + 1;
      if (c.shape === 'switch' && switchActive(turnNo) && i + 1 < state.drawn) { out.push({ cards: [c, state.deck[i + 1]], sw: 'active' }); i += 2; }
      else { out.push({ cards: [c], sw: c.shape === 'switch' ? (switchActive(turnNo) ? 'active' : 'ignored') : null }); i += 1; }
    }
    return out;
  }

  const undergroundDrawn = () => state.deck.slice(0, state.drawn).filter(c => c.kind === 'underground').length;
  const roundOver = () => undergroundDrawn() >= PINK_TO_END;
  const gameOver = () => roundOver() && state.round >= TOTAL_ROUNDS;

  const $ = (id) => document.getElementById(id);

  function face(c) {
    const name = NAMES[c.shape] || c.shape;
    return `${artFor(c)}<div class="cap">${name}</div>`;
  }

  function splash(html) {
    const s = $('splash');
    $('splash-text').innerHTML = html;
    s.hidden = false;
    s.style.animation = 'none'; void s.offsetWidth; s.style.animation = '';
    clearTimeout(splash.t);
    splash.t = setTimeout(() => { s.hidden = true; }, 1600);
  }

  function draw() {
    if (!$('past').hidden) return closePast();
    if (!state.started) {
      state.started = true;
      splash('Round 1<small>Mind the gap</small>');
      save(); render(false); return;
    }
    if (roundOver()) {
      if (gameOver()) { state = fresh(); state.started = true; splash('New game<small>Round 1</small>'); }
      else { state = { round: state.round + 1, deck: shuffle(DECK), drawn: 0, started: true }; splash(`Round ${state.round}<small>Cards reshuffled</small>`); }
      save(); render(false); return;
    }
    const turnNo = turns().length + 1;
    const c = state.deck[state.drawn];
    if (!c) return;
    state.drawn += (c.shape === 'switch' && switchActive(turnNo) && state.drawn + 1 < state.deck.length) ? 2 : 1;
    save(); render(true);
  }

  function undo() {
    const t = turns();
    if (t.length) { state.drawn -= t[t.length - 1].cards.length; save(); render(false); }
  }

  function newGame() {
    if (!state.started) return;
    $('confirm').hidden = false;
    $('confirm-no').focus();
  }
  function closeConfirm() { $('confirm').hidden = true; }
  function confirmNewGame() {
    closeConfirm();
    state = fresh(); save(); render(false);
  }

  function openPast() {
    $('past-grid').innerHTML = state.deck.slice(0, state.drawn).map(c => `<div class="card ${c.kind}">${face(c)}</div>`).join('')
      || '<p>Nothing drawn yet.</p>';
    $('past').hidden = false;
  }
  function closePast() { $('past').hidden = true; }

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
      held.innerHTML = artFor(heldCard) + `<div class="held-cap"><svg viewBox="0 0 100 100">${ICON.switch}</svg>Railroad Switch</div>`;
      if (animate && wasHidden) { void held.offsetWidth; held.classList.add('peek'); }
    }

    $('round').textContent = `Round ${state.round} / ${TOTAL_ROUNDS}`;
    $('count').textContent = `Turn ${t.length}`;

    card.className = 'card';
    if (!last) {
      card.classList.add('back');
      card.innerHTML = `<div class="back-top">${ROUNDEL}</div><div class="back-bottom">
        <div class="back-title">${state.started ? `Round ${state.round}` : 'Start the journey'}</div>
        <div class="back-sub">Press <kbd>Enter</kbd>${state.started ? ' to draw' : ''}</div></div>`;
    } else {
      card.classList.add(last.kind);
      card.innerHTML = face(last);
      if (animate) { void card.offsetWidth; card.classList.add('dealt'); }
    }

    // Pile of already-used cards (most recent on top), scattered a little and sinking lower the older they are.
    // Each discard keeps a fixed spot (set by its order and its deck position), so nothing moves when more are added.
    const used = t.slice(0, -1).flatMap(x => x.cards);
    pile.innerHTML = used.map((c, n) => {
      const k = state.deck.indexOf(c);
      const rot = ((k * 37 + 5) % 19) - 9, dx = ((k * 53 + 11) % 41) - 20;
      return `<div class="card small ${c.kind}" style="z-index:${n + 1};transform:translate(${dx}px, ${n * 16}px) rotate(${rot}deg)">${face(c)}</div>`;
    }).join('');

    const lines = [];
    if (lastTurn && lastTurn.sw === 'active') lines.push('Railroad Switch: build from any station on your line');
    if (lastTurn && lastTurn.sw === 'ignored') lines.push('Railroad Switch ignored (first two turns)');
    if (over) lines.push(gameOver() ? 'Final stop: draw one last section, then score' : 'Last card: draw one last section');
    const tag = $('last-tag');
    tag.classList.toggle('off', !lines.length);
    tag.innerHTML = lines.join('<br>');
    tag.classList.toggle('end', over);

    const n = undergroundDrawn();
    $('stops').innerHTML = Array.from({ length: PINK_TO_END }, (_, i) =>
      `<div class="stop${i < n ? ' on' : ''}${over && i === PINK_TO_END - 1 ? ' final' : ''}"></div>`).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const saved = load();
    state = saved && Array.isArray(saved.deck) && saved.deck.length === DECK.length ? saved : fresh();
    $('card').addEventListener('click', draw);
    document.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!$('confirm').hidden) {
        if (k === 'y') confirmNewGame();
        else if (k === 'n' || k === 'escape') closeConfirm();
        else if (k === 'arrowleft' || k === 'arrowright' || k === 'tab') { /* let focus move between buttons */ return; }
        else if (k === 'enter' || k === ' ') return; // activates the focused button (No by default)
        e.preventDefault();
        return;
      }
      if (!$('past').hidden) { closePast(); return; }
      if (k === 'enter' || k === ' ') { e.preventDefault(); draw(); }
      else if (k === 'backspace' || k === 'u') undo();
      else if (k === 'p') openPast();
      else if (k === 'f') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      } else if (k === 'n') newGame();
    });
    $('past').addEventListener('click', closePast);
    $('confirm-yes').addEventListener('click', confirmNewGame);
    $('confirm-no').addEventListener('click', closeConfirm);
    $('confirm').addEventListener('click', (e) => { if (e.target === $('confirm')) closeConfirm(); });
    render(false);
    requestAnimationFrame(() => document.body.classList.remove('loading'));
  });
})();
