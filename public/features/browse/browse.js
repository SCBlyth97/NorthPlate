'use strict';

document.getElementById('navToggle').addEventListener('click', function () {
  var links = document.getElementById('navLinks');
  var open = links.classList.toggle('open');
  this.setAttribute('aria-expanded', String(open));
});

document.getElementById('sidebarToggle').addEventListener('click', function () {
  var sb = document.getElementById('filterSidebar');
  var open = sb.classList.toggle('open');
  this.setAttribute('aria-expanded', String(open));
  this.textContent = open ? 'Hide Filters' : 'Filters';
});

document.addEventListener('northplate:ready', function () {
  var data = NorthPlateData;

  // ── Initialise controls ───────────────────────────────────────────────────

  var heroCount = document.getElementById('heroCount');
  if (heroCount) heroCount.textContent = data.vehicles.length.toLocaleString('en-CA') + ' Vehicles';

  var makeEl = document.getElementById('filterMake');
  data.makes.forEach(function (m) {
    var opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    makeEl.appendChild(opt);
  });

  document.getElementById('filterMsrpMin').placeholder = data.minMsrp;
  document.getElementById('filterMsrpMax').placeholder = data.maxMsrp;

  // ── Compare badge (single source of truth) ────────────────────────────────

  var badge = document.getElementById('compareBadge');

  function syncBadge() {
    var n = Compare.count();
    badge.textContent = n;
    badge.style.display = n > 0 ? '' : 'none';
  }
  syncBadge();

  // ── Compare toggle wiring (shared by all three grids) ─────────────────────

  function wireCompareToggles(container) {
    container.querySelectorAll('.compare-toggle').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = parseInt(this.dataset.id, 10);
        if (this.checked) {
          if (!Compare.addId(id)) {
            this.checked = false;
            alert('Max ' + Compare.MAX_COMPARE + ' vehicles can be compared at once.');
          }
        } else {
          Compare.removeId(id);
        }
        syncBadge();
      });
    });
  }

  // ── Filter state ──────────────────────────────────────────────────────────

  function getState() {
    return {
      make:       makeEl.value,
      bodyStyles: [],
      fuelTypes:  Array.from(document.querySelectorAll('input[name="fuelType"]:checked'))
                    .map(function (i) { return i.value; }),
      drivetrains: [],
      msrpMin:    parseFloat(document.getElementById('filterMsrpMin').value) || null,
      msrpMax:    parseFloat(document.getElementById('filterMsrpMax').value) || null,
      sortBy:     document.getElementById('sortSelect').value
    };
  }

  // ── Main grid render (single render function for #vehicle-grid) ───────────

  function render() {
    var filtered    = Filters.apply(data.vehicles, getState());
    var grid        = document.getElementById('vehicle-grid');
    var empty       = document.getElementById('emptyState');
    var count       = document.getElementById('resultsCount');
    var selectedIds = Compare.getIds();

    if (filtered.length === 0) {
      grid.innerHTML = '';
      grid.style.display = 'none';
      empty.style.display = '';
    } else {
      empty.style.display = 'none';
      grid.style.display = '';
      grid.innerHTML = filtered.map(function (v, i) {
        return '<div role="listitem">' + UI.vehicleCardHTML(v, selectedIds.indexOf(v.id) !== -1, i) + '</div>';
      }).join('');
      wireCompareToggles(grid);
    }
    count.innerHTML = '<strong>' + filtered.length + '</strong> vehicle' + (filtered.length !== 1 ? 's' : '');
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function reset() {
    makeEl.value = '';
    document.getElementById('sortSelect').value = 'name_asc';
    document.getElementById('filterMsrpMin').value = '';
    document.getElementById('filterMsrpMax').value = '';
    document.querySelectorAll('input[name="fuelType"]').forEach(function (cb) { cb.checked = false; });
    render();
  }

  // ── Filter event listeners (one per control, bound once) ──────────────────

  ['filterMake', 'sortSelect', 'filterMsrpMin', 'filterMsrpMax'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', render);
  });
  document.querySelectorAll('input[name="fuelType"]').forEach(function (cb) {
    cb.addEventListener('change', render);
  });
  document.getElementById('resetBtn').addEventListener('click', reset);
  document.getElementById('resetBtn2').addEventListener('click', reset);

  // Apply Filters button — calls render() directly, no synthetic event dispatch
  var applyBtn = document.getElementById('applyBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', function () {
      render();
      var grid = document.getElementById('vehicle-grid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ── Featured section ──────────────────────────────────────────────────────
  // IDs 188 (Ford F-150) and 256 (Honda Civic) — Canada's two top sellers

  var featuredGrid = document.getElementById('featuredGrid');
  if (featuredGrid) {
    var featuredIds = [188, 256];
    var featuredSelectedIds = Compare.getIds();
    var featured = featuredIds
      .map(function (id) { return data.vehicles.find(function (v) { return v.id === id; }); })
      .filter(Boolean);
    featuredGrid.innerHTML = featured.map(function (v, i) {
      return '<div role="listitem">' + UI.vehicleCardHTML(v, featuredSelectedIds.indexOf(v.id) !== -1, i) + '</div>';
    }).join('');
    wireCompareToggles(featuredGrid);
  }

  // ── Highlights section ────────────────────────────────────────────────────
  // One pick each: best winter score, longest EV range, lowest MSRP

  var highlightsGrid = document.getElementById('highlightsGrid');
  if (highlightsGrid) {
    var byWinter = data.vehicles.slice().sort(function (a, b) {
      return WinterScore.calculate(b).score - WinterScore.calculate(a).score;
    });
    var byEV = data.vehicles
      .filter(function (v) { return v.ev_range_km > 0; })
      .sort(function (a, b) { return b.ev_range_km - a.ev_range_km; });
    var byValue = data.vehicles
      .filter(function (v) { return v.msrp_cad > 0; })
      .sort(function (a, b) { return a.msrp_cad - b.msrp_cad; });

    var seen = {};
    var highlights = [];
    [byWinter[0], byEV[0], byValue[0]].forEach(function (v) {
      if (v && !seen[v.id]) { seen[v.id] = true; highlights.push(v); }
    });

    var highlightsSelectedIds = Compare.getIds();
    highlightsGrid.innerHTML = highlights.map(function (v, i) {
      return '<div role="listitem">' + UI.vehicleCardHTML(v, highlightsSelectedIds.indexOf(v.id) !== -1, i) + '</div>';
    }).join('');
    wireCompareToggles(highlightsGrid);
  }

  // ── Initial render ────────────────────────────────────────────────────────
  render();
});
