/**
 * NorthPlate — Compare Tool Logic
 * Handles localStorage sync, table rendering, and personal scoring
 */

'use strict';

const Compare = (() => {

  const STORAGE_KEY = 'northplate_compare';
  const MAX_COMPARE = 4;

  // ---- LocalStorage helpers ----

  function getIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const ids = JSON.parse(raw);
      return Array.isArray(ids) ? ids.map(Number).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }

  function setIds(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  function addId(id) {
    const ids = getIds();
    if (ids.includes(id)) return false;
    if (ids.length >= MAX_COMPARE) return false;
    ids.push(id);
    setIds(ids);
    return true;
  }

  function removeId(id) {
    const ids = getIds().filter(i => i !== id);
    setIds(ids);
  }

  function clearAll() {
    setIds([]);
  }

  function toggle(id) {
    const ids = getIds();
    if (ids.includes(id)) {
      removeId(id);
      return false;
    } else {
      return addId(id);
    }
  }

  function count() {
    return getIds().length;
  }

  /** Resolve IDs to vehicle objects */
  function getVehicles() {
    const ids = getIds();
    return ids.map(id => NorthPlateData.vehicles.find(v => v.id === id)).filter(Boolean);
  }

  // ---- Compare table ----

  const SPEC_ROWS = [
    { key: 'msrp_cad',              label: 'MSRP (CAD)',          fmt: v => UI.formatCAD(v.msrp_cad),                   lowerIsBetter: true  },
    { key: 'fuel_type',             label: 'Fuel Type',           fmt: v => UI.fuelLabel(v.fuel_type),                   lowerIsBetter: false, noHighlight: true },
    { key: 'drivetrain',            label: 'Drivetrain',          fmt: v => v.drivetrain,                                lowerIsBetter: false, noHighlight: true },
    { key: 'fuel_combined_l100km',  label: 'Combined Fuel',       fmt: v => UI.formatFuel(v.fuel_combined_l100km),       lowerIsBetter: true  },
    { key: 'fuel_city_l100km',      label: 'City Fuel',           fmt: v => UI.formatFuel(v.fuel_city_l100km),           lowerIsBetter: true  },
    { key: 'fuel_hwy_l100km',       label: 'Highway Fuel',        fmt: v => UI.formatFuel(v.fuel_hwy_l100km),            lowerIsBetter: true  },
    { key: 'ev_range_km',           label: 'EV Range (WLTP)',     fmt: v => UI.formatRange(v.ev_range_km),               lowerIsBetter: false },
    { key: 'ev_range_cold_km',      label: 'Cold Range (−20°C)', fmt: v => UI.formatRange(v.ev_range_cold_km),           lowerIsBetter: false },
    { key: '_winter_score',         label: 'Winter Score',        fmt: v => WinterScore.calculate(v).score + ' / 100',   lowerIsBetter: false },
    { key: 'co2_rating',            label: 'CO₂ Rating',          fmt: v => v.co2_rating ? `${v.co2_rating} / 10` : '—', lowerIsBetter: false },
    { key: 'smog_rating',           label: 'Smog Rating',         fmt: v => v.smog_rating ? `${v.smog_rating} / 10` : '—', lowerIsBetter: false },
    { key: 'engine_litres',         label: 'Engine',              fmt: v => v.engine_litres ? `${v.engine_litres}L ${v.cylinders}-cyl` : (v.motor_kw ? `${v.motor_kw} kW electric` : '—'), noHighlight: true },
    { key: 'transmission',          label: 'Transmission',        fmt: v => v.transmission || '—',                       noHighlight: true },
    { key: 'ground_clearance_mm',   label: 'Ground Clearance',    fmt: v => v.ground_clearance_mm ? `${v.ground_clearance_mm} mm` : '—', lowerIsBetter: false },
    { key: 'class',                 label: 'Class',               fmt: v => v.class || '—',                              noHighlight: true },
    { key: 'body_style',            label: 'Body Style',          fmt: v => v.body_style || '—',                         noHighlight: true },
  ];

  /** Numeric value extractor for "best value" highlighting */
  function numericVal(v, row) {
    if (row.key === '_winter_score') return WinterScore.calculate(v).score;
    const val = v[row.key];
    if (val == null || val === '') return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }

  function renderTable(vehicles) {
    if (!vehicles.length) return '<p class="text-muted">No vehicles selected. Go to <a href="index.html">Browse</a> and toggle Compare on vehicles.</p>';

    const esc = UI.escapeHTML;

    // Header row
    let html = '<div class="compare-table-wrap"><table class="compare-table" role="grid">';
    html += '<thead><tr>';
    html += '<th scope="col" id="spec-col">Specification</th>';
    vehicles.forEach(v => {
      html += `<th scope="col">
        <div>${esc(v.make)} ${esc(v.model)}</div>
        <div style="font-weight:400;font-size:12px;opacity:.75">${v.year} ${esc(v.trim)}</div>
        <button class="remove-col-btn" data-remove-id="${v.id}" aria-label="Remove ${v.make} ${v.model} from comparison">✕ Remove</button>
      </th>`;
    });
    html += '</tr></thead><tbody>';

    // Data rows
    SPEC_ROWS.forEach(row => {
      // Find best value (only if numeric and not noHighlight)
      let bestIdx = -1;
      if (!row.noHighlight) {
        const nums = vehicles.map(v => numericVal(v, row));
        const valid = nums.filter(n => n != null);
        if (valid.length) {
          const best = row.lowerIsBetter ? Math.min(...valid) : Math.max(...valid);
          bestIdx = nums.indexOf(best);
        }
      }

      html += `<tr>`;
      html += `<th scope="row" class="row-label">${esc(row.label)}</th>`;
      vehicles.forEach((v, i) => {
        const displayVal = row.fmt(v);
        const isBest = !row.noHighlight && i === bestIdx;
        html += `<td class="${isBest ? 'best-value' : ''}">${esc(displayVal)}</td>`;
      });
      html += `</tr>`;
    });

    html += '</tbody></table></div>';
    return html;
  }

  // ---- Personal Scoring ----

  const WEIGHT_DIMS = [
    { key: 'price',       label: 'Purchase Price',      lowerIsBetter: true  },
    { key: 'fuel',        label: 'Fuel Economy',         lowerIsBetter: true  },
    { key: 'winter',      label: 'Winter Capability',    lowerIsBetter: false },
    { key: 'evRange',     label: 'EV Range',             lowerIsBetter: false },
    { key: 'enviro',      label: 'Environmental Rating', lowerIsBetter: false },
  ];

  function defaultWeights() {
    return { price: 5, fuel: 5, winter: 5, evRange: 5, enviro: 5 };
  }

  /**
   * Normalise a raw value across a set of vehicle values (returns 0–100).
   * lowerIsBetter inverts the scale.
   */
  function normalise(val, allVals, lowerIsBetter) {
    const nums = allVals.filter(n => n != null && !isNaN(n));
    if (!nums.length) return 50;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (max === min) return 50;
    const norm = (val - min) / (max - min); // 0 = min, 1 = max
    return lowerIsBetter ? (1 - norm) * 100 : norm * 100;
  }

  function calcPersonalScore(vehicles, weights) {
    const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0) || 1;

    // Raw values per dimension
    const raw = {
      price:   vehicles.map(v => v.msrp_cad),
      // Use L/100km for ICE/hybrid/diesel; litre-equivalent (~2.0 Le/100km) for BEV
      // so all vehicles are on a comparable scale (lower = more efficient).
      fuel:    vehicles.map(v => v.fuel_combined_l100km || (v.fuel_type === 'BEV' ? 2.0 : null)),
      winter:  vehicles.map(v => WinterScore.calculate(v).score),
      evRange: vehicles.map(v => v.ev_range_km || 0),
      enviro:  vehicles.map(v => v.co2_rating || 0),
    };

    return vehicles.map((v, i) => {
      let weightedSum = 0;
      WEIGHT_DIMS.forEach(dim => {
        const w = weights[dim.key] || 0;
        if (w === 0) return;
        const val = raw[dim.key][i];
        if (val == null) return;
        const n = normalise(val, raw[dim.key], dim.lowerIsBetter);
        weightedSum += n * w;
      });
      const score = Math.round(weightedSum / totalWeight);
      return { vehicle: v, score };
    });
  }

  return {
    getIds, setIds, addId, removeId, clearAll, toggle, count, getVehicles,
    renderTable, SPEC_ROWS, calcPersonalScore, defaultWeights, WEIGHT_DIMS,
    MAX_COMPARE
  };
})();
