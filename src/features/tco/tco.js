'use strict';

const MAX_TCO_VEHICLES = 3;
let pickerSelects = [];

// ---- Province dropdown ----
function buildProvinceSelect() {
  const sel = document.getElementById('tcoProvince');
  sel.innerHTML = '<option value="">Select province…</option>' +
    ProvinceData.list.map(p =>
      `<option value="${p.abbr}"${p.abbr === 'ON' ? ' selected' : ''}>${UI.escapeHTML(p.name)}</option>`
    ).join('');
}

// ---- Vehicle pickers ----
function buildPickers() {
  const container = document.getElementById('pickerRows');
  container.innerHTML = '';
  pickerSelects = [];

  const sortedVehicles = NorthPlateData.vehicles.slice().sort((a, b) =>
    `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`)
  );

  const optionsHTML = sortedVehicles.map(v =>
    `<option value="${v.id}">${v.year} ${UI.escapeHTML(v.make)} ${UI.escapeHTML(v.model)} — ${UI.escapeHTML(v.trim)} (${UI.formatCAD(v.msrp_cad)})</option>`
  ).join('');

  for (let i = 0; i < MAX_TCO_VEHICLES; i++) {
    const label = i === 0 ? 'Vehicle 1 (required)' : `Vehicle ${i + 1} (optional)`;
    const row = document.createElement('div');
    row.className = 'input-group';
    row.innerHTML = `
      <label class="input-label" for="tcoVehicle_${i}">${label}</label>
      <select class="form-input" id="tcoVehicle_${i}" aria-label="${label}">
        <option value="">— Select vehicle —</option>
        ${optionsHTML}
      </select>
    `;
    container.appendChild(row);
    pickerSelects.push(document.getElementById('tcoVehicle_' + i));
  }

  // Pre-fill from compare selection if available
  const compareIds = Compare.getIds();
  compareIds.slice(0, MAX_TCO_VEHICLES).forEach((id, i) => {
    if (pickerSelects[i]) pickerSelects[i].value = id;
  });
}

// ---- Calculation ----
function getParams() {
  const province    = document.getElementById('tcoProvince').value || 'ON';
  const annualKm    = Math.max(1000, parseInt(document.getElementById('tcoKm').value) || 20000);
  const years       = Math.max(1, Math.min(10, parseInt(document.getElementById('tcoYears').value) || 5));
  const fuelRaw     = parseFloat(document.getElementById('tcoFuelPrice').value);
  const fuelOverride = isNaN(fuelRaw) || fuelRaw <= 0 ? null : fuelRaw;
  const financeRate = parseFloat(document.getElementById('tcoRate').value) || 0;
  const downPayment = parseFloat(document.getElementById('tcoDown').value) || 0;
  return { province, annualKm, years, fuelOverride, financeRate, downPayment };
}

function calculate() {
  const params = getParams();
  const selectedVehicles = pickerSelects
    .map(sel => NorthPlateData.vehicles.find(v => v.id === parseInt(sel.value)))
    .filter(Boolean);

  if (selectedVehicles.length === 0) {
    alert('Please select at least one vehicle.');
    return;
  }

  const results = selectedVehicles.map(v => TCO.calculate(v, params));

  document.getElementById('tcoPlaceholder').style.display = 'none';
  const grid = document.getElementById('tcoResultsGrid');
  grid.style.display = '';
  grid.innerHTML = results.map(r => renderTCOCard(r, params.years)).join('');
}

function renderTCOCard(r, years) {
  const esc = UI.escapeHTML;
  const fmt = UI.formatCAD;
  const v   = r.vehicle;

  const rebateHTML = r.evRebate > 0 ? `
    <div class="tco-rebate">
      <span aria-hidden="true">💚</span>
      EV Rebate Applied: ${fmt(r.evRebate)} (provincial + federal iZEV)
    </div>` : '';

  return `
    <article class="tco-card" aria-label="${esc(v.make)} ${esc(v.model)} TCO">
      <div class="tco-card__header">
        <div class="tco-card__name">${esc(v.year)} ${esc(v.make)} ${esc(v.model)}</div>
        <div style="font-size:12px;opacity:.75;margin-bottom:8px">${esc(v.trim)}</div>
        <div class="tco-card__monthly">${fmt(r.monthlyCost)}</div>
        <div class="tco-card__monthly-label">estimated / month over ${years} year${years !== 1 ? 's' : ''}</div>
      </div>
      <div class="tco-card__body">
        <div class="tco-line">
          <span class="tco-line__label">Purchase price</span>
          <span class="tco-line__value">${fmt(v.msrp_cad)}</span>
        </div>
        ${r.evRebate > 0 ? `
        <div class="tco-line">
          <span class="tco-line__label">EV rebate (provincial + federal)</span>
          <span class="tco-line__value tco-line__value--saving">− ${fmt(r.evRebate)}</span>
        </div>
        <div class="tco-line">
          <span class="tco-line__label">Net purchase price</span>
          <span class="tco-line__value">${fmt(r.adjustedPurchase)}</span>
        </div>` : ''}
        <div class="tco-line">
          <span class="tco-line__label">Annual fuel / energy cost</span>
          <span class="tco-line__value">${fmt(r.annualFuel)} / yr</span>
        </div>
        <div class="tco-line">
          <span class="tco-line__label">Annual insurance (est.)</span>
          <span class="tco-line__value">${fmt(r.annualInsurance)} / yr</span>
        </div>
        <div class="tco-line">
          <span class="tco-line__label">Annual maintenance (est.)</span>
          <span class="tco-line__value">${fmt(r.annualMaintenance)} / yr</span>
        </div>
        <div class="tco-line">
          <span class="tco-line__label">Annual registration (est.)</span>
          <span class="tco-line__value">${fmt(r.annualReg)} / yr</span>
        </div>
        <div class="tco-line">
          <span class="tco-line__label">Total depreciation (${years} yr)</span>
          <span class="tco-line__value">${fmt(r.totalDepreciation)}</span>
        </div>
        ${r.financeCost > 0 ? `
        <div class="tco-line">
          <span class="tco-line__label">Finance cost (interest est.)</span>
          <span class="tco-line__value">${fmt(r.financeCost)}</span>
        </div>` : ''}
        <div class="tco-line" style="padding-top:var(--space-3);border-top:2px solid var(--border)">
          <span class="tco-line__label" style="font-weight:var(--font-semibold);color:var(--text)">Total ${years}-year cost</span>
          <span class="tco-line__value tco-line__value--total">${fmt(r.totalCost)}</span>
        </div>
        ${rebateHTML}
      </div>
    </article>
  `;
}

// ---- Events ----
document.getElementById('calcBtn').addEventListener('click', calculate);

// Allow Enter key in inputs to trigger calculation
['tcoKm','tcoFuelPrice','tcoRate','tcoDown'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });
});

// Recalculate on input change
['tcoProvince','tcoYears'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    if (document.getElementById('tcoResultsGrid').style.display !== 'none') calculate();
  });
});

// Nav mobile toggle
document.getElementById('navToggle').addEventListener('click', function() {
  const links = document.getElementById('navLinks');
  const open = links.classList.toggle('open');
  this.setAttribute('aria-expanded', open);
});

// Update compare badge
const compareCount = Compare.count();
const badge = document.getElementById('compareBadge');
if (compareCount > 0) {
  badge.textContent = compareCount;
  badge.style.display = '';
}

// ---- Init ----
document.addEventListener('northplate:ready', function () {
  buildProvinceSelect();
  buildPickers();
});
