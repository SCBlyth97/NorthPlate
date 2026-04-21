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

  /** Fuel type badge HTML — neutral badge-bg/badge-text */
  function fuelBadgeHTML(fuel_type) {
    const label = fuelLabel(fuel_type).toUpperCase();
    const iconNames = { gasoline: 'fuel', diesel: 'fuel', hybrid: 'zap', PHEV: 'plug', BEV: 'zap' };
    const iconName = iconNames[fuel_type] || 'fuel';
    return `<span class="badge"><i data-lucide="${iconName}" width="12" height="12" aria-hidden="true"></i> ${label}</span>`;
  }

  /** Body style badge HTML — neutral badge-bg/badge-text */
  function bodyBadgeHTML(body_style) {
    const iconNames = { Car: 'car', SUV: 'car', Truck: 'truck', Van: 'car' };
    const iconName = iconNames[body_style] || 'car';
    return `<span class="badge"><i data-lucide="${iconName}" width="12" height="12" aria-hidden="true"></i> ${body_style.toUpperCase()}</span>`;
  }

  /** Inline SVG body silhouettes (~80×36px, fill="currentColor") */
  function bodySilhouette(body_style) {
    // Inner wheel circles use class="body-silhouette-hole" — CSS sets fill: var(--bg-card)
    // because SVG fill attributes cannot reference CSS variables directly
    const svgs = {
      Car: `<svg class="body-silhouette" width="80" height="36" viewBox="0 0 80 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M8 26 C8 26 10 14 22 12 L32 9 C35 8 42 8 48 9 L58 12 C70 14 72 26 72 26 L8 26Z"/>
        <circle cx="20" cy="26" r="5"/>
        <circle cx="20" cy="26" r="2.5" class="body-silhouette-hole"/>
        <circle cx="60" cy="26" r="5"/>
        <circle cx="60" cy="26" r="2.5" class="body-silhouette-hole"/>
      </svg>`,

      SUV: `<svg class="body-silhouette" width="80" height="36" viewBox="0 0 80 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M8 26 L8 13 C8 13 10 9 22 9 L58 9 C70 9 72 13 72 13 L72 26 L8 26Z"/>
        <rect x="10" y="9" width="60" height="2" rx="1"/>
        <circle cx="20" cy="26" r="5"/>
        <circle cx="20" cy="26" r="2.5" class="body-silhouette-hole"/>
        <circle cx="60" cy="26" r="5"/>
        <circle cx="60" cy="26" r="2.5" class="body-silhouette-hole"/>
      </svg>`,

      Truck: `<svg class="body-silhouette" width="80" height="36" viewBox="0 0 80 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="40" y="12" width="30" height="14" rx="1"/>
        <path d="M8 26 L8 14 C8 14 10 10 28 10 L40 10 L40 26 L8 26Z"/>
        <circle cx="18" cy="26" r="5"/>
        <circle cx="18" cy="26" r="2.5" class="body-silhouette-hole"/>
        <circle cx="62" cy="26" r="5"/>
        <circle cx="62" cy="26" r="2.5" class="body-silhouette-hole"/>
      </svg>`,

      Van: `<svg class="body-silhouette" width="80" height="36" viewBox="0 0 80 36" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M8 26 L8 10 L64 10 C70 10 72 14 72 20 L72 26 L8 26Z"/>
        <circle cx="20" cy="26" r="5"/>
        <circle cx="20" cy="26" r="2.5" class="body-silhouette-hole"/>
        <circle cx="62" cy="26" r="5"/>
        <circle cx="62" cy="26" r="2.5" class="body-silhouette-hole"/>
      </svg>`,
    };
    return svgs[body_style] || svgs.Car;
  }

  function _winterIconName(tier) {
    return (tier === 'excellent' || tier === 'good') ? 'snowflake'
         : tier === 'fair' ? 'alert-triangle' : 'x-circle';
  }

  /**
   * Build a vehicle card HTML string.
   * @param {object} v - Vehicle data object
   * @param {boolean} isSelected - Whether vehicle is in compare set
   * @param {number} index - Card position for staggered animation delay
   */
  function vehicleCardHTML(v, isSelected, index = 0) {
    const ws = WinterScore.calculate(v);
    const animDelay = Math.min(index * 0.05, 0.4);

    const fuelStat = v.fuel_type === 'BEV'
      ? { label: 'Range', value: formatRange(v.ev_range_km) }
      : { label: 'Avg. Fuel Use', value: formatFuel(v.fuel_combined_l100km) };

    const bottomLeftStat = v.body_style === 'Truck'
      ? { label: 'Max Towing', value: v.max_towing_lbs ? `${formatNumber(v.max_towing_lbs)} lbs` : '—' }
      : { label: 'Cargo', value: v.cargo_volume_l ? `${formatNumber(v.cargo_volume_l)} L` : '—' };

    const specSubtitle = [
      v.engine_litres ? `${v.engine_litres}L` : null,
      v.cylinders ? `${v.cylinders}-cyl` : null,
      v.motor_kw ? `${v.motor_kw} kW` : null,
      v.transmission || null,
    ].filter(Boolean).slice(0, 3).join(' · ') || v.trim || '';

    return `
      <article class="vehicle-card${isSelected ? ' vehicle-card--selected' : ''}"
        data-id="${v.id}"
        style="animation-delay:${animDelay}s">

        <!-- 1. Badge row -->
        <div class="card__badge-row">
          ${bodyBadgeHTML(v.body_style)}
          ${fuelBadgeHTML(v.fuel_type)}
        </div>

        <!-- 2. Year + Compare row -->
        <div class="card__year-row">
          <div class="card__year">${v.year}</div>
          <label class="compare-checkbox-wrap" title="Add to compare">
            <input type="checkbox" class="compare-toggle"
              data-id="${v.id}"
              aria-label="Compare ${v.make} ${v.model}"
              ${isSelected ? 'checked' : ''}
            />
            <span>Compare</span>
          </label>
        </div>

        <!-- 3. Vehicle name -->
        <div class="card__name">${escapeHTML(v.make)} ${escapeHTML(v.model)}</div>

        <!-- 4. Spec subtitle -->
        <div class="card__trim">${escapeHTML(specSubtitle)}</div>

        <!-- 5. Silhouette + fuel tag -->
        <div class="card__silhouette-row">
          <div class="card__silhouette">${bodySilhouette(v.body_style)}</div>
          <span class="card__fuel-tag">${escapeHTML(fuelLabel(v.fuel_type))}</span>
        </div>

        <!-- 6. Stat grid 2×2 -->
        <div class="card__stats">
          <div class="card__stat">
            <span class="card__stat-label">${fuelStat.label}</span>
            <span class="card__stat-value">${fuelStat.value}</span>
          </div>
          <div class="card__stat">
            <span class="card__stat-label">Drivetrain</span>
            <span class="card__stat-value">${escapeHTML(v.drivetrain)}</span>
          </div>
          <div class="card__stat">
            <span class="card__stat-label">${bottomLeftStat.label}</span>
            <span class="card__stat-value">${bottomLeftStat.value}</span>
          </div>
          <div class="card__stat">
            <span class="card__stat-label">Clearance</span>
            <span class="card__stat-value">${v.ground_clearance_mm ? `${v.ground_clearance_mm} mm` : '—'}</span>
          </div>
        </div>

        <!-- 7. Divider -->
        <hr class="card__divider" />

        <!-- 8. Price + winter score -->
        <div class="card__footer">
          <div class="card__price-block">
            <div class="card__msrp-label">Price (CAD)</div>
            <div class="card__msrp">${formatCAD(v.msrp_cad)}</div>
          </div>
          <span class="badge ${ws.cssClass}" aria-label="Winter score: ${ws.score} — ${ws.label}">
            <i data-lucide="${_winterIconName(ws.tier)}" width="12" height="12" aria-hidden="true"></i> ${ws.score} — ${ws.label.toUpperCase()}
          </span>
        </div>

        <!-- 9. View Details button -->
        <a href="../vehicle/vehicle.html?id=${v.id}" class="card__view-btn">
          View Details →
        </a>

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
    fuelLabel, fuelBadgeHTML, bodyBadgeHTML, bodySilhouette,
    vehicleCardHTML, escapeHTML, provinceOptionsHTML,
    setVisible, debounce, toCSV, downloadCSV
  };
})();
