/**
 * NorthPlate — Shared UI Utilities
 */

'use strict';

const UI = (() => {

  /** Format a CAD dollar amount */
  function formatCAD(amount, showCents = false) {
    if (amount == null || isNaN(amount)) return '—';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0,
    }).format(amount);
  }

  /** Format a number with thousand-separator commas */
  function formatNumber(n, decimals = 0) {
    if (n == null || isNaN(n)) return '—';
    return new Intl.NumberFormat('en-CA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  }

  /** Fuel consumption display */
  function formatFuel(l100km) {
    if (l100km == null || l100km === '') return '—';
    return `${parseFloat(l100km).toFixed(1)} L/100km`;
  }

  /** EV range display */
  function formatRange(km) {
    if (!km) return '—';
    return `${km} km`;
  }

  /** Fuel type display label */
  const FUEL_LABELS = {
    gasoline: 'Gasoline',
    diesel:   'Diesel',
    hybrid:   'Hybrid',
    PHEV:     'Plug-in Hybrid',
    BEV:      'Electric',
  };

  function fuelLabel(fuel_type) {
    return FUEL_LABELS[fuel_type] || fuel_type;
  }

  /** Fuel type badge HTML */
  function fuelBadgeHTML(fuel_type) {
    const cls = `badge--${fuel_type.toLowerCase()}`;
    const label = fuelLabel(fuel_type);
    const icons = { gasoline: '⛽', diesel: '⛽', hybrid: '⚡', PHEV: '🔌', BEV: '⚡' };
    const icon = icons[fuel_type] || '';
    return `<span class="badge ${cls}"><span aria-hidden="true">${icon}</span> ${label}</span>`;
  }

  /** Body style badge HTML */
  function bodyBadgeHTML(body_style) {
    const icons = { Car: '🚗', SUV: '🚙', Truck: '🛻' };
    const icon = icons[body_style] || '🚘';
    return `<span class="badge badge--body"><span aria-hidden="true">${icon}</span> ${body_style}</span>`;
  }

  /** Build a vehicle card HTML string */
  function vehicleCardHTML(v, isSelected) {
    const ws = WinterScore.calculate(v);
    const fuelDisplay = v.fuel_type === 'BEV'
      ? `${formatRange(v.ev_range_km)} range`
      : formatFuel(v.fuel_combined_l100km);

    return `
      <article class="vehicle-card${isSelected ? ' vehicle-card--selected' : ''}" data-id="${v.id}">
        <div class="card__header">
          <div class="card__title">
            <div class="card__year">${v.year}</div>
            <div class="card__name">${escapeHTML(v.make)} ${escapeHTML(v.model)}</div>
            <div class="card__trim">${escapeHTML(v.trim)}</div>
          </div>
          <label class="compare-checkbox-wrap" title="Add to compare">
            <input type="checkbox" class="compare-toggle"
              data-id="${v.id}"
              aria-label="Compare ${v.make} ${v.model}"
              ${isSelected ? 'checked' : ''}
            />
            <span>Compare</span>
          </label>
        </div>

        <div class="card__badges">
          ${bodyBadgeHTML(v.body_style)}
          ${fuelBadgeHTML(v.fuel_type)}
        </div>

        <div class="card__stats">
          <div class="card__stat">
            <span class="card__stat-label">${v.fuel_type === 'BEV' ? 'Range' : 'Combined'}</span>
            <span class="card__stat-value">${fuelDisplay}</span>
          </div>
          <div class="card__stat">
            <span class="card__stat-label">Drivetrain</span>
            <span class="card__stat-value">${escapeHTML(v.drivetrain)}</span>
          </div>
          ${v.ev_range_cold_km ? `
          <div class="card__stat">
            <span class="card__stat-label">Cold Range (−20°C)</span>
            <span class="card__stat-value">${v.ev_range_cold_km} km</span>
          </div>` : ''}
          <div class="card__stat">
            <span class="card__stat-label">CO₂ Rating</span>
            <span class="card__stat-value">${v.co2_rating}/10</span>
          </div>
        </div>

        <div class="card__footer">
          <div>
            <div class="card__msrp-label">MSRP (CAD)</div>
            <div class="card__msrp">${formatCAD(v.msrp_cad)}</div>
          </div>
          <span class="badge ${ws.cssClass}" aria-label="Winter score ${ws.score} — ${ws.label}">
            <span aria-hidden="true">${ws.icon}</span> ${ws.score}
            <span class="sr-only">— ${ws.label}</span>
          </span>
        </div>
      </article>
    `;
  }

  /** Escape HTML to prevent XSS */
  function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Build province dropdown options HTML */
  function provinceOptionsHTML(selectedAbbr) {
    return ProvinceData.list.map(p =>
      `<option value="${p.abbr}"${p.abbr === selectedAbbr ? ' selected' : ''}>${escapeHTML(p.name)}</option>`
    ).join('');
  }

  /** Show/hide element */
  function setVisible(el, visible) {
    if (!el) return;
    el.style.display = visible ? '' : 'none';
  }

  /** Debounce a function call */
  function debounce(fn, ms = 100) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /** Export vehicles array to CSV string */
  function toCSV(vehicles) {
    const headers = [
      'id','make','model','year','trim','class','body_style',
      'engine_litres','cylinders','motor_kw','transmission','drivetrain',
      'fuel_type','fuel_city_l100km','fuel_hwy_l100km','fuel_combined_l100km',
      'ev_range_km','ev_range_cold_km','co2_rating','smog_rating',
      'msrp_cad','ground_clearance_mm','data_source','data_url'
    ];
    const rows = vehicles.map(v =>
      headers.map(k => {
        const val = v[k] == null ? '' : v[k];
        const s = String(val);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  /** Trigger CSV download in browser */
  function downloadCSV(vehicles, filename = 'northplate-vehicles.csv') {
    const csv = toCSV(vehicles);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return {
    formatCAD, formatNumber, formatFuel, formatRange,
    fuelLabel, fuelBadgeHTML, bodyBadgeHTML,
    vehicleCardHTML, escapeHTML, provinceOptionsHTML,
    setVisible, debounce, toCSV, downloadCSV
  };
})();
