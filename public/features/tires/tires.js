'use strict';

// Nav toggle
document.getElementById('navToggle').addEventListener('click', function() {
  const links = document.getElementById('navLinks');
  const open = links.classList.toggle('open');
  this.setAttribute('aria-expanded', open);
});

// Compare badge
document.addEventListener('northplate:ready', function() {
  const n = Compare.count();
  const badge = document.getElementById('compareBadge');
  if (badge) { badge.textContent = n; badge.style.display = n > 0 ? '' : 'none'; }
});

// ── Render ──────────────────────────────────────────────────────────────────

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const TYPE_BADGE_CLASS = {
  winter:       'tire-badge--winter',
  'all-weather':'tire-badge--allweather',
  'all-season': 'tire-badge--allseason',
  summer:       'tire-badge--summer',
};

function starsHTML(n) {
  let s = '';
  for (let i = 1; i <= 5; i++) {
    s += `<span class="tire-star${i <= n ? ' tire-star--filled' : ''}" aria-hidden="true">★</span>`;
  }
  return `<span class="tire-stars" title="${n}/5 stars">${s}</span>`;
}

function tireCardHTML(t) {
  const badgeCls = TYPE_BADGE_CLASS[t.type] || '';
  const avgPrice = Math.round((t.price_low + t.price_high) / 2);
  const lifeFmt  = (t.life_km >= 1000) ? `${(t.life_km / 1000).toFixed(0)}k km` : `${t.life_km} km`;

  return `
    <article class="tire-card" role="listitem" data-type="${esc(t.type)}">
      <div class="tire-card__header">
        <div class="tire-card__brand">${esc(t.brand)}</div>
        <div class="tire-card__model">${esc(t.model)}</div>
        <span class="tire-badge ${badgeCls}">${esc(TireData.typeIcon(t.type))} ${esc(TireData.typeLabel(t.type))}</span>
      </div>
      <div class="tire-card__rating">${starsHTML(t.rating)}</div>
      <p class="tire-card__desc">${esc(t.description)}</p>
      <div class="tire-card__specs">
        <div class="tire-spec">
          <span class="tire-spec__label">Price (per tire)</span>
          <span class="tire-spec__value">$${t.price_low}–$${t.price_high}</span>
        </div>
        <div class="tire-spec">
          <span class="tire-spec__label">Est. Tread Life</span>
          <span class="tire-spec__value">${lifeFmt}</span>
        </div>
        <div class="tire-spec">
          <span class="tire-spec__label">4-Tire Set (avg)</span>
          <span class="tire-spec__value">~$${(avgPrice * 4).toLocaleString('en-CA')}</span>
        </div>
      </div>
      <div class="tire-card__sizes">
        <span class="tire-sizes__label">Common sizes:</span>
        ${t.popular_sizes.map(s => `<code class="tire-size">${esc(s)}</code>`).join('')}
      </div>
    </article>`;
}

let activeType = '';

function renderTires() {
  const tires = TireData.getByType(activeType);
  const grid  = document.getElementById('tireGrid');
  const count = document.getElementById('tiresCount');
  grid.innerHTML = tires.map(tireCardHTML).join('');
  count.textContent = `${tires.length} tire${tires.length !== 1 ? 's' : ''}`;
}

// ── Tab events ───────────────────────────────────────────────────────────────
document.getElementById('tireTabs').addEventListener('click', function(e) {
  const btn = e.target.closest('.tire-tab');
  if (!btn) return;
  document.querySelectorAll('.tire-tab').forEach(b => {
    b.classList.remove('tire-tab--active');
    b.setAttribute('aria-selected', 'false');
  });
  btn.classList.add('tire-tab--active');
  btn.setAttribute('aria-selected', 'true');
  activeType = btn.dataset.type;
  renderTires();
});

// ── Init ────────────────────────────────────────────────────────────────────
renderTires();
