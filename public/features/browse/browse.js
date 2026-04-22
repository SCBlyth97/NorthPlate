'use strict';

document.getElementById('navToggle').addEventListener('click', function() {
  var links = document.getElementById('navLinks');
  var open = links.classList.toggle('open');
  this.setAttribute('aria-expanded', String(open));
});

document.getElementById('sidebarToggle').addEventListener('click', function() {
  var sb = document.getElementById('filterSidebar');
  var open = sb.classList.toggle('open');
  this.setAttribute('aria-expanded', String(open));
  this.textContent = open ? 'Hide Filters' : 'Filters';
});

document.addEventListener('northplate:ready', function() {
  var data = NorthPlateData;

  var heroCount = document.getElementById('heroCount');
  if (heroCount) heroCount.textContent = data.vehicles.length.toLocaleString('en-CA') + ' Vehicles';

  var makeEl = document.getElementById('filterMake');
  data.makes.forEach(function(m) {
    var opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    makeEl.appendChild(opt);
  });

  document.getElementById('filterMsrpMin').placeholder = data.minMsrp;
  document.getElementById('filterMsrpMax').placeholder = data.maxMsrp;

  var badge = document.getElementById('compareBadge');
  var n = Compare.count();
  if (n > 0) { badge.textContent = n; badge.style.display = ''; }

  function getState() {
    return {
      make: makeEl.value,
      bodyStyles: [],
      fuelTypes: Array.from(document.querySelectorAll('input[name="fuelType"]:checked')).map(function(i) { return i.value; }),
      drivetrains: [],
      msrpMin: parseFloat(document.getElementById('filterMsrpMin').value) || null,
      msrpMax: parseFloat(document.getElementById('filterMsrpMax').value) || null,
      sortBy: document.getElementById('sortSelect').value
    };
  }

  function render() {
    var filtered = Filters.apply(data.vehicles, getState());
    var grid = document.getElementById('vehicle-grid');
    var empty = document.getElementById('emptyState');
    var count = document.getElementById('resultsCount');
    var selectedIds = Compare.getIds();

    if (filtered.length === 0) {
      grid.innerHTML = ''; grid.style.display = 'none'; empty.style.display = '';
    } else {
      empty.style.display = 'none'; grid.style.display = '';
      grid.innerHTML = filtered.map(function(v, i) {
        return '<div role="listitem">' + UI.vehicleCardHTML(v, selectedIds.indexOf(v.id) !== -1, i) + '</div>';
      }).join('');

      grid.querySelectorAll('.compare-toggle').forEach(function(cb) {
        cb.addEventListener('change', function() {
          var id = parseInt(this.dataset.id);
          if (this.checked) {
            if (!Compare.addId(id)) { this.checked = false; alert('Max ' + Compare.MAX_COMPARE + ' vehicles.'); }
          } else { Compare.removeId(id); }
          var nn = Compare.count();
          badge.textContent = nn; badge.style.display = nn > 0 ? '' : 'none';
        });
      });
    }
    count.innerHTML = '<strong>' + filtered.length + '</strong> vehicle' + (filtered.length !== 1 ? 's' : '');
  }

  function reset() {
    makeEl.value = ''; document.getElementById('sortSelect').value = 'name_asc';
    document.getElementById('filterMsrpMin').value = ''; document.getElementById('filterMsrpMax').value = '';
    document.querySelectorAll('input[name="fuelType"]').forEach(function(cb) { cb.checked = false; });
    render();
  }

  ['filterMake', 'sortSelect', 'filterMsrpMin', 'filterMsrpMax'].forEach(function(id) {
    document.getElementById(id).addEventListener('change', render);
  });
  document.querySelectorAll('input[name="fuelType"]').forEach(function(cb) { cb.addEventListener('change', render); });
  document.getElementById('resetBtn').addEventListener('click', reset);
  document.getElementById('resetBtn2').addEventListener('click', reset);

  render();
});
