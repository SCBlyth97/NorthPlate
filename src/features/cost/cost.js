'use strict';

const MAX_VEHICLES = 3;
let pickerSelects = [];

// ── Nav ──────────────────────────────────────────────────────────────────────
document.getElementById('navToggle').addEventListener('click', function() {
  const links = document.getElementById('navLinks');
  const open = links.classList.toggle('open');
  this.setAttribute('aria-expanded', open);
});

// ── Province dropdown ─────────────────────────────────────────────────────────
function buildProvinceSelect() {
  const sel = document.getElementById('caProvince');
  sel.innerHTML = '<option value="">Select province…</option>' +
    ProvinceData.list.map(p =>
      `<option value="${p.abbr}"${p.abbr === 'ON' ? ' selected' : ''}>${UI.escapeHTML(p.name)}</option>`
    ).join('');
}

// ── Tire picker ───────────────────────────────────────────────────────────────
function buildTireSelect() {
  const sel = document.getElementById('caTireSelect');
  const byType = TireData.allTypes().map(type => {
    const tires = TireData.getByType(type);
    const opts  = tires.map(t =>
      `<option value="${t.id}">${TireData.typeIcon(type)} ${UI.escapeHTML(t.brand)} ${UI.escapeHTML(t.model)} — $${t.price_low}–$${t.price_high}/tire</option>`
    ).join('');
    return `<optgroup label="${TireData.typeLabel(type)}">${opts}</optgroup>`;
  }).join('');
  sel.innerHTML = '<option value="">— No tire cost estimate —</option>' + byType;
}

function updateTireInfo() {
  const id  = parseInt(document.getElementById('caTireSelect').value);
  const box = document.getElementById('caTireInfo');
  if (!id) { box.style.display = 'none'; return; }
  const t   = TireData.getById(id);
  if (!t) { box.style.display = 'none'; return; }
  const km  = parseInt(document.getElementById('caKmSlider').value) || 20000;
  const yrs = parseInt(document.getElementById('caYears').value) || 5;
  const annCost  = TireData.estimateAnnualCost(t, km);
  const totCost  = TireData.estimateTotalCost(t, km, yrs);
  box.style.display = '';
  box.innerHTML = `
    <div class="tire-info-row">
      <span>Est. annual tire cost</span>
      <strong>${UI.formatCAD(annCost)}/yr</strong>
    </div>
    <div class="tire-info-row">
      <span>Est. total tire cost (${yrs} yr)</span>
      <strong>${UI.formatCAD(totCost)}</strong>
    </div>
    <div class="tire-info-row" style="color:var(--text-muted);font-size:var(--text-xs)">
      <span>Based on avg set price (~${UI.formatCAD(Math.round((t.price_low + t.price_high) / 2 * 4))}) and ~${(t.life_km/1000).toFixed(0)}k km tread life</span>
    </div>`;
}

// ── KM slider ─────────────────────────────────────────────────────────────────
document.getElementById('caKmSlider').addEventListener('input', function() {
  const val = parseInt(this.value);
  document.getElementById('caKmDisplay').textContent = val.toLocaleString('en-CA') + ' km';
  updateTireInfo();
});

document.getElementById('caTireSelect').addEventListener('change', updateTireInfo);
document.getElementById('caYears').addEventListener('change', function() {
  updateTireInfo();
  if (document.getElementById('caResultsGrid').style.display !== 'none') calculate();
});
document.getElementById('caProvince').addEventListener('change', function() {
  if (document.getElementById('caResultsGrid').style.display !== 'none') calculate();
});

// ── Vehicle pickers ────────────────────────────────────────────────────────────
function buildPickers() {
  const container = document.getElementById('pickerRows');
  container.innerHTML = '';
  pickerSelects = [];

  const sorted = NorthPlateData.vehicles.slice().sort((a, b) =>
    `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`)
  );
  const optsHTML = sorted.map(v =>
    `<option value="${v.id}">${v.year} ${UI.escapeHTML(v.make)} ${UI.escapeHTML(v.model)} — ${UI.escapeHTML(v.trim)} (${UI.formatCAD(v.msrp_cad)})</option>`
  ).join('');

  for (let i = 0; i < MAX_VEHICLES; i++) {
    const label = i === 0 ? 'Vehicle 1 (required)' : `Vehicle ${i + 1} (optional)`;
    const row = document.createElement('div');
    row.className = 'input-group';
    row.innerHTML = `
      <label class="input-label" for="caVehicle_${i}">${label}</label>
      <select class="form-input" id="caVehicle_${i}" aria-label="${label}">
        <option value="">— Select vehicle —</option>
        ${optsHTML}
      </select>`;
    container.appendChild(row);
    pickerSelects.push(document.getElementById('caVehicle_' + i));
  }

  // Pre-fill from compare selection
  Compare.getIds().slice(0, MAX_VEHICLES).forEach((id, i) => {
    if (pickerSelects[i]) pickerSelects[i].value = id;
  });
}

// ── Calculation ───────────────────────────────────────────────────────────────
function getParams() {
  const province    = document.getElementById('caProvince').value || 'ON';
  const annualKm    = Math.max(5000, parseInt(document.getElementById('caKmSlider').value) || 20000);
  const years       = Math.max(1, Math.min(10, parseInt(document.getElementById('caYears').value) || 5));
  const fuelRaw     = parseFloat(document.getElementById('caFuelPrice').value);
  const fuelOverride = isNaN(fuelRaw) || fuelRaw <= 0 ? null : fuelRaw;
  const financeRate = parseFloat(document.getElementById('caRate').value) || 0;
  const downPayment = parseFloat(document.getElementById('caDown').value) || 0;
  const tireId      = parseInt(document.getElementById('caTireSelect').value) || null;
  const tire        = tireId ? TireData.getById(tireId) : null;
  return { province, annualKm, years, fuelOverride, financeRate, downPayment, tire };
}

function calculate() {
  const params   = getParams();
  const vehicles = pickerSelects
    .map(sel => NorthPlateData.vehicles.find(v => v.id === parseInt(sel.value)))
    .filter(Boolean);

  if (vehicles.length === 0) {
    alert('Please select at least one vehicle.');
    return;
  }

  const results = vehicles.map(v => TCO.calculate(v, params));

  document.getElementById('caPlaceholder').style.display = 'none';
  document.getElementById('insurancePlaceholder').style.display = '';
  const grid = document.getElementById('caResultsGrid');
  grid.style.display = '';
  grid.innerHTML = results.map(r => renderResultCard(r, params)).join('');
}

function renderResultCard(r, params) {
  const esc = UI.escapeHTML;
  const fmt = UI.formatCAD;
  const v   = r.vehicle;
  const yrs = params.years;
  const km  = params.annualKm;

  // ── Fuel cost per km ──
  const costPerKm = r.annualFuel > 0 && km > 0
    ? '$' + (r.annualFuel / km).toFixed(3) + '/km'
    : '—';

  // ── Tire cost ──
  let tireCostHtml = '';
  if (params.tire) {
    const annTire  = TireData.estimateAnnualCost(params.tire, km);
    const totTire  = TireData.estimateTotalCost(params.tire, km, yrs);
    tireCostHtml = `
      <div class="ca-section">
        <div class="ca-section__title"> Tire Costs — ${esc(params.tire.brand)} ${esc(params.tire.model)}</div>
        <div class="tco-line">
          <span class="tco-line__label">Annual tire cost (est.)</span>
          <span class="tco-line__value">${fmt(annTire)} / yr</span>
        </div>
        <div class="tco-line">
          <span class="tco-line__label">Total tire cost (${yrs} yr)</span>
          <span class="tco-line__value">${fmt(totTire)}</span>
        </div>
        <div class="tco-line" style="color:var(--text-muted);font-size:var(--text-xs)">
          <span>Based on ~${(params.tire.life_km/1000).toFixed(0)}k km tread life, avg set price ~${fmt(Math.round((params.tire.price_low + params.tire.price_high) / 2 * 4))}</span>
        </div>
      </div>`;
  }

  // ── EV rebate ──
  const rebateHtml = r.evRebate > 0 ? `
    <div class="tco-rebate">
      <span aria-hidden="true">💚</span>
      EV Rebate Applied: ${fmt(r.evRebate)} (provincial + federal iZEV)
    </div>` : '';

  return `
    <article class="tco-card" aria-label="${esc(v.make)} ${esc(v.model)} cost analysis">
      <div class="tco-card__header">
        <div class="tco-card__name">${esc(v.year)} ${esc(v.make)} ${esc(v.model)}</div>
        <div style="font-size:12px;opacity:.75;margin-bottom:8px">${esc(v.trim)}</div>
        <div class="tco-card__monthly">${fmt(r.monthlyCost)}</div>
        <div class="tco-card__monthly-label">est. / month over ${yrs} year${yrs !== 1 ? 's' : ''}</div>
      </div>
      <div class="tco-card__body">

        <div class="ca-section">
          <div class="ca-section__title">⛽ Fuel Costs</div>
          <div class="tco-line">
            <span class="tco-line__label">Annual fuel / energy cost</span>
            <span class="tco-line__value">${fmt(r.annualFuel)} / yr</span>
          </div>
          <div class="tco-line">
            <span class="tco-line__label">Cost per kilometre</span>
            <span class="tco-line__value">${costPerKm}</span>
          </div>
          <div class="tco-line">
            <span class="tco-line__label">Total fuel cost (${yrs} yr)</span>
            <span class="tco-line__value">${fmt(r.annualFuel * yrs)}</span>
          </div>
        </div>

        ${tireCostHtml}

        <div class="ca-section">
          <div class="ca-section__title"> Ownership Costs</div>
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
            <span class="tco-line__label">Total depreciation (${yrs} yr)</span>
            <span class="tco-line__value">${fmt(r.totalDepreciation)}</span>
          </div>
          ${r.financeCost > 0 ? `
          <div class="tco-line">
            <span class="tco-line__label">Finance cost (interest est.)</span>
            <span class="tco-line__value">${fmt(r.financeCost)}</span>
          </div>` : ''}
        </div>

        <div class="tco-line" style="padding-top:var(--space-3);border-top:2px solid var(--border)">
          <span class="tco-line__label" style="font-weight:var(--font-semibold);color:var(--text)">Total ${yrs}-year cost</span>
          <span class="tco-line__value tco-line__value--total">${fmt(r.totalCost)}</span>
        </div>
        ${rebateHtml}

      </div>
    </article>`;
}

// ── Events ────────────────────────────────────────────────────────────────────
document.getElementById('calcBtn').addEventListener('click', calculate);
['caFuelPrice','caRate','caDown'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('northplate:ready', function() {
  buildProvinceSelect();
  buildPickers();
  buildTireSelect();

  const badge = document.getElementById('compareBadge');
  if (badge) {
    const n = Compare.count();
    badge.textContent = n;
    badge.style.display = n > 0 ? '' : 'none';
  }
});
