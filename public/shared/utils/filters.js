/**
 * NorthPlate — Filter & Sort Logic for Browse Page
 */

'use strict';

const Filters = (() => {

  /**
   * Apply all active filters to the full vehicle array.
   * @param {Array}  vehicles  Full array from NorthPlateData.vehicles
   * @param {Object} state     Current filter state
   * @returns {Array} Filtered (and sorted) vehicles
   */
  function apply(vehicles, state) {
    let result = vehicles.slice();

    // Make
    if (state.make) {
      result = result.filter(v => v.make === state.make);
    }

    // Body style (multi-select array)
    if (state.bodyStyles && state.bodyStyles.length) {
      result = result.filter(v => state.bodyStyles.includes(v.body_style));
    }

    // Fuel type (multi-select array)
    if (state.fuelTypes && state.fuelTypes.length) {
      result = result.filter(v => state.fuelTypes.includes(v.fuel_type));
    }

    // Drivetrain (multi-select array)
    if (state.drivetrains && state.drivetrains.length) {
      result = result.filter(v => state.drivetrains.includes(v.drivetrain));
    }

    // MSRP range (vehicles without MSRP data pass through)
    if (state.msrpMin != null) {
      result = result.filter(v => v.msrp_cad == null || v.msrp_cad >= state.msrpMin);
    }
    if (state.msrpMax != null) {
      result = result.filter(v => v.msrp_cad == null || v.msrp_cad <= state.msrpMax);
    }

    // Sort
    result = sort(result, state.sortBy);

    return result;
  }

  /**
   * Sort vehicles by a named key.
   */
  function sort(vehicles, sortBy) {
    const arr = vehicles.slice();
    switch (sortBy) {
      case 'price_asc':
        return arr.sort((a, b) => a.msrp_cad - b.msrp_cad);
      case 'price_desc':
        return arr.sort((a, b) => b.msrp_cad - a.msrp_cad);
      case 'fuel_asc':
        return arr.sort((a, b) => {
          // BEVs use ~2.0 Le/100km equivalent — more efficient than any ICE/hybrid
          const fa = a.fuel_combined_l100km || (a.fuel_type === 'BEV' ? 2.0 : 99);
          const fb = b.fuel_combined_l100km || (b.fuel_type === 'BEV' ? 2.0 : 99);
          return fa - fb;
        });
      case 'winter_desc':
        return arr.sort((a, b) => {
          const sa = WinterScore.calculate(a).score;
          const sb = WinterScore.calculate(b).score;
          return sb - sa;
        });
      case 'ev_range_desc':
        return arr.sort((a, b) => (b.ev_range_km || 0) - (a.ev_range_km || 0));
      case 'name_asc':
      default:
        return arr.sort((a, b) => {
          const na = `${a.make} ${a.model}`;
          const nb = `${b.make} ${b.model}`;
          return na.localeCompare(nb);
        });
    }
  }

  /**
   * Default filter state.
   */
  function defaults() {
    return {
      make:        '',
      bodyStyles:  [],
      fuelTypes:   [],
      drivetrains: [],
      msrpMin:     NorthPlateData.minMsrp,
      msrpMax:     NorthPlateData.maxMsrp,
      province:    'ON',
      sortBy:      'name_asc',
    };
  }

  return { apply, sort, defaults };
})();
