// ===== DATA =====
let events = [];
let nextId = 1;

// Load data from server
async function loadData() {
  try {
    const res = await fetch('/api/events');
    if (res.ok) {
      events = await res.json();
      if (events.length > 0) {
        nextId = Math.max(...events.map(e => e.id)) + 1;
      }
    }
  } catch (err) {
    console.warn('Cannot fetch from API, running with empty local data', err);
  }
}

// Sync data to server
async function syncToServer() {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events)
    });
  } catch (err) {
    console.error('API Sync Error:', err);
  }
}

// ===== CATEGORIES & COLORS =====
const CATEGORIES = [
  { name: '劳育', icon: '🌱', bg: '#43d9ad', text: '#0a2a20' },
  { name: '美育', icon: '🎨', bg: '#ff6584', text: '#1a0a10' },
  { name: '体育', icon: '⚽', bg: '#6c63ff', text: '#fff' },
  { name: '德育', icon: '❤️', bg: '#8b5cf6', text: '#fff' },
  { name: '智育', icon: '🤖', bg: '#0ea5e9', text: '#fff' },
  { name: '其他', icon: '📌', bg: '#64748b', text: '#fff' },
];

const PALETTE = [
  '#6c63ff', '#ff6584', '#43d9ad', '#f59e0b', '#8b5cf6',
  '#0ea5e9', '#ec4899', '#10b981', '#f97316', '#06b6d4',
];

const MONTH_COLORS = [
  { gradient: 'linear-gradient(135deg,#6c63ff,#9d50ff)', glow: 'rgba(108,99,255,0.3)', badge: '#6c63ff' },
  { gradient: 'linear-gradient(135deg,#ff6584,#ff9a9e)', glow: 'rgba(255,101,132,0.3)', badge: '#ff6584' },
  { gradient: 'linear-gradient(135deg,#43d9ad,#0ea5e9)', glow: 'rgba(67,217,173,0.3)', badge: '#43d9ad' },
  { gradient: 'linear-gradient(135deg,#f59e0b,#ec4899)', glow: 'rgba(245,158,11,0.3)', badge: '#f59e0b' },
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS_CN = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

// ===== STATE =====
let editingId = null;
let selectedColor = PALETTE[0];
let selectedCat = '其他';
let currentView = 'timeline';
let filterMonth = 'all';

// ===== UTILS =====
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatDate(str) {
  const d = parseDate(str);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
function getWeekday(str) {
  return '周' + WEEKDAYS[parseDate(str).getDay()];
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getCatInfo(name) {
  return CATEGORIES.find(c => c.name === name) || CATEGORIES[CATEGORIES.length - 1];
}
function getNextUpcoming() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = events
    .filter(e => parseDate(e.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return future.length;
}
function getUniqMonths() {
  const ms = [...new Set(events.map(e => e.date.substring(0, 7)))];
  ms.sort();
  return ms;
}

// ===== STATS =====
function updateStats() {
  document.getElementById('statTotal').textContent = events.length;
  document.getElementById('statMonths').textContent = getUniqMonths().length;
  document.getElementById('statUpcoming').textContent = getNextUpcoming();
  const cats = new Set(events.map(e => e.category));
  document.getElementById('statCategories').textContent = cats.size;
}

// ===== TIMELINE VIEW =====
function buildTimeline() {
  const container = document.getElementById('monthSections');
  container.innerHTML = '';
  const today = todayStr();

  // Group by month
  const months = {};
  events.forEach(ev => {
    const mo = ev.date.substring(0, 7);
    if (!months[mo]) months[mo] = [];
    months[mo].push(ev);
  });

  const monthKeys = Object.keys(months).sort();
  let colorIdx = 0;

  monthKeys.forEach(mo => {
    if (filterMonth !== 'all' && !mo.endsWith(`-0${filterMonth}`) && !mo.endsWith(`-${filterMonth.padStart(2, '0')}`)) return;

    const [yr, mn] = mo.split('-');
    const monthEvs = months[mo].sort((a, b) => a.date.localeCompare(b.date));
    const theme = MONTH_COLORS[colorIdx % MONTH_COLORS.length];
    colorIdx++;

    const section = document.createElement('div');
    section.className = 'month-section';

    // Header
    const header = document.createElement('div');
    header.className = 'month-header';
    header.innerHTML = `
      <div class="month-badge" style="background:${theme.gradient}">${mn}月</div>
      <div class="month-title-text">${MONTHS_CN[Number(mn) - 1]} · ${yr}</div>
      <div class="month-count">${monthEvs.length} 个活动</div>
      <div class="month-divider"></div>
    `;
    section.appendChild(header);

    // Events grid
    const grid = document.createElement('div');
    grid.className = 'timeline-events';
    monthEvs.forEach((ev, idx) => {
      const card = buildEventCard(ev, idx, theme);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    container.appendChild(section);
  });
}

function buildEventCard(ev, idx, theme) {
  const cat = getCatInfo(ev.category);
  const card = document.createElement('div');
  card.className = 'event-card';
  card.style.setProperty('--card-glow', theme.glow);
  card.style.animationDelay = `${idx * 0.06}s`;
  card.style.setProperty('--accent', ev.color || cat.bg);

  // left accent bar
  card.style.cssText += `--bar-color: ${ev.color};`;
  const style = document.createElement('style');
  style.textContent = '';  // handled via CSS pseudo

  // Inject left bar color via inline pseudo-element workaround
  card.setAttribute('data-color', ev.color);

  // Build inner
  const lines = ev.content.split('\n').filter(Boolean);
  const linesHTML = lines.map(l =>
    `<span class="event-content-line">${l}</span>`
  ).join('');

  card.innerHTML = `
    <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${ev.color};border-radius:4px 0 0 4px;"></div>
    <div class="event-card-top">
      <div class="event-date-badge">
        <span class="event-date-day">${parseDate(ev.date).getDate()}</span>
        <span class="event-date-weekday">${getWeekday(ev.date)}</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px;align-items:flex-start;">
        <span class="event-category-tag" style="background:${cat.bg}22;color:${cat.bg};border:1px solid ${cat.bg}44">
          ${cat.icon} ${ev.category}
        </span>
      </div>
      <span class="event-edit-hint">✎ 点击编辑</span>
    </div>
    <div class="event-content">${linesHTML}</div>
  `;
  card.addEventListener('click', () => openModal(ev.id));
  return card;
}

// ===== GRID VIEW =====
function buildGrid() {
  const wrapper = document.getElementById('calendarGridWrapper');
  wrapper.innerHTML = '';
  const today = todayStr();

  const monthKeys = getUniqMonths();
  // Also include months from filter
  let monthsToShow = [];
  if (filterMonth !== 'all') {
    const mo = `2026-${String(filterMonth).padStart(2, '0')}`;
    monthsToShow = [mo];
  } else {
    // Show all months that have events, plus span any gaps
    const first = monthKeys[0];
    const last = monthKeys[monthKeys.length - 1];
    let [fy, fm] = first.split('-').map(Number);
    let [ly, lm] = last.split('-').map(Number);
    while (fy < ly || (fy === ly && fm <= lm)) {
      monthsToShow.push(`${fy}-${String(fm).padStart(2, '0')}`);
      fm++;
      if (fm > 12) { fm = 1; fy++; }
    }
  }

  monthsToShow.forEach((mo, mi) => {
    const [yr, mn] = mo.split('-').map(Number);
    const theme = MONTH_COLORS[mi % MONTH_COLORS.length];
    const block = document.createElement('div');
    block.className = 'calendar-month-block';

    // Month header
    const mhdr = document.createElement('div');
    mhdr.className = 'cal-month-header';
    const evCount = events.filter(e => e.date.startsWith(mo)).length;
    mhdr.innerHTML = `
      <div>
        <div class="cal-month-title" style="background:${theme.gradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent">${MONTHS_CN[mn - 1]} ${yr}</div>
        <div class="cal-month-subtitle">${evCount > 0 ? evCount + ' 个活动' : '暂无活动'}</div>
      </div>
      <div style="font-size:24px">${mn === 3 ? '🌸' : mn === 4 ? '🌼' : mn === 5 ? '☀️' : '🍃'}</div>
    `;
    block.appendChild(mhdr);

    // Weekday row
    const wdRow = document.createElement('div');
    wdRow.className = 'cal-weekday-row';
    WEEKDAYS.forEach((wd, i) => {
      const cell = document.createElement('div');
      cell.className = `cal-weekday-cell${i === 0 || i === 6 ? ' weekend' : ''}`;
      cell.textContent = wd;
      wdRow.appendChild(cell);
    });
    block.appendChild(wdRow);

    // Days grid
    const daysGrid = document.createElement('div');
    daysGrid.className = 'cal-days-grid';

    const firstDay = new Date(yr, mn - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(yr, mn, 0).getDate();
    const prevDays = new Date(yr, mn - 1, 0).getDate();

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.innerHTML = `<div class="cal-day-num">${prevDays - i}</div>`;
      daysGrid.appendChild(cell);
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yr}-${String(mn).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const dayEvs = events.filter(e => e.date === dateStr);
      const dow = new Date(yr, mn - 1, d).getDay();
      const isWeekend = dow === 0 || dow === 6;

      const cell = document.createElement('div');
      cell.className = `cal-day-cell${isToday ? ' today' : ''}${dayEvs.length > 0 ? ' has-event' : ''}${isWeekend ? ' weekend' : ''}`;

      let content = `<div class="cal-day-num">${d}</div>`;
      if (dayEvs.length > 0) {
        dayEvs.slice(0, 3).forEach(ev => {
          const firstLine = ev.content.split('\n')[0];
          content += `<span class="cal-event-chip" data-id="${ev.id}" style="background:${ev.color}">${firstLine}</span>`;
        });
        if (dayEvs.length > 3) {
          content += `<span class="cal-event-chip" style="background:rgba(255,255,255,0.12);color:#aaa">+${dayEvs.length - 3} 更多</span>`;
        }
      }

      // Add button for empty days
      if (dayEvs.length === 0) {
        cell.classList.add('add-new-day');
        content += `<span class="cal-add-dot">＋</span>`;
        cell.addEventListener('click', () => openModal(null, dateStr));
      } else {
        cell.addEventListener('click', () => {
          if (dayEvs.length === 1) openModal(dayEvs[0].id);
          else openModal(dayEvs[0].id); // open first; could extend to picker
        });
      }

      cell.innerHTML = content;
      // Chip click
      cell.querySelectorAll('.cal-event-chip[data-id]').forEach(chip => {
        chip.addEventListener('click', e => {
          e.stopPropagation();
          openModal(Number(chip.dataset.id));
        });
      });

      daysGrid.appendChild(cell);
    }

    // Trailing days
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.innerHTML = `<div class="cal-day-num">${d}</div>`;
      daysGrid.appendChild(cell);
    }

    block.appendChild(daysGrid);
    wrapper.appendChild(block);
  });
}

// ===== MODAL =====
function openModal(id, prefillDate = null) {
  editingId = id;
  const modal = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const inputDate = document.getElementById('inputDate');
  const inputContent = document.getElementById('inputContent');
  const btnDelete = document.getElementById('btnDelete');

  if (id !== null) {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    title.textContent = '编辑活动';
    inputDate.value = ev.date;
    inputContent.value = ev.content;
    selectedColor = ev.color;
    selectedCat = ev.category;
    btnDelete.style.display = 'inline-flex';
  } else {
    title.textContent = '添加新活动';
    inputDate.value = prefillDate || todayStr();
    inputContent.value = '';
    selectedColor = PALETTE[0];
    selectedCat = '其他';
    btnDelete.style.display = 'none';
  }

  buildCategoryPicker();
  buildColorPicker();
  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null;
}

function buildCategoryPicker() {
  const picker = document.getElementById('categoryPicker');
  picker.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `cat-btn${cat.name === selectedCat ? ' selected' : ''}`;
    btn.textContent = `${cat.icon} ${cat.name}`;
    if (cat.name === selectedCat) {
      btn.style.background = cat.bg;
      btn.style.color = cat.text;
      btn.style.borderColor = cat.bg;
    }
    btn.addEventListener('click', () => {
      selectedCat = cat.name;
      // Auto-set color
      selectedColor = cat.bg;
      buildCategoryPicker();
      buildColorPicker();
    });
    picker.appendChild(btn);
  });
}

function buildColorPicker() {
  const picker = document.getElementById('colorPicker');
  picker.innerHTML = '';
  PALETTE.forEach(c => {
    const sw = document.createElement('div');
    sw.className = `color-swatch${c === selectedColor ? ' selected' : ''}`;
    sw.style.background = c;
    sw.style.boxShadow = c === selectedColor ? `0 0 12px ${c}88` : '';
    sw.addEventListener('click', () => {
      selectedColor = c;
      buildColorPicker();
    });
    picker.appendChild(sw);
  });
}

async function saveEvent() {
  const date = document.getElementById('inputDate').value;
  const content = document.getElementById('inputContent').value.trim();
  if (!date || !content) { showToast('⚠️ 请填写日期和活动内容'); return; }

  if (editingId !== null) {
    const idx = events.findIndex(e => e.id === editingId);
    if (idx >= 0) {
      events[idx] = { ...events[idx], date, content, color: selectedColor, category: selectedCat };
    }
    showToast('✅ 活动已更新');
  } else {
    events.push({ id: nextId++, date, content, color: selectedColor, category: selectedCat });
    showToast('✨ 活动已添加');
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  closeModal();
  render();
  await syncToServer();
}

async function deleteEvent() {
  if (editingId === null) return;
  if (!confirm('确定要删除这个活动吗？')) return;
  events = events.filter(e => e.id !== editingId);
  closeModal();
  showToast('🗑 活动已删除');
  render();
  await syncToServer();
}

// ===== RENDER =====
function render() {
  updateStats();
  if (currentView === 'timeline') {
    buildTimeline();
  } else {
    buildGrid();
  }
}

// ===== TOAST =====
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ===== EXPORT =====
function exportData() {
  const lines = ['日期,活动内容,分类,颜色'];
  events.forEach(ev => {
    const content = ev.content.replace(/\n/g, '；');
    lines.push(`${ev.date},"${content}",${ev.category},${ev.color}`);
  });
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `班级活动日历_${new Date().toLocaleDateString('zh').replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📁 数据已导出为 CSV');
}

// ===== PARTICLES =====
function initParticles() {
  const container = document.getElementById('bgParticles');
  const colors = ['rgba(108,99,255,0.3)', 'rgba(255,101,132,0.2)', 'rgba(67,217,173,0.2)', 'rgba(245,158,11,0.15)'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 5 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const dur = Math.random() * 20 + 15;
    const delay = Math.random() * 20;
    p.style.cssText = `width:${size}px;height:${size}px;left:${left}%;background:${color};animation-duration:${dur}s;animation-delay:-${delay}s;filter:blur(${Math.random() * 2}px)`;
    container.appendChild(p);
  }
}

// ===== EVENT LISTENERS =====
function initListeners() {
  // View toggle
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      document.getElementById(currentView === 'timeline' ? 'timelineView' : 'gridView').classList.add('active');
      render();
    });
  });

  // Month filter
  document.getElementById('monthFilter').addEventListener('change', e => {
    filterMonth = e.target.value;
    render();
  });

  // Add button
  document.getElementById('btnAddEvent').addEventListener('click', () => openModal(null));

  // Export
  document.getElementById('btnExport').addEventListener('click', exportData);

  // Modal controls
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('btnCancel').addEventListener('click', closeModal);
  document.getElementById('btnSave').addEventListener('click', saveEvent);
  document.getElementById('btnDelete').addEventListener('click', deleteEvent);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && document.getElementById('modalOverlay').classList.contains('open')) {
      e.preventDefault();
      saveEvent();
    }
  });
}

// ===== INIT =====
async function init() {
  initParticles();
  initListeners();
  await loadData();
  render();
}

document.addEventListener('DOMContentLoaded', init);
