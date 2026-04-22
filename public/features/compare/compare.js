'use strict';

let weights = Compare.defaultWeights();

// ---- Vehicle picker dropdown ----
function buildVehiclePicker() {
  const sel = document.getElementById('addVehicleSelect');
  const sorted = NorthPlateData.vehicles.slice().sort((a, b) =>
    `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`)
  );
  sorted.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.year} ${v.make} ${v.model} — ${v.trim}`;
    sel.appendChild(opt);
  });
}

document.getElementById('addVehicleBtn').addEventListener('click', () => {
  const sel = document.getElementById('addVehicleSelect');
  const id = parseInt(sel.value);
  if (!id) return;
  const added = Compare.addId(id);
  if (!added) {
    if (Compare.getIds().includes(id)) {
      alert('That vehicle is already in your comparison.');
    } else {
      alert(`Maximum ${Compare.MAX_COMPARE} vehicles can be compared.`);
    }
    return;
  }
  sel.value = '';
  render();
});

// ---- Weight sliders ----
function buildWeightSliders() {
  const container = document.getElementById('weightSliders');
  container.innerHTML = Compare.WEIGHT_DIMS.map(dim => `
    <div class="weight-row">
      <label for="weight_${dim.key}">
        ${dim.label}
        <span class="weight-value" id="wval_${dim.key}" aria-live="polite">${weights[dim.key]}</span>
      </label>
      <input type="range" id="weight_${dim.key}" min="0" max="10" step="1"
        value="${weights[dim.key]}"
        aria-label="${dim.label} importance weight"
        aria-valuemin="0" aria-valuemax="10" />
    </div>
  `).join('');

  Compare.WEIGHT_DIMS.forEach(dim => {
    document.getElementById('weight_' + dim.key).addEventListener('input', e => {
      weights[dim.key] = parseInt(e.target.value);
      document.getElementById('wval_' + dim.key).textContent = weights[dim.key];
      renderScores();
    });
  });
}

// ---- Render scores ----
function renderScores() {
  const vehicles = Compare.getVehicles();
  if (vehicles.length < 2) return;

  const scores = Compare.calcPersonalScore(vehicles, weights);
  const maxScore = Math.max(...scores.map(s => s.score));
  const winnerIdx = scores.findIndex(s => s.score === maxScore);

  const resultsEl = document.getElementById('scoreResults');
  resultsEl.innerHTML = scores.map((s, i) => `
    <div class="score-result-card${i === winnerIdx ? ' winner' : ''}">
      <div class="score-result-vehicle">${UI.escapeHTML(s.vehicle.make)} ${UI.escapeHTML(s.vehicle.model)}</div>
      <div class="score-result-bar-wrap" role="progressbar" aria-valuenow="${s.score}" aria-valuemin="0" aria-valuemax="100" aria-label="${s.vehicle.make} ${s.vehicle.model} score ${s.score}">
        <div class="score-result-bar" style="width:${s.score}%"></div>
      </div>
      <div class="score-result-number">${s.score}</div>
      <div class="score-result-label">/ 100${i === winnerIdx ? ' 🏆' : ''}</div>
    </div>
  `).join('');

  const winner = scores[winnerIdx].vehicle;
  const bannerEl = document.getElementById('winnerBanner');
  bannerEl.style.display = '';
  bannerEl.innerHTML = `<div class="winner-banner">🏆 Based on your priorities, the <strong>${winner.make} ${UI.escapeHTML(winner.model)} ${UI.escapeHTML(winner.trim)}</strong> scores highest.</div>`;
}

// ---- Main render ----
function render() {
  const vehicles = Compare.getVehicles();
  const n = vehicles.length;

  // Nav badge
  const badge = document.getElementById('compareBadge');
  badge.textContent = n;
  badge.style.display = n > 0 ? '' : 'none';

  const tableWrap  = document.getElementById('compareTableWrap');
  const emptyEl    = document.getElementById('emptyCompare');
  const scoringEl  = document.getElementById('scoringPanel');

  if (n === 0) {
    tableWrap.innerHTML = '';
    emptyEl.style.display = '';
    scoringEl.style.display = 'none';
  } else {
    emptyEl.style.display = 'none';
    tableWrap.innerHTML = Compare.renderTable(vehicles);
    scoringEl.style.display = n >= 2 ? '' : 'none';

    // Bind remove-column buttons
    tableWrap.querySelectorAll('[data-remove-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        Compare.removeId(parseInt(btn.dataset.removeId));
        render();
      });
    });

    if (n >= 2) renderScores();
  }
}

document.getElementById('clearAllBtn').addEventListener('click', () => {
  Compare.clearAll();
  render();
});

// Nav mobile toggle
document.getElementById('navToggle').addEventListener('click', function() {
  const links = document.getElementById('navLinks');
  const open = links.classList.toggle('open');
  this.setAttribute('aria-expanded', open);
});

// ---- Init ----
document.addEventListener('northplate:ready', function () {
  buildVehiclePicker();
  buildWeightSliders();
  render();
});
