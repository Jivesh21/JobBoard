/* ── Data ─────────────────────────────────────────── */
const STATUS_COLORS = {
  Wishlist:  '#7b82a0',
  Applied:   '#6c8bff',
  Interview: '#f6b93b',
  Offer:     '#4ecb8a',
  Rejected:  '#ff6b6b',
};

const SAMPLE = [
  { id: uid(), company:'Google',    role:'Frontend Engineer', status:'Interview', priority:'high',   date:'2025-06-10', location:'Remote',    url:'', notes:'3 rounds done. Waiting on final decision.' },
  { id: uid(), company:'Stripe',    role:'Software Engineer', status:'Applied',   priority:'high',   date:'2025-06-14', location:'Bangalore', url:'', notes:'Applied via referral from Priya.' },
  { id: uid(), company:'Atlassian', role:'React Developer',   status:'Wishlist',  priority:'medium', date:'',           location:'Remote',    url:'', notes:'' },
  { id: uid(), company:'Razorpay',  role:'SDE-2',             status:'Offer',     priority:'high',   date:'2025-06-01', location:'Bangalore', url:'', notes:'₹28 LPA offer. Decision due June 25.' },
  { id: uid(), company:'Meesho',    role:'Frontend Dev',      status:'Rejected',  priority:'medium', date:'2025-05-28', location:'Bangalore', url:'', notes:'Rejected after technical round.' },
];

let jobs        = JSON.parse(localStorage.getItem('jt_jobs') || 'null') || SAMPLE;
let editingId   = null;
let viewingId   = null;
let currentView = 'board';

function save() { localStorage.setItem('jt_jobs', JSON.stringify(jobs)); }
function uid()  { return '_' + Math.random().toString(36).slice(2, 9); }

/* ── Filtering / Sorting ──────────────────────────── */
function getFiltered() {
  const q    = document.getElementById('searchInput').value.toLowerCase();
  const st   = document.getElementById('filterStatus').value;
  const sort = document.getElementById('sortBy').value;

  let list = jobs.filter(j => {
    const matchQ  = !q || j.company.toLowerCase().includes(q) || j.role.toLowerCase().includes(q);
    const matchSt = !st || j.status === st;
    return matchQ && matchSt;
  });

  const pOrder = { high: 0, medium: 1, low: 2 };
  list.sort((a, b) => {
    if (sort === 'date-asc')  return (a.date || '') > (b.date || '') ? 1 : -1;
    if (sort === 'date-desc') return (a.date || '') < (b.date || '') ? 1 : -1;
    if (sort === 'company')   return a.company.localeCompare(b.company);
    if (sort === 'priority')  return pOrder[a.priority] - pOrder[b.priority];
    return 0;
  });
  return list;
}

/* ── Stats Bar ────────────────────────────────────── */
function renderStats() {
  const bar = document.getElementById('statsBar');
  if (!bar) return; // statsBar no longer exists in new sidebar layout — stats now live in Analytics page
  const total      = jobs.length;
  const interviews = jobs.filter(j => j.status === 'Interview').length;
  const offers     = jobs.filter(j => j.status === 'Offer').length;
  bar.innerHTML = `
    <div class="stat-pill">Total <strong>${total}</strong></div>
    <div class="stat-pill">Interviews <strong>${interviews}</strong></div>
    <div class="stat-pill">Offers <strong>${offers}</strong></div>
  `;
}

/* ── Drag & Drop State ────────────────────────────── */
let draggedId = null;

/* ── Board ────────────────────────────────────────── */
const STATUSES = ['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected'];

function renderBoard() {
  const board = document.getElementById('boardView');
  const list  = getFiltered();
  board.innerHTML = '';

  STATUSES.forEach(status => {
    const cards = list.filter(j => j.status === status);
    const col   = document.createElement('div');
    col.className = 'column';
    col.innerHTML = `
      <div class="col-head">
        <div class="col-title">
          <div class="col-dot" style="background:${STATUS_COLORS[status]}"></div>
          ${status}
        </div>
        <span class="col-count">${cards.length}</span>
      </div>
      <div class="cards" id="col-${status}"></div>
    `;
    board.appendChild(col);

    const cardsEl = col.querySelector(`#col-${status}`);

    /* ── Drop zone events on each column ── */
    cardsEl.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      cardsEl.classList.add('drag-over');
    });
    cardsEl.addEventListener('dragleave', e => {
      // only remove if leaving the column entirely
      if (!cardsEl.contains(e.relatedTarget)) {
        cardsEl.classList.remove('drag-over');
      }
    });
    cardsEl.addEventListener('drop', e => {
      e.preventDefault();
      cardsEl.classList.remove('drag-over');
      if (!draggedId) return;

      // update job status in data
      const job = jobs.find(j => j.id === draggedId);
      if (job && job.status !== status) {
        job.status = status;
        save();
        render();
        showToast(`✓ Moved to ${status}`);
      }
      draggedId = null;
    });

    if (!cards.length) {
      cardsEl.innerHTML = `
        <div class="empty-col">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 12h6M9 8h6M9 16h3"/>
          </svg>
          Drop cards here
        </div>`;
    } else {
      cards.forEach(j => cardsEl.appendChild(makeCard(j)));
    }
  });
}

function makeCard(j) {
  const el          = document.createElement('div');
  el.className      = 'card';
  el.draggable      = true;
  el.dataset.id     = j.id;

  /* ── Drag events on each card ── */
  el.addEventListener('dragstart', e => {
    draggedId = j.id;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', j.id); // REQUIRED — without this Chrome cancels the drag silently
    // small delay so the ghost image renders before style change
    setTimeout(() => el.classList.add('drag-ghost'), 0);
  });
  el.addEventListener('dragend', () => {
    draggedId = null;
    el.classList.remove('dragging', 'drag-ghost');
    // clean up any leftover drag-over highlights
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  });

  /* ── Touch drag support (mobile) ── */
  let touchStartX, touchStartY;
  el.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    draggedId   = j.id;
    el.classList.add('dragging');
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    e.preventDefault();
    const touch = e.touches[0];
    // highlight the column we're hovering over
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll('.cards').forEach(c => c.classList.remove('drag-over'));
    const col = target?.closest('.cards');
    if (col) col.classList.add('drag-over');
  }, { passive: false });

  el.addEventListener('touchend', e => {
    el.classList.remove('dragging');
    const touch  = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const col    = target?.closest('.cards');
    document.querySelectorAll('.cards').forEach(c => c.classList.remove('drag-over'));

    if (col && draggedId) {
      // figure out which status this column belongs to
      const newStatus = col.id.replace('col-', '');
      const job = jobs.find(j => j.id === draggedId);
      if (job && job.status !== newStatus && STATUSES.includes(newStatus)) {
        job.status = newStatus;
        save();
        render();
        showToast(`✓ Moved to ${newStatus}`);
      }
    }
    draggedId = null;
  }, { passive: true });

  /* click to view (only if not dragging) */
  el.addEventListener('click', () => {
    if (!draggedId) openView(j.id);
  });

  el.innerHTML = `
    <div class="drag-handle" title="Drag to move">⠿</div>
    <div class="card-company">${esc(j.company)}</div>
    <div class="card-role">${esc(j.role)}</div>
    <div class="card-meta">
      <span class="card-date">${j.date ? fmtDate(j.date) : '—'}</span>
      <span class="priority-badge p-${j.priority}">${j.priority}</span>
    </div>
  `;
  return el;
}

/* ── Table ────────────────────────────────────────── */
function renderTable() {
  const list  = getFiltered();
  const body  = document.getElementById('tableBody');
  const empty = document.getElementById('tableEmpty');
  body.innerHTML = '';

  if (!list.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  list.forEach(j => {
    const tr      = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick    = () => openView(j.id);
    tr.innerHTML  = `
      <td><strong>${esc(j.company)}</strong></td>
      <td>${esc(j.role)}</td>
      <td>
        <span class="priority-badge"
          style="background:${STATUS_COLORS[j.status]}22;color:${STATUS_COLORS[j.status]}">
          ${j.status}
        </span>
      </td>
      <td>${j.date ? fmtDate(j.date) : '—'}</td>
      <td><span class="priority-badge p-${j.priority}">${j.priority}</span></td>
      <td>${esc(j.location || '—')}</td>
      <td>${esc(j.salary || '—')}</td>
      <td>
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:11px"
          onclick="event.stopPropagation();openEdit('${j.id}')">Edit</button>
      </td>
    `;
    body.appendChild(tr);
  });
}

/* ── Render Dispatcher ────────────────────────────── */
function render() {
  renderStats();
  if (currentView === 'board') renderBoard();
  else renderTable();
}

function setView(v) {
  currentView = v;
  document.getElementById('boardView').style.display = v === 'board' ? 'flex' : 'none';
  document.getElementById('tableView').style.display = v === 'table' ? 'block' : 'none';
  document.getElementById('btnBoard').classList.toggle('active', v === 'board');
  document.getElementById('btnTable').classList.toggle('active', v === 'table');
  render();
}

document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('filterStatus').addEventListener('change', render);
document.getElementById('sortBy').addEventListener('change', render);

/* ── Add / Edit Modal ─────────────────────────────── */
function openAdd() {
  editingId = null;
  document.getElementById('formTitle').textContent = 'Add Job';
  clearForm();
  document.getElementById('fDate').value = today();
  document.getElementById('formOverlay').classList.add('open');
}

function openEdit(id) {
  const j = jobs.find(j => j.id === id);
  if (!j) return;
  editingId = id;
  document.getElementById('formTitle').textContent  = 'Edit Job';
  document.getElementById('fCompany').value         = j.company;
  document.getElementById('fRole').value            = j.role;
  document.getElementById('fStatus').value          = j.status;
  document.getElementById('fPriority').value        = j.priority;
  document.getElementById('fDate').value            = j.date || '';
  document.getElementById('fLocation').value        = j.location || '';
  document.getElementById('fSalary').value          = j.salary || '';
  document.getElementById('fUrl').value             = j.url || '';
  document.getElementById('fInterviewDate').value   = j.interviewDate || '';
  document.getElementById('fInterviewTime').value   = j.interviewTime || '';
  document.getElementById('fNotes').value           = j.notes || '';
  closeView();
  document.getElementById('formOverlay').classList.add('open');
}

function closeForm() {
  document.getElementById('formOverlay').classList.remove('open');
}

function saveJob() {
  const company = document.getElementById('fCompany').value.trim();
  const role    = document.getElementById('fRole').value.trim();
  if (!company || !role) { showToast('⚠ Company and Role are required.'); return; }

  const data = {
    company,
    role,
    status:   document.getElementById('fStatus').value,
    priority: document.getElementById('fPriority').value,
    date:     document.getElementById('fDate').value,
    location: document.getElementById('fLocation').value.trim(),
    salary:   document.getElementById('fSalary').value.trim(),
    url:      document.getElementById('fUrl').value.trim(),
    notes:    document.getElementById('fNotes').value.trim(),
    interviewDate: document.getElementById('fInterviewDate').value,
    interviewTime: document.getElementById('fInterviewTime').value,
  };

  if (editingId) {
    const idx = jobs.findIndex(j => j.id === editingId);
    jobs[idx] = { ...jobs[idx], ...data };
    showToast('✓ Job updated.');
  } else {
    jobs.unshift({ id: uid(), ...data });
    showToast('✓ Job added.');
  }

  save(); closeForm(); render();
  checkUpcomingInterviews();
}

function clearForm() {
  ['fCompany', 'fRole', 'fDate', 'fLocation', 'fSalary', 'fUrl', 'fNotes', 'fInterviewDate', 'fInterviewTime']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('fStatus').value   = 'Applied';
  document.getElementById('fPriority').value = 'medium';
}

/* ── View Modal ───────────────────────────────────── */
function openView(id) {
  const j = jobs.find(j => j.id === id);
  if (!j) return;
  viewingId = id;

  const c = document.getElementById('viewContent');
  c.innerHTML = `
    <div class="view-company">${esc(j.company)}</div>
    <div class="view-role">${esc(j.role)}</div>
    <div class="view-grid">
      <div class="view-item">
        <label>Status</label>
        <span class="status-tag"
          style="background:${STATUS_COLORS[j.status]}22;color:${STATUS_COLORS[j.status]}">
          ${j.status}
        </span>
      </div>
      <div class="view-item">
        <label>Priority</label>
        <span class="priority-badge p-${j.priority}">${j.priority}</span>
      </div>
      <div class="view-item">
        <label>Date Applied</label>
        <div class="val">${j.date ? fmtDate(j.date) : '—'}</div>
      </div>
      <div class="view-item">
        <label>Location</label>
        <div class="val">${esc(j.location || '—')}</div>
      </div>
      <div class="view-item">
        <label>Salary</label>
        <div class="val">${esc(j.salary || '—')}</div>
      </div>
      ${j.interviewDate ? `
      <div class="view-item">
        <label>🎯 Interview Date</label>
        <div class="val">${fmtDate(j.interviewDate)}${j.interviewTime ? ' · ' + formatTime(j.interviewTime) : ''}</div>
      </div>` : ''}
    </div>
    ${j.url ? `
      <div class="field" style="margin-bottom:16px">
        <label>Job URL</label>
        <a href="${esc(j.url)}" target="_blank" style="color:var(--accent);font-size:13px">${esc(j.url)}</a>
      </div>` : ''}
    ${j.notes ? `
      <div>
        <label style="display:block;font-size:11px;font-weight:600;color:var(--muted);
          text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Notes</label>
        <div class="view-notes">${esc(j.notes)}</div>
      </div>` : ''}
  `;
  document.getElementById('viewOverlay').classList.add('open');
}

function closeView() {
  document.getElementById('viewOverlay').classList.remove('open');
}

function editCurrent() {
  if (viewingId) openEdit(viewingId);
}

function deleteJob() {
  if (!viewingId) return;
  if (!confirm('Delete this job?')) return;
  jobs = jobs.filter(j => j.id !== viewingId);
  save(); closeView(); render();
  showToast('🗑 Job deleted.');
}

/* ── Click outside to close modals ───────────────── */
document.getElementById('formOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeForm();
});
document.getElementById('viewOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeView();
});

/* ── Helpers ──────────────────────────────────────── */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[+m - 1]} ${y}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── Theme Toggle ─────────────────────────────────── */
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('jt_theme', isDark ? 'dark' : 'light');
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
}

function loadTheme() {
  const saved = localStorage.getItem('jt_theme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    const label = document.getElementById('themeLabel');
    if (label) label.textContent = 'Light Mode';
  }
}

/* ── Page Switching ───────────────────────────────── */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  const navEl = document.getElementById('nav-' + name);
  if (navEl) navEl.classList.add('active');
  if (name === 'analytics') renderAnalytics();
  if (name === 'dashboard') render();
  if (name === 'jobs') renderBoard2();
}

/* ── Export to CSV ────────────────────────────────── */
function exportCSV() {
  if (!jobs.length) { showToast('⚠ No jobs to export.'); return; }

  const headers = ['Company','Role','Status','Priority','Date Applied','Location','Salary','Interview Date','Interview Time','URL','Notes'];
  const rows = jobs.map(j => [
    j.company, j.role, j.status, j.priority, j.date || '',
    j.location || '', j.salary || '', j.interviewDate || '',
    j.interviewTime || '', j.url || '', (j.notes || '').replace(/\n/g, ' ')
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `hireflow-jobs-${today()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('✓ CSV downloaded!');
}

/* ── Clear All Data ───────────────────────────────── */
function clearAllData() {
  if (!confirm('This will permanently delete ALL your job applications. Are you sure?')) return;
  jobs = [];
  dismissedAlerts = [];
  save();
  localStorage.removeItem('jt_dismissed');
  render();
  renderAnalytics();
  checkUpcomingInterviews();
  showToast('🗑 All data cleared.');
}

/* ── Analytics ────────────────────────────────────── */
const STATUS_ICONS = {
  Wishlist:'⭐', Applied:'📤', Interview:'🎯', Offer:'🎉', Rejected:'❌'
};
const STATUS_BG = {
  Wishlist:'#f0f4ff', Applied:'#eff6ff', Interview:'#fffbeb', Offer:'#f0fdf4', Rejected:'#fef2f2'
};

function renderAnalytics() {
  const total      = jobs.length;
  const interviews = jobs.filter(j => j.status === 'Interview').length;
  const offers     = jobs.filter(j => j.status === 'Offer').length;
  const applied    = jobs.filter(j => j.status === 'Applied').length;

  // Stat cards
  const cards = document.getElementById('statCards');
  if (!cards) return;
  cards.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon blue">📄</div>
        <span class="stat-badge up">+${total} total</span>
      </div>
      <div class="stat-label">Total Applications</div>
      <div class="stat-number">${total}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon orange">📅</div>
        <span class="stat-badge ${interviews > 0 ? 'up' : 'stable'}">${interviews > 0 ? 'Active' : 'None yet'}</span>
      </div>
      <div class="stat-label">Interviews Secured</div>
      <div class="stat-number">${interviews}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon green">✅</div>
        <span class="stat-badge ${offers > 0 ? 'up' : 'stable'}">${offers > 0 ? 'Congrats!' : 'Stable'}</span>
      </div>
      <div class="stat-label">Offers Received</div>
      <div class="stat-number">${offers}</div>
    </div>
  `;

  // Bar chart
  const barChart = document.getElementById('barChart');
  if (barChart) {
    const statuses = ['Wishlist','Applied','Interview','Offer','Rejected'];
    const counts   = statuses.map(s => jobs.filter(j => j.status === s).length);
    const max      = Math.max(...counts, 1);
    barChart.innerHTML = statuses.map((s, i) => `
      <div class="bar-wrap">
        <div class="bar-val">${counts[i]}</div>
        <div class="bar" style="height:${Math.max((counts[i]/max)*120, counts[i]>0?8:4)}px;background:${STATUS_COLORS[s]}"></div>
        <div class="bar-label">${s}</div>
      </div>
    `).join('');
  }

  // Donut — conversion rate (applied → interview)
  const totalApplied = applied + interviews + offers;
  const rate = totalApplied > 0 ? Math.round((interviews + offers) / totalApplied * 100) : 0;
  const circ = 301.59;
  const offset = circ - (rate / 100) * circ;
  const donutCircle = document.getElementById('donutCircle');
  const donutPct    = document.getElementById('donutPct');
  if (donutCircle) donutCircle.style.strokeDashoffset = offset;
  if (donutPct)    donutPct.textContent = rate + '%';

  const donutStats = document.getElementById('donutStats');
  if (donutStats) donutStats.innerHTML = `
    <div class="donut-stat"><div class="donut-stat-label">Interviews</div><div class="donut-stat-num">${interviews}</div></div>
    <div class="donut-stat"><div class="donut-stat-label">Offers</div><div class="donut-stat-num">${offers}</div></div>
  `;

  // Status grid
  const grid = document.getElementById('industryGrid');
  if (grid) {
    const statuses = ['Wishlist','Applied','Interview','Offer','Rejected'];
    grid.innerHTML = statuses.map(s => {
      const count = jobs.filter(j => j.status === s).length;
      const pct   = total > 0 ? Math.round(count / total * 100) : 0;
      return `
        <div class="industry-item">
          <div class="industry-dot" style="background:${STATUS_BG[s]}">${STATUS_ICONS[s]}</div>
          <div class="industry-info">
            <div class="industry-name">${s}</div>
            <div class="industry-count">${count} Applications (${pct}%)</div>
          </div>
        </div>
      `;
    }).join('');
  }
}

/* ── Render board on Jobs page ────────────────────── */
function renderBoard2() {
  const board = document.getElementById('boardView2');
  if (!board) return;
  const list = getFiltered();
  board.innerHTML = '';
  const STATUSES = ['Wishlist','Applied','Interview','Offer','Rejected'];

  STATUSES.forEach(status => {
    const cards = list.filter(j => j.status === status);
    const col   = document.createElement('div');
    col.className = 'column';
    col.innerHTML = `
      <div class="col-head">
        <div class="col-title">
          <div class="col-dot" style="background:${STATUS_COLORS[status]}"></div>${status}
        </div>
        <span class="col-count">${cards.length}</span>
      </div>
      <div class="cards" id="col2-${status}"></div>
    `;
    board.appendChild(col);
    const cardsEl = col.querySelector(`#col2-${status}`);

    /* ── Drop zone events (same as main board) ── */
    cardsEl.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      cardsEl.classList.add('drag-over');
    });
    cardsEl.addEventListener('dragleave', e => {
      if (!cardsEl.contains(e.relatedTarget)) {
        cardsEl.classList.remove('drag-over');
      }
    });
    cardsEl.addEventListener('drop', e => {
      e.preventDefault();
      cardsEl.classList.remove('drag-over');
      if (!draggedId) return;

      const job = jobs.find(j => j.id === draggedId);
      if (job && job.status !== status) {
        job.status = status;
        save();
        render();        // keep dashboard board in sync
        renderBoard2();   // re-render this board
        renderAnalytics();
        checkUpcomingInterviews();
        showToast(`✓ Moved to ${status}`);
      }
      draggedId = null;
    });

    if (!cards.length) {
      cardsEl.innerHTML = `
        <div class="empty-col">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 12h6M9 8h6M9 16h3"/>
          </svg>
          Drop cards here
        </div>`;
    } else {
      cards.forEach(j => cardsEl.appendChild(makeCard(j))); // reuse makeCard — has full drag support
    }
  });
}

/* ── Interview Alert System ───────────────────────── */
let dismissedAlerts = JSON.parse(localStorage.getItem('jt_dismissed') || '[]');

function checkUpcomingInterviews() {
  const banner = document.getElementById('alertBanner');
  if (!banner) return;

  const now = new Date();
  const todayStr    = now.toISOString().slice(0, 10);
  const tomorrow    = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // find jobs with interview date set, not dismissed
  const alerts = [];

  jobs.forEach(j => {
    if (!j.interviewDate) return;
    if (dismissedAlerts.includes(j.id + j.interviewDate)) return;

    if (j.interviewDate === todayStr) {
      alerts.push({ job: j, type: 'today' });
    } else if (j.interviewDate === tomorrowStr) {
      alerts.push({ job: j, type: 'tomorrow' });
    }
  });

  banner.innerHTML = '';

  alerts.forEach(({ job, type }) => {
    const time = job.interviewTime ? formatTime(job.interviewTime) : '';
    const cls  = type === 'today' ? 'today' : 'tomorrow';
    const icon = type === 'today' ? '🔴' : '🟡';
    const when = type === 'today' ? 'TODAY' : 'TOMORROW';

    const div = document.createElement('div');
    div.className = `alert-banner ${cls}`;
    div.innerHTML = `
      <span class="alert-icon">${icon}</span>
      <div class="alert-text">
        <div class="alert-title">Interview ${when} with ${esc(job.company)}</div>
        <div class="alert-sub">${esc(job.role)} ${time ? '· ' + time : ''}</div>
      </div>
      <button class="alert-close" data-id="${job.id}" data-date="${job.interviewDate}">×</button>
    `;
    banner.appendChild(div);
  });

  // attach dismiss handlers
  banner.querySelectorAll('.alert-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.id + btn.dataset.date;
      dismissedAlerts.push(key);
      localStorage.setItem('jt_dismissed', JSON.stringify(dismissedAlerts));
      checkUpcomingInterviews();
    });
  });

  // fire browser notifications for "today" alerts only, once per session
  alerts.filter(a => a.type === 'today').forEach(({ job }) => {
    sendBrowserNotification(job);
  });

  // update the bell icon dropdown + red dot
  updateNotifPanel(alerts);
}

/* ── Notification Bell Panel ──────────────────────── */
function updateNotifPanel(alerts) {
  const dot  = document.getElementById('notifDot');
  const body = document.getElementById('notifPanelBody');
  if (!body) return;

  if (dot) dot.style.display = alerts.length ? 'block' : 'none';

  if (!alerts.length) {
    body.innerHTML = `<div class="notif-empty">No new notifications</div>`;
    return;
  }

  body.innerHTML = alerts.map(({ job, type }) => {
    const time = job.interviewTime ? formatTime(job.interviewTime) : '';
    const icon = type === 'today' ? '🔴' : '🟡';
    const when = type === 'today' ? 'Today' : 'Tomorrow';
    return `
      <div class="notif-item" onclick="openView('${job.id}'); toggleNotifPanel();">
        <span class="notif-item-icon">${icon}</span>
        <div>
          <div class="notif-item-title">${when}: Interview with ${esc(job.company)}</div>
          <div class="notif-item-sub">${esc(job.role)} ${time ? '· ' + time : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.toggle('open');
}

// close notif panel when clicking outside
document.addEventListener('click', (e) => {
  const wrap  = document.querySelector('.notif-wrap');
  const panel = document.getElementById('notifPanel');
  if (wrap && panel && !wrap.contains(e.target)) {
    panel.classList.remove('open');
  }
});

function formatTime(t) {
  const [h, m] = t.split(':');
  const hour = +h;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hr12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hr12}:${m} ${ampm}`;
}

/* ── Browser Notifications ────────────────────────── */
let notifiedToday = JSON.parse(sessionStorage.getItem('jt_notified') || '[]');

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('⚠ Notifications not supported in this browser.');
    return;
  }
  if (Notification.permission === 'granted') {
    showToast('✓ Notifications already enabled.');
    updateNotifPermStatus();
    return;
  }
  if (Notification.permission === 'denied') {
    showToast('⚠ Notifications blocked. Enable them in browser settings.');
    return;
  }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') showToast('✓ Notifications enabled!');
    updateNotifPermStatus();
  });
}

function updateNotifPermStatus() {
  const el = document.getElementById('notifPermStatus');
  if (!el) return;
  if (Notification.permission === 'granted') {
    el.textContent = '✓ Notifications are enabled';
  } else if (Notification.permission === 'denied') {
    el.textContent = '⚠ Notifications blocked — enable in browser settings';
  } else {
    el.textContent = 'Get alerted before your interviews';
  }
}

function sendBrowserNotification(job) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (notifiedToday.includes(job.id)) return; // already notified this session

  const time = job.interviewTime ? formatTime(job.interviewTime) : '';
  new Notification(`Interview Today: ${job.company}`, {
    body: `${job.role}${time ? ' at ' + time : ''} — good luck! 🎯`,
    icon: '💼',
    tag: job.id
  });

  notifiedToday.push(job.id);
  sessionStorage.setItem('jt_notified', JSON.stringify(notifiedToday));
}

/* ── PWA Install Prompt ───────────────────────────── */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

function showInstallButton() {
  const btn = document.getElementById('topInstallBtn');
  if (btn) btn.style.display = 'flex';
}

function hideInstallButton() {
  const btn = document.getElementById('topInstallBtn');
  if (btn) btn.style.display = 'none';
}

async function installApp() {
  // already installed / running as standalone app
  if (window.matchMedia('(display-mode: standalone)').matches) {
    showToast('✓ App is already installed!');
    return;
  }

  if (!deferredPrompt) {
    showToast('ℹ Look for the install icon ⊕ in your browser address bar');
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('✓ App installed!');
  }
  deferredPrompt = null;
  hideInstallButton();
}

window.addEventListener('appinstalled', () => {
  showToast('🎉 HireFlow installed successfully!');
  deferredPrompt = null;
  hideInstallButton();
});

/* if already running as installed app, no need to show the button at all */
if (window.matchMedia('(display-mode: standalone)').matches) {
  hideInstallButton();
}

/* register service worker for offline support */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // sw.js not found yet — fine, install prompt still works without it
    });
  });
}

/* ── Init ─────────────────────────────────────────── */
loadTheme();
render();
renderAnalytics();
showPage('analytics');
checkUpcomingInterviews();
updateNotifPermStatus();
setInterval(checkUpcomingInterviews, 5 * 60 * 1000); // re-check every 5 mins
