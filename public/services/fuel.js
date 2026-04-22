/**
 * NorthPlate — Provincial Fuel & Insurance Data
 * Sources: NRCan pump price survey, IBC benchmarks, provincial EV rebate programs
 */

'use strict';

const ProvinceData = (() => {

  /**
   * Province/territory data for all 13 Canadian jurisdictions.
   *
   * gasPrice_cad_per_litre: average regular gasoline price (CAD/L), NRCan pump survey (2025 avg)
   * diesel_cad_per_litre: average diesel price (CAD/L)
   * avg_insurance_cad: average annual auto insurance cost (CAD), IBC 2024 benchmarks
   * ev_rebate_cad: provincial EV purchase incentive (CAD), on top of federal iZEV
   * ev_rebate_note: description of the provincial program
   * federal_rebate_cad: federal iZEV rebate applicable (CAD)
   */
  const PROVINCES = {
    BC: {
      name: 'British Columbia',
      abbr: 'BC',
      gasPrice_cad_per_litre: 1.89,
      diesel_cad_per_litre: 1.95,
      avg_insurance_cad: 1832,
      ev_rebate_cad: 4000,
      ev_rebate_note: 'CleanBC Go Electric up to $4,000 (income-tested)',
      federal_rebate_cad: 5000,
    },
    AB: {
      name: 'Alberta',
      abbr: 'AB',
      gasPrice_cad_per_litre: 1.52,
      diesel_cad_per_litre: 1.58,
      avg_insurance_cad: 1739,
      ev_rebate_cad: 0,
      ev_rebate_note: 'No provincial EV rebate (federal iZEV only)',
      federal_rebate_cad: 5000,
    },
    SK: {
      name: 'Saskatchewan',
      abbr: 'SK',
      gasPrice_cad_per_litre: 1.49,
      diesel_cad_per_litre: 1.55,
      avg_insurance_cad: 1235,
      ev_rebate_cad: 0,
      ev_rebate_note: 'No provincial EV rebate (federal iZEV only)',
      federal_rebate_cad: 5000,
    },
    MB: {
      name: 'Manitoba',
      abbr: 'MB',
      gasPrice_cad_per_litre: 1.51,
      diesel_cad_per_litre: 1.58,
      avg_insurance_cad: 1080,
      ev_rebate_cad: 0,
      ev_rebate_note: 'No provincial EV rebate (federal iZEV only)',
      federal_rebate_cad: 5000,
    },
    ON: {
      name: 'Ontario',
      abbr: 'ON',
      gasPrice_cad_per_litre: 1.61,
      diesel_cad_per_litre: 1.68,
      avg_insurance_cad: 1920,
      ev_rebate_cad: 0,
      ev_rebate_note: 'No provincial EV rebate (federal iZEV only)',
      federal_rebate_cad: 5000,
    },
    QC: {
      name: 'Quebec',
      abbr: 'QC',
      gasPrice_cad_per_litre: 1.72,
      diesel_cad_per_litre: 1.78,
      avg_insurance_cad: 717,
      ev_rebate_cad: 7000,
      ev_rebate_note: 'Roulez vert up to $7,000 (income-tested)',
      federal_rebate_cad: 5000,
    },
    NB: {
      name: 'New Brunswick',
      abbr: 'NB',
      gasPrice_cad_per_litre: 1.60,
      diesel_cad_per_litre: 1.65,
      avg_insurance_cad: 970,
      ev_rebate_cad: 0,
      ev_rebate_note: 'No provincial EV rebate (federal iZEV only)',
      federal_rebate_cad: 5000,
    },
    NS: {
      name: 'Nova Scotia',
      abbr: 'NS',
      gasPrice_cad_per_litre: 1.68,
      diesel_cad_per_litre: 1.74,
      avg_insurance_cad: 1132,
      ev_rebate_cad: 3000,
      ev_rebate_note: 'Nova Scotia EV rebate up to $3,000',
      federal_rebate_cad: 5000,
    },
    PEI: {
      name: 'Prince Edward Island',
      abbr: 'PEI',
      gasPrice_cad_per_litre: 1.63,
      diesel_cad_per_litre: 1.69,
      avg_insurance_cad: 878,
      ev_rebate_cad: 0,
      ev_rebate_note: 'No active provincial EV rebate (federal iZEV only)',
      federal_rebate_cad: 5000,
    },
    NL: {
      name: 'Newfoundland & Labrador',
      abbr: 'NL',
      gasPrice_cad_per_litre: 1.65,
      diesel_cad_per_litre: 1.71,
      avg_insurance_cad: 1071,
      ev_rebate_cad: 2500,
      ev_rebate_note: 'NL EV rebate up to $2,500',
      federal_rebate_cad: 5000,
    },
    YT: {
      name: 'Yukon',
      abbr: 'YT',
      gasPrice_cad_per_litre: 1.98,
      diesel_cad_per_litre: 2.08,
      avg_insurance_cad: 1150,
      ev_rebate_cad: 5000,
      ev_rebate_note: 'Yukon EV rebate up to $5,000',
      federal_rebate_cad: 5000,
    },
    NT: {
      name: 'Northwest Territories',
      abbr: 'NT',
      gasPrice_cad_per_litre: 2.15,
      diesel_cad_per_litre: 2.25,
      avg_insurance_cad: 1200,
      ev_rebate_cad: 5000,
      ev_rebate_note: 'NWT EV rebate up to $5,000',
      federal_rebate_cad: 5000,
    },
    NU: {
      name: 'Nunavut',
      abbr: 'NU',
      gasPrice_cad_per_litre: 2.35,
      diesel_cad_per_litre: 2.50,
      avg_insurance_cad: 1100,
      ev_rebate_cad: 0,
      ev_rebate_note: 'No provincial EV rebate (federal iZEV only)',
      federal_rebate_cad: 5000,
    },
  };

  /**
   * Get province data by abbreviation (e.g. 'ON')
   */
  function get(abbr) {
    return PROVINCES[abbr] || null;
  }

  /**
   * All provinces as an array, sorted alphabetically by name.
   */
  const list = Object.values(PROVINCES).sort((a, b) => a.name.localeCompare(b.name));

  /**
   * Total EV rebate (provincial + federal) for a given province.
   * Only BEV/PHEV qualify for federal iZEV.
   */
  function totalEvRebate(abbr, fuel_type) {
    const p = get(abbr);
    if (!p) return 0;
    const qualifies = fuel_type === 'BEV' || fuel_type === 'PHEV';
    if (!qualifies) return 0;
    return p.ev_rebate_cad + p.federal_rebate_cad;
  }

  return { PROVINCES, get, list, totalEvRebate };
})();
