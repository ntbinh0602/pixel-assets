import { Player } from './lib/player.js';

const $ = selector => document.querySelector(selector);
const make = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const categoryLabels = {
  moves: ['Đòn đánh', '#c6f577', '⚔'], fire: ['Lửa', '#f6a36d', '♨'], explosions: ['Vụ nổ', '#e9ba6e', '✺'], water: ['Nước', '#78b9ec', '≈'], ice: ['Băng', '#8fd8e6', '❄'], lightning: ['Sấm sét', '#e7d77b', 'ϟ'], scifi: ['Khoa học viễn tưởng', '#78dcc4', '⌘'], melee: ['Cận chiến', '#d0d4b6', '⚔'], impacts: ['Va chạm', '#e5b39a', '✧'], projectiles: ['Đạn & tên bắn', '#c5d894', '➶'], spawn: ['Xuất hiện & tan biến', '#cc9ee1', '◌'], arcane: ['Phép thuật', '#b49de9', '✦'], holy: ['Ánh sáng', '#f2dda5', '☼'], shadow: ['Bóng tối', '#ba9edd', '◐'], status: ['Trạng thái', '#d4b0d9', '◎'], nature: ['Thiên nhiên', '#a1cc7f', '♧'], weather: ['Thời tiết', '#a3bdce', '☁'], ui: ['Giao diện', '#e4bca1', '▤'], pickups: ['Vật phẩm', '#e7ca79', '◇'], transitions: ['Chuyển cảnh', '#aab3db', '◩'], critters: ['Sinh vật', '#b4d29a', '♙'],
};
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const durationText = duration => Number(duration.toFixed(2));
let toastTimeout;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').hidden = true, 2600); }
let favorites;
try { favorites = new Set(JSON.parse(localStorage.getItem('pixelfx-favorites') ?? '[]')); } catch { favorites = new Set(); }
const state = { view: 'library', cat: 'all', favorites: false, q: '', type: 'all', sort: 'default', playing: !matchMedia('(prefers-reduced-motion: reduce)').matches };
let FX = [], tiles = [], hero, heroVisible = true, detail, detailFx;
let game, gameLoading;
const palettes = { ice: ['#10273f', '#204d7d', '#368cc6', '#71d3e8', '#c7f7ff', '#ffffff'], fire: ['#2d123e', '#79215b', '#ce3978', '#ff6b90', '#ffb4ae', '#fff1d9'], mint: ['#122a24', '#1f5d45', '#3a9c69', '#7cda87', '#c6f577', '#f5ffdf'] };

function favoriteCount() { $('#favorites-count').textContent = FX.filter(fx => favorites.has(fx.id)).length; }
function setFavorite(fx, button) {
  if (favorites.has(fx.id)) favorites.delete(fx.id); else favorites.add(fx.id);
  try { localStorage.setItem('pixelfx-favorites', JSON.stringify([...favorites])); } catch { toast('Trình duyệt không cho lưu yêu thích lâu dài.'); }
  button.textContent = favorites.has(fx.id) ? '★' : '☆';
  button.setAttribute('aria-pressed', String(favorites.has(fx.id)));
  favoriteCount();
  if (state.favorites) filter();
}

function build(categories) {
  $('#all-count').textContent = $('#stat-total').textContent = FX.length;
  $('#category-count').textContent = categories.length;
  favoriteCount();
  for (const c of categories) {
    const [label, color] = categoryLabels[c.id];
    const b = make('button', 'nav-item category');
    b.dataset.category = c.id;
    b.style.setProperty('--cat-color', color);
    b.append(make('span', 'category-dot'), make('span', '', label), make('b', '', FX.filter(f => f.cat === c.id).length));
    b.addEventListener('click', () => setCategory(c.id));
    $('#categories').append(b);
  }
  const fragment = document.createDocumentFragment();
  for (const fx of FX) {
    const [label, color] = categoryLabels[fx.cat];
    const card = make('article', 'asset-card');
    card.dataset.id = fx.id;
    card.style.setProperty('--cat-color', color);
    const open = make('button', 'asset-open');
    open.setAttribute('aria-label', 'Xem ' + fx.name);
    const stage = make('div', 'asset-stage');
    const canvas = make('canvas');
    canvas.width = 1; canvas.height = 1;
    canvas.setAttribute('aria-label', fx.name + ' preview');
    stage.append(make('span', 'card-category', label), canvas);
    const caption = make('div', 'asset-caption');
    const title = make('div', 'asset-title-row');
    title.append(make('h3', '', fx.name), make('span', '', '↗'));
    const meta = make('div', 'asset-meta');
    meta.append(make('span', fx.meta.loop ? 'loop-indicator' : '', fx.meta.loop ? '↻ LOOP' : '↗ ONE-SHOT'), make('span', '', `${durationText(fx.meta.duration)}s`), make('span', '', fx.meta.size.join(' × ') + ' px'));
    caption.append(title, meta); open.append(stage, caption);
    const favorite = make('button', 'favorite-button', favorites.has(fx.id) ? '★' : '☆');
    favorite.setAttribute('aria-label', 'Lưu ' + fx.name);
    favorite.setAttribute('aria-pressed', String(favorites.has(fx.id)));
    favorite.addEventListener('click', () => setFavorite(fx, favorite));
    open.addEventListener('click', () => openDetail(fx));
    card.append(open, favorite); fragment.append(card);
    tiles.push({ fx, card, canvas, player: null, visible: false });
  }
  $('#asset-grid').append(fragment);
  const tileMap = new Map(tiles.map(tile => [tile.card, tile]));
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const tile = tileMap.get(entry.target);
      tile.visible = entry.isIntersecting;
      if (tile.visible && !tile.player) {
        tile.player = new Player(tile.canvas, tile.fx);
        tile.player.seek(.28);
      } else if (!tile.visible) tile.player = null;
    }
  }, { rootMargin: '100px' });
  for (const tile of tiles) observer.observe(tile.card);
}

function closeMenu() { $('#sidebar').classList.remove('open'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); }
async function setView(view, updateURL = true) {
  state.view = view;
  const gaming = view === 'game';
  $('.intro').hidden = $('.library').hidden = gaming;
  $('#game-view').hidden = !gaming;
  $('#game-nav').classList.toggle('active', gaming);
  $('#game-nav').setAttribute('aria-pressed', String(gaming));
  $('.breadcrumb strong').textContent = gaming ? 'Mini game' : 'Asset explorer';
  if (gaming) {
    document.querySelectorAll('[data-category], #favorites-nav').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
  }
  if (updateURL) {
    const url = new URL(location.href);
    if (gaming) url.searchParams.set('view', 'game'); else url.searchParams.delete('view');
    history.replaceState(null, '', url);
  }
  if (!gaming) { game?.activate(false); return; }
  try {
    if (!gameLoading) gameLoading = import('./game/forest.js').then(({ ForestGame }) => {
      game = new ForestGame($('#game-view'));
      $('#forest-loading').hidden = true;
      $('#forest-canvas').dataset.ready = 'true';
    });
    await gameLoading;
    if (state.view === 'game') game.activate(true);
  } catch (error) {
    console.error('Forest map initialization failed:', error);
    $('#forest-loading').textContent = 'Chưa mở được khu rừng. Hãy tải lại trang để thử lại.';
  }
}
function setCategory(cat, favoritesOnly = false) {
  void setView('library', false);
  state.cat = cat; state.favorites = favoritesOnly;
  filter(); closeMenu();
  const url = new URL(location.href);
  url.searchParams.delete('view');
  if (cat === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', cat);
  history.replaceState(null, '', url);
}
function filter() {
  let shown = 0;
  const q = normalize(state.q.trim());
  for (const t of tiles) {
    const matches = (state.cat === 'all' || t.fx.cat === state.cat) && (!state.favorites || favorites.has(t.fx.id)) && (state.type === 'all' || Boolean(t.fx.meta.loop) === (state.type === 'loop')) && (!q || t.fx.search.includes(q));
    t.card.hidden = !matches;
    if (matches) shown++;
  }
  document.querySelectorAll('[data-category]').forEach(button => { const active = !state.favorites && button.dataset.category === state.cat; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  $('#favorites-nav').classList.toggle('active', state.favorites);
  $('#favorites-nav').setAttribute('aria-pressed', String(state.favorites));
  const title = state.favorites ? 'Hiệu ứng đã lưu' : state.cat === 'all' ? 'Toàn bộ hiệu ứng' : categoryLabels[state.cat][0];
  $('#library-title').firstChild.textContent = title + ' ';
  $('#result-count').textContent = shown;
  $('#results-label').textContent = `${shown} / ${FX.length} hiệu ứng${state.q ? ` cho “${state.q}”` : ' sẵn sàng khám phá'}`;
  $('#empty-state').hidden = shown > 0;
}

function setDetailPlay(playing) {
  detail.playing = playing;
  $('#detail-play').textContent = playing ? 'Ⅱ' : '▶';
  $('#detail-play').setAttribute('aria-pressed', String(playing));
  $('#detail-play').setAttribute('aria-label', playing ? 'Tạm dừng hiệu ứng' : 'Phát hiệu ứng');
}
function updateCode() {
  const factory = detail.acted ? 'createAct' : 'createFx';
  const opts = { x: 160, y: 140, ...(detail.flip ? { flip: true } : {}), ...detail.opts };
  $('#detail-code').textContent = `import { createFrame, clearFrame, ${factory}, composite } from 'pixelfx';\nimport * as effect from 'pixelfx/fx/${detailFx.id}';\n\nconst frame = createFrame(320, 180);\nconst image = new ImageData(320, 180);\nconst fx = ${factory}(effect, ${JSON.stringify(opts)});\n\nfunction tick(dt) {\n  fx.update(dt);\n  clearFrame(frame);\n  fx.draw(frame);\n  composite(frame, image.data, null);\n  ctx.putImageData(image, 0, 0);\n}`;
}
function openDetail(fx) {
  detailFx = fx;
  $('#detail-name').textContent = fx.name;
  $('#detail-category').textContent = categoryLabels[fx.cat][0] + ' / ' + fx.id;
  $('#detail-desc').textContent = fx.meta.desc;
  $('#detail-source').href = `https://github.com/patch-gg/pixelfx/blob/main/src/fx/${fx.id}.js`;
  $('#detail-tags').replaceChildren(...fx.meta.tags.map(t => make('span', '', t)));
  const facts = [['Kích thước', fx.meta.size.join(' × ') + ' px'], ['Thời lượng', durationText(fx.meta.duration) + ' s'], ['Tốc độ khung hình', fx.meta.fps + ' FPS'], ['Chế độ', fx.meta.loop ? 'Loop' : 'One-shot']];
  $('#detail-facts').replaceChildren(...facts.flatMap(([k, v]) => [make('dt', '', k), make('dd', '', v)]));
  $('#detail-palette').value = ''; $('#detail-speed').value = '1'; $('#detail-background').value = 'grid';
  $('#detail-flip').setAttribute('aria-pressed', 'false');
  $('#detail-actor').setAttribute('aria-pressed', 'true');
  $('#detail-actor').hidden = !(fx.mod.act || fx.meta.actor);
  $('#detail-stage').classList.remove('light');
  detail = new Player($('#detail-canvas'), fx, 16 / 10);
  detail.seek(.12); setDetailPlay(state.playing); updateCode();
  $('#detail').showModal();
  $('#detail').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function wire() {
  $('#game-nav').addEventListener('click', () => { void setView('game'); closeMenu(); window.scrollTo({ top: 0 }); });
  $('[data-category="all"]').addEventListener('click', () => setCategory('all'));
  $('#favorites-nav').addEventListener('click', () => setCategory('all', true));
  $('#search').addEventListener('input', e => { state.q = e.target.value; filter(); });
  document.querySelectorAll('[data-type]').forEach(button => button.addEventListener('click', () => {
    state.type = button.dataset.type;
    document.querySelectorAll('[data-type]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    filter();
  }));
  $('#sort').addEventListener('change', e => {
    state.sort = e.target.value;
    const sorted = [...tiles].sort((a, b) => state.sort === 'az' ? a.fx.name.localeCompare(b.fx.name) : state.sort === 'duration' ? a.fx.meta.duration - b.fx.meta.duration : a.fx.index - b.fx.index);
    for (const t of sorted) $('#asset-grid').append(t.card);
  });
  const syncPlay = () => { $('#global-play').setAttribute('aria-pressed', String(state.playing)); $('#global-play').replaceChildren(document.createTextNode(state.playing ? 'Ⅱ ' : '▶ '), make('span', '', state.playing ? 'Tạm dừng' : 'Phát tất cả')); };
  syncPlay();
  $('#global-play').addEventListener('click', () => { state.playing = !state.playing; syncPlay(); });
  $('#background-toggle').addEventListener('click', e => { const on = $('#asset-grid').classList.toggle('light-preview'); e.currentTarget.setAttribute('aria-pressed', String(on)); });
  $('#reset-filters').addEventListener('click', () => { state.q = ''; state.type = 'all'; $('#search').value = ''; document.querySelectorAll('[data-type]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === 'all'))); setCategory('all'); });
  $('#hero-open').addEventListener('click', () => openDetail(FX.find(f => f.id === 'moves/fireball-throw')));
  $('#menu-toggle').addEventListener('click', () => { const open = $('#sidebar').classList.toggle('open'); $('#menu-toggle').setAttribute('aria-expanded', String(open)); });
  document.addEventListener('click', e => { if (!e.target.closest('#sidebar, #menu-toggle')) closeMenu(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && state.view === 'library' && !$('#detail').open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); $('#search').focus(); }
    if (e.key === 'Escape') closeMenu();
  });
  $('#detail-close').addEventListener('click', () => $('#detail').close());
  $('#detail').addEventListener('click', e => { if (e.target === $('#detail')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); } });
  $('#detail').addEventListener('close', () => { detail = null; detailFx = null; document.body.style.overflow = ''; });
  $('#detail-play').addEventListener('click', () => setDetailPlay(!detail.playing));
  $('#detail-restart').addEventListener('click', () => { detail.restart(); detail.render(); });
  $('#detail-speed').addEventListener('change', e => detail.speed = Number(e.target.value));
  $('#timeline').addEventListener('input', e => { setDetailPlay(false); detail.seek(Number(e.target.value) / 100); });
  $('#detail-palette').addEventListener('change', e => { detail.opts = e.target.value ? { palette: palettes[e.target.value] } : {}; detail.restart(); detail.seek(.28); updateCode(); });
  $('#detail-background').addEventListener('change', e => { $('#detail-stage').classList.toggle('light', e.target.value === 'light'); detail.setBackground(e.target.value); });
  $('#detail-flip').addEventListener('click', e => { detail.flip = !detail.flip; e.currentTarget.setAttribute('aria-pressed', String(detail.flip)); detail.restart(); detail.seek(.28); updateCode(); });
  $('#detail-actor').addEventListener('click', e => { detail.actor = !detail.actor; e.currentTarget.setAttribute('aria-pressed', String(detail.actor)); detail.layout(); detail.seek(.28); updateCode(); });
  $('#download-png').addEventListener('click', () => {
    detail.render(true);
    const link = make('a'); link.download = `${detailFx.id.replace('/', '-')}.png`; link.href = detail.canvas.toDataURL('image/png'); link.click();
    detail.dirty = true; toast('Đã tải khung hình PNG trong suốt.');
  });
}

let last = 0;
function animate(now) {
  const dt = Math.min((now - (last || now)) / 1000, .08); last = now;
  if (!document.hidden && state.view === 'library') {
    if (detail) {
      detail.tick(dt);
      const time = detail.fx.meta.loop ? detail.elapsed % detail.duration : Math.min(detail.elapsed, detail.duration);
      $('#timeline').value = time / detail.duration * 100;
      $('#time-display').value = time.toFixed(2) + 's';
    } else {
      if (hero && heroVisible) { hero.playing = state.playing; hero.tick(dt); }
      for (const tile of tiles) if (tile.visible && !tile.card.hidden && tile.player) { tile.player.playing = state.playing; tile.player.tick(dt); }
    }
  }
  requestAnimationFrame(animate);
}

async function init() {
  try {
    const { effects, categories } = await import('./pixelfx/src/fx/index.js');
    FX = Object.entries(effects).map(([id, mod], index) => {
      const meta = { fps: 30, duration: 1, loop: false, tags: [], ...mod.meta };
      const cat = id.split('/')[0];
      return { id, mod, meta, cat, index, name: meta.name, search: normalize([id, meta.name, meta.desc, ...meta.tags, categoryLabels[cat][0]].join(' ')) };
    });
    build(categories); wire();
    const cat = new URL(location.href).searchParams.get('category');
    if (categories.some(c => c.id === cat)) state.cat = cat;
    filter();
    hero = new Player($('#hero-canvas'), FX.find(f => f.id === 'moves/fireball-throw'), 16 / 9);
    hero.seek(.3);
    new IntersectionObserver(entries => heroVisible = entries[0].isIntersecting).observe($('#hero-canvas'));
    if (new URL(location.href).searchParams.get('view') === 'game') await setView('game', false);
    requestAnimationFrame(animate);
  } catch (error) {
    console.error('PixelFX initialization failed:', error);
    $('#load-error').hidden = false;
    $('#results-label').textContent = 'Không thể tải thư viện hiệu ứng';
  }
}
init();
