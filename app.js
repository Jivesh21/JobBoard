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
  const bar        = document.getElementById('statsBar');
  const total      = jobs.length;
  const interviews = jobs.filter(j => j.status === 'Interview').length;
  const offers     = jobs.filter(j => j.status === 'Offer').length;
  bar.innerHTML = `
    <div class="stat-pill">Total <strong>${total}</strong></div>
    <div class="stat-pill">Interviews <strong>${interviews}</strong></div>
    <div class="stat-pill">Offers <strong>${offers}</strong></div>
  `;
}

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
    if (!cards.length) {
      cardsEl.innerHTML = `
        <div class="empty-col">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 12h6M9 8h6M9 16h3"/>
          </svg>
          No jobs here yet
        </div>`;
    } else {
      cards.forEach(j => cardsEl.appendChild(makeCard(j)));
    }
  });
}

function makeCard(j) {
  const el      = document.createElement('div');
  el.className  = 'card';
  el.onclick    = () => openView(j.id);
  el.innerHTML  = `
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
  document.getElementById('fUrl').value             = j.url || '';
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
    url:      document.getElementById('fUrl').value.trim(),
    notes:    document.getElementById('fNotes').value.trim(),
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
}

function clearForm() {
  ['fCompany', 'fRole', 'fDate', 'fLocation', 'fUrl', 'fNotes']
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

/* ── Init ─────────────────────────────────────────── */
render();
