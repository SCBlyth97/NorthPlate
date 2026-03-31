/**
 * NorthPlate — TCO (Total Cost of Ownership) Calculator
 */

'use strict';

const TCO = (() => {

  /**
   * Maintenance estimates by fuel type (annual CAD)
   * ICE: higher (oil changes, exhaust, more parts)
   * Hybrid: modest savings
   * BEV: lowest (no oil, fewer brakes, fewer moving parts)
   * PHEV: between ICE and BEV
   */
  const MAINTENANCE_ANNUAL = {
    gasoline: 1800,
    diesel:   2000,
    hybrid:   1400,
    PHEV:     1200,
    BEV:       900,
  };

  /**
   * Depreciation model:
   * Year 1: 20% of MSRP
   * Years 2–3: 15% of remaining value per year
   * Years 4+: 10% of remaining value per year
   * Luxury premium (+$10k MSRP threshold): slightly faster depreciation
   */
  function calcDepreciation(msrp, years) {
    let value = msrp;
    let totalDep = 0;
    for (let y = 1; y <= years; y++) {
      const rate = y === 1 ? 0.20 : y <= 3 ? 0.15 : 0.10;
      const dep = value * rate;
      totalDep += dep;
      value -= dep;
    }
    return { totalDepreciation: Math.round(totalDep), residualValue: Math.round(value) };
  }

  /**
   * Annual registration estimate (CAD) — rough average across Canada
   * Scales modestly with vehicle value
   */
  function calcRegistration(msrp) {
    if (msrp < 30000) return 150;
    if (msrp < 50000) return 200;
    if (msrp < 80000) return 280;
    return 350;
  }

  /**
   * Finance cost over ownership period
   * Simple interest model: interest = principal * rate * years
   * (conservative estimate — real loans are amortised but this gives a clear
   *  "extra cost of financing" figure)
   */
  function calcFinanceCost(msrp, downPayment, ratePercent, years) {
    const principal = Math.max(0, msrp - downPayment);
    if (!ratePercent || ratePercent <= 0) return 0;
    // Approximate total interest using average outstanding balance = principal / 2
    const totalInterest = (principal / 2) * (ratePercent / 100) * years;
    return Math.round(totalInterest);
  }

  /**
   * Annual fuel cost.
   * ICE/hybrid/diesel: based on L/100km and provincial gas price.
   * BEV: based on kWh/100km. We estimate kWh from range (assumes ~20 kWh/100km avg)
   *      and electricity at $0.14/kWh national average.
   * PHEV: 60% electric, 40% gasoline (typical real-world split).
   */
  function calcAnnualFuelCost(vehicle, province, annualKm, fuelPriceOverride) {
    const prov = ProvinceData.get(province);
    const gasPrice = fuelPriceOverride || (prov ? prov.gasPrice_cad_per_litre : 1.60);
    const dieselPrice = prov ? prov.diesel_cad_per_litre : 1.70;
    const electricityRate = 0.14; // CAD/kWh, national average

    switch (vehicle.fuel_type) {
      case 'gasoline': {
        const l100 = vehicle.fuel_combined_l100km || 9.0;
        return Math.round((annualKm / 100) * l100 * gasPrice);
      }
      case 'diesel': {
        const l100 = vehicle.fuel_combined_l100km || 10.0;
        return Math.round((annualKm / 100) * l100 * dieselPrice);
      }
      case 'hybrid': {
        const l100 = vehicle.fuel_combined_l100km || 6.0;
        return Math.round((annualKm / 100) * l100 * gasPrice);
      }
      case 'PHEV': {
        // 60% of km on electric, 40% on gasoline
        const evKm  = annualKm * 0.60;
        const gasKm = annualKm * 0.40;
        const kwhPer100 = 20; // kWh/100km for PHEV electric mode
        const evCost  = (evKm / 100) * kwhPer100 * electricityRate;
        const l100    = vehicle.fuel_combined_l100km || 7.0;
        const gasCost = (gasKm / 100) * l100 * gasPrice;
        return Math.round(evCost + gasCost);
      }
      case 'BEV': {
        // Estimate kWh/100km from range (typical 20 kWh/100km average)
        const kwhPer100 = vehicle.ev_range_km ? Math.round(20000 / vehicle.ev_range_km * 10) / 10 : 20;
        return Math.round((annualKm / 100) * kwhPer100 * electricityRate);
      }
      default:
        return 0;
    }
  }

  /**
   * Full TCO calculation for a single vehicle.
   */
  function calculate(vehicle, params) {
    const {
      province     = 'ON',
      annualKm     = 20000,
      years        = 5,
      fuelOverride = null,
      financeRate  = 0,
      downPayment  = 0,
    } = params;

    const prov = ProvinceData.get(province);

    const annualFuel        = calcAnnualFuelCost(vehicle, province, annualKm, fuelOverride);
    const annualInsurance   = prov ? prov.avg_insurance_cad : 1500;
    const annualMaintenance = MAINTENANCE_ANNUAL[vehicle.fuel_type] || 1500;
    const annualReg         = calcRegistration(vehicle.msrp_cad);
    const { totalDepreciation } = calcDepreciation(vehicle.msrp_cad, years);
    const financeCost       = calcFinanceCost(vehicle.msrp_cad, downPayment, financeRate, years);

    const evRebate = ProvinceData.totalEvRebate(province, vehicle.fuel_type);
    const adjustedPurchase = Math.max(0, vehicle.msrp_cad - evRebate);

    const totalRunning = (annualFuel + annualInsurance + annualMaintenance + annualReg) * years;
    const totalCost    = adjustedPurchase + totalRunning + financeCost;
    const monthlyCost  = Math.round(totalCost / (years * 12));

    return {
      vehicle,
      annualFuel,
      annualInsurance,
      annualMaintenance,
      annualReg,
      totalDepreciation,
      financeCost,
      evRebate,
      adjustedPurchase,
      totalRunning: Math.round(totalRunning),
      totalCost:    Math.round(totalCost),
      monthlyCost,
      years,
    };
  }

  return { calculate, calcAnnualFuelCost, calcDepreciation, MAINTENANCE_ANNUAL };
})();
