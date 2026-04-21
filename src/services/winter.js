/**
 * NorthPlate — Winter Score Algorithm
 * Returns 0–100 score and tier label/colour for a vehicle
 */

'use strict';

const WinterScore = (() => {

  /**
   * Calculate the winter score for a vehicle object.
   * @param {Object} v  Vehicle record from data.js
   * @returns {{ score: number, tier: string, label: string, color: string, cssClass: string }}
   */
  function calculate(v) {
    let score = 0;

    // ---- 1. Drivetrain (40 pts) ----
    const dt = (v.drivetrain || '').toUpperCase();
    if (dt === 'AWD' || dt === '4WD') {
      score += 40;
    } else if (dt === 'FWD') {
      score += 20;
    } else {
      // RWD or unknown
      score += 5;
    }

    // ---- 2. Ground Clearance (30 pts) ----
    const gc = v.ground_clearance_mm || 0;
    if (gc >= 200) {
      score += 30;
    } else if (gc >= 170) {
      score += 20;
    } else {
      score += 10;
    }

    // ---- 3. Cold EV Range (20 pts) ----
    // BEV only: deduct points when cold range < 200 km
    // PHEV/hybrid/ICE all get full 20 pts
    if (v.fuel_type === 'BEV') {
      const coldRange = v.ev_range_cold_km || 0;
      if (coldRange >= 300) {
        score += 20;
      } else if (coldRange >= 200) {
        score += 15;
      } else if (coldRange >= 100) {
        score += 8;
      } else {
        score += 0;
      }
    } else {
      score += 20;
    }

    // ---- 4. Body Style (10 pts) ----
    const body = (v.body_style || '').toLowerCase();
    if (body === 'truck' || body === 'suv') {
      score += 10;
    } else {
      score += 5;
    }

    // Clamp to [0, 100]
    score = Math.max(0, Math.min(100, score));

    return Object.assign({ score }, getTier(score));
  }

  /**
   * Determine tier metadata from a numeric score.
   */
  function getTier(score) {
    if (score >= 80) {
      return { tier: 'excellent', label: 'Excellent', color: '#0D1F3C', cssClass: 'badge--excellent', icon: '❄' };
    } else if (score >= 65) {
      return { tier: 'good',      label: 'Good',      color: '#1A7A6E', cssClass: 'badge--good',      icon: '❄' };
    } else if (score >= 40) {
      return { tier: 'fair',      label: 'Fair',      color: '#D4820A', cssClass: 'badge--fair',      icon: '⚠' };
    } else {
      return { tier: 'poor',      label: 'Poor',      color: '#C8312A', cssClass: 'badge--poor',      icon: '✕' };
    }
  }

  /**
   * Render a winter score badge element (returns HTML string).
   */
  function badgeHTML(v) {
    const result = calculate(v);
    return `<span class="badge ${result.cssClass}" aria-label="Winter score: ${result.score} — ${result.label}">
      <span aria-hidden="true">${result.icon}</span> ${result.score} — ${result.label}
    </span>`;
  }

  return { calculate, getTier, badgeHTML };
})();
