'use strict';

const GATEWAY = window.GATEWAY_URL || 'http://localhost:3001';
const CURRENT_YEAR = new Date().getFullYear();

// ── API helpers ──────────────────────────────────────────────────────────────
async function api(path) {
  try {
    const r = await fetch(`${GATEWAY}/api${path}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } catch (e) {
    console.warn('API error', path, e);
    return null;
  }
}

function fmt(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('fr-SN');
}

function reltime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return d.toLocaleDateString('fr-SN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CATEGORY_ICONS = {
  infrastructure: '🏗',
  sanitation:     '🚮',
  education:      '📚',
  health:         '🏥',
  administration: '🏛',
  emergency:      '🚨',
};

// ── Navigation ───────────────────────────────────────────────────────────────
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.dataset.page;
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    loadPage(page);
  });
});

// ── Page loaders ─────────────────────────────────────────────────────────────
const loaded = new Set();

function loadPage(page) {
  if (loaded.has(page)) return;
  loaded.add(page);
  if (page === 'dashboard')    loadDashboard();
  if (page === 'properties')   loadProperties();
  if (page === 'disbursements') loadDisbursements();
  if (page === 'zones')        loadZones();
}

// ── Dashboard ────────────────────────────────────────────────────────────────
let disbChart, zoneChart;

async function loadDashboard() {
  document.getElementById('stat-year-label').textContent  = CURRENT_YEAR;
  document.getElementById('stat-year-label2').textContent = CURRENT_YEAR;

  const [taxSummary, disbSummary, disburse] = await Promise.all([
    api(`/taxes/summary/${CURRENT_YEAR}`),
    api(`/disbursements/summary/${CURRENT_YEAR}`),
    api('/disbursements'),
  ]);

  if (taxSummary) {
    document.getElementById('stat-properties').textContent = fmt(taxSummary.total_properties);
    document.getElementById('stat-collected').textContent  = fmt(taxSummary.total_collected_cfa);
    const comp = taxSummary.compliance_rate != null
      ? `${(taxSummary.compliance_rate * 100).toFixed(1)}%`
      : '—';
    document.getElementById('stat-compliance').textContent = comp;
  }

  if (disbSummary) {
    document.getElementById('stat-disbursed').textContent = fmt(disbSummary.total_disbursed_cfa);

    // Disbursements doughnut
    const catLabels = Object.keys(disbSummary.by_category || {});
    const catValues = catLabels.map(k => disbSummary.by_category[k]);
    disbChart = new Chart(document.getElementById('chart-disburse'), {
      type: 'doughnut',
      data: {
        labels: catLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
        datasets: [{
          data: catValues,
          backgroundColor: ['#388bfd','#3fb950','#d29922','#f85149','#a371f7','#79c0ff'],
          borderWidth: 0,
        }],
      },
      options: {
        plugins: { legend: { labels: { color: '#8b949e', font: { size: 12 } } } },
        cutout: '65%',
      },
    });
  }

  if (taxSummary?.by_zone_class) {
    const zoneLabels = Object.keys(taxSummary.by_zone_class);
    const zoneValues = zoneLabels.map(k => taxSummary.by_zone_class[k]);
    zoneChart = new Chart(document.getElementById('chart-zones'), {
      type: 'bar',
      data: {
        labels: zoneLabels,
        datasets: [{
          label: 'CFA collected',
          data: zoneValues,
          backgroundColor: '#388bfd88',
          borderColor: '#388bfd',
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
          y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
        },
      },
    });
  }

  // Recent transactions
  if (disburse) {
    const list = document.getElementById('recent-list');
    const items = (Array.isArray(disburse) ? disburse : disburse.disbursements || []).slice(0, 8);
    if (!items.length) {
      list.innerHTML = '<div class="empty-state">No transactions yet</div>';
      return;
    }
    list.innerHTML = items.map(d => `
      <div class="tx-item">
        <span class="tx-badge disburse">Disbursement</span>
        <span class="tx-id">${d.id || '—'}</span>
        <span class="tx-desc">${d.description || d.category || '—'}</span>
        <span class="tx-time">${reltime(d.disbursement_date)}</span>
      </div>
    `).join('');
  }
}

// ── Properties ───────────────────────────────────────────────────────────────
let allProperties = [];

async function loadProperties() {
  const tbody = document.getElementById('prop-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="loading-cell"><div class="spinner"></div></td></tr>';

  // Can't list all without zone — show placeholder until user filters
  tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Enter a zone ID above to load properties, or search by building ID.</td></tr>';

  document.getElementById('prop-zone-filter').addEventListener('change', async e => {
    const h3 = e.target.value.trim();
    if (!h3) return;
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell"><div class="spinner"></div></td></tr>';
    const data = await api(`/properties/zone/${h3}`);
    if (!data) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No data returned.</td></tr>';
      return;
    }
    allProperties = Array.isArray(data) ? data : data.properties || [];
    renderPropertiesTable(allProperties);
  });

  document.getElementById('prop-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = allProperties.filter(p =>
      (p.id || '').toLowerCase().includes(q) ||
      (p.owner_name || '').toLowerCase().includes(q)
    );
    renderPropertiesTable(filtered);
  });
}

function renderPropertiesTable(rows) {
  const tbody = document.getElementById('prop-table-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No properties found.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(p => {
    const status = p.tax_status || 'none';
    const chip = `<span class="status-chip status-${status}">${status}</span>`;
    return `
      <tr>
        <td class="id-cell">${(p.id || '—').split('@')[0]}<br/><span style="font-size:10px;opacity:.5">${(p.id || '').split('@')[1] || ''}</span></td>
        <td>${p.owner_name || '—'}</td>
        <td>${p.use_type || '—'}</td>
        <td>${p.zone_class || '—'}</td>
        <td style="font-family:var(--mono)">${fmt(p.assessed_value_cfa)} CFA</td>
        <td>${chip}</td>
        <td><button class="btn-sm" onclick="openPropertyModal('${p.id}')">View</button></td>
      </tr>
    `;
  }).join('');
}

async function openPropertyModal(id) {
  const modal = document.getElementById('modal');
  const body  = document.getElementById('modal-body');
  modal.classList.remove('hidden');
  body.innerHTML = '<div class="spinner"></div>';

  const [prop, hist] = await Promise.all([
    api(`/properties/${encodeURIComponent(id)}`),
    api(`/properties/${encodeURIComponent(id)}/history`),
  ]);

  if (!prop) {
    body.innerHTML = '<div class="empty-state">Property not found.</div>';
    return;
  }

  const fields = [
    ['Owner', prop.owner_name],
    ['National ID', prop.owner_national_id],
    ['Use Type', prop.use_type],
    ['Zone Class', prop.zone_class],
    ['Floors', prop.floors],
    ['Area (m²)', fmt(prop.area_m2)],
    ['Assessed Value', `${fmt(prop.assessed_value_cfa)} CFA`],
    ['Tax Status', prop.tax_status],
    ['Registration Date', prop.registration_date ? new Date(prop.registration_date).toLocaleDateString('fr-SN') : '—'],
    ['H3 Zone', prop.h3_9],
    ['Lat / Lon', prop.lat && prop.lon ? `${prop.lat.toFixed(5)}, ${prop.lon.toFixed(5)}` : '—'],
    ['Tenure Type', prop.tenure_type],
  ];

  const histItems = Array.isArray(hist) ? hist : hist?.history || [];

  body.innerHTML = `
    <div class="prop-detail-title">${(prop.id || '').split('@')[0]}</div>
    <div class="prop-detail-id">${prop.id}</div>
    <div class="detail-grid">
      ${fields.map(([label, val]) => `
        <div class="detail-field">
          <label>${label}</label>
          <value>${val || '—'}</value>
        </div>
      `).join('')}
    </div>
    ${histItems.length ? `
      <div class="detail-section">
        <h3>History</h3>
        ${histItems.map(h => `
          <div class="history-item">
            <span class="history-time">${reltime(h.timestamp)}</span>
            <span class="history-desc">${h.tx_id ? h.tx_id.slice(0,12) + '…' : ''} — ${h.value?.action || JSON.stringify(h.value || {}).slice(0, 80)}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal').classList.add('hidden');
});
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});
window.openPropertyModal = openPropertyModal;

// ── Disbursements ─────────────────────────────────────────────────────────────
async function loadDisbursements() {
  const list = document.getElementById('disb-list');
  list.innerHTML = '<div class="spinner"></div>';

  const data = await api('/disbursements');
  if (!data) {
    list.innerHTML = '<div class="empty-state">Could not reach gateway.</div>';
    return;
  }

  let items = Array.isArray(data) ? data : data.disbursements || [];

  // Populate year filter
  const years = [...new Set(items.map(d => d.disbursement_date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const yearSel = document.getElementById('disb-year');
  years.forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; yearSel.appendChild(o); });

  function render() {
    const year = yearSel.value;
    const cat  = document.getElementById('disb-category').value;
    let rows = items;
    if (year) rows = rows.filter(d => d.disbursement_date?.startsWith(year));
    if (cat)  rows = rows.filter(d => d.category === cat);
    renderDisbursements(rows);
  }

  yearSel.addEventListener('change', render);
  document.getElementById('disb-category').addEventListener('change', render);
  renderDisbursements(items);
}

function renderDisbursements(items) {
  const list = document.getElementById('disb-list');
  if (!items.length) {
    list.innerHTML = '<div class="empty-state">No disbursements found.</div>';
    return;
  }
  list.innerHTML = items.map(d => {
    const icon = CATEGORY_ICONS[d.category] || '📋';
    const done = d.status === 'completed';
    const hashShort = d.evidence_hash ? d.evidence_hash.slice(0, 16) + '…' : null;
    return `
      <div class="disb-card">
        <div class="disb-icon">${icon}</div>
        <div class="disb-body">
          <div class="disb-title">${d.description || d.category || '—'}</div>
          <div class="disb-meta">
            <span>${d.category || '—'}</span>
            <span>${d.contractor_name || 'No contractor'}</span>
            <span>${d.disbursement_date ? new Date(d.disbursement_date).toLocaleDateString('fr-SN') : '—'}</span>
            ${d.zone_h3_9 ? `<span>Zone: ${d.zone_h3_9.slice(-10)}</span>` : ''}
          </div>
          ${hashShort ? `
            <div class="disb-hash">
              <span>Evidence:</span>
              <span title="${d.evidence_hash}">${hashShort}</span>
            </div>
          ` : ''}
        </div>
        <div class="disb-amount">
          <div class="amount">${fmt(d.amount_cfa)}</div>
          <div class="currency">CFA</div>
          <div class="disb-status ${done ? 'disb-complete' : 'disb-pending'}">${done ? 'Completed' : 'Pending'}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Zones ─────────────────────────────────────────────────────────────────────
async function loadZones() {
  const grid = document.getElementById('zones-grid');
  grid.innerHTML = '<div class="spinner"></div>';

  const data = await api('/zones');
  if (!data) {
    grid.innerHTML = '<div class="empty-state">Could not reach gateway.</div>';
    return;
  }
  const zones = Array.isArray(data) ? data : data.zones || [];
  if (!zones.length) {
    grid.innerHTML = '<div class="empty-state">No zone policies defined yet.</div>';
    return;
  }
  grid.innerHTML = zones.map(z => {
    const mults = z.use_multipliers || {};
    const multChips = Object.entries(mults).map(([k, v]) =>
      `<span class="mult-chip">${k}: ×${v}</span>`
    ).join('');
    return `
      <div class="zone-card">
        <div class="zone-h3">${z.h3_9}</div>
        <div class="zone-class">${z.zone_class}</div>
        ${z.description ? `<div style="font-size:12px;color:var(--muted);margin-bottom:10px">${z.description}</div>` : ''}
        <div class="zone-rate">Base rate: <span>${fmt(z.base_rate_cfa_per_m2)} CFA/m²</span></div>
        <div class="zone-rate">Min tax: <span>${fmt(z.min_tax_cfa)} CFA</span></div>
        <div class="zone-rate">Max tax: <span>${fmt(z.max_tax_cfa)} CFA</span></div>
        ${multChips ? `<div class="zone-mults">${multChips}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ── Init ─────────────────────────────────────────────────────────────────────
loadPage('dashboard');
