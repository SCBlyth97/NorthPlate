/**
 * NorthPlate — Vehicle Data Module
 * Source: NRCan 2026 Fuel Consumption Guide (open.canada.ca)
 * 870 vehicles: ICE/hybrid/diesel (2026) + BEV 2026 + PHEV 2026
 *
 * Data is loaded at runtime from data/vehicles.csv.
 * Once loaded, window.NorthPlateData is set and a 'northplate:ready'
 * CustomEvent is dispatched on document so pages can initialise.
 */
'use strict';

(function () {

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map((line) => {
      // Handle quoted fields
      const fields = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' ) { inQ = !inQ; }
        else if (ch === ',' && !inQ) { fields.push(cur); cur = ''; }
        else { cur += ch; }
      }
      fields.push(cur);
      const obj = {};
      headers.forEach((h, i) => { obj[h.trim()] = (fields[i] || '').trim(); });
      return obj;
    });
  }

  function num(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
  function int(v) { const n = parseInt(v);   return isNaN(n) ? null : n; }

  function buildData(csvText) {
    const rawRows = parseCSV(csvText);

    const vehicles = rawRows.map(r => ({
      id:                   int(r.id),
      make:                 r.make,
      model:                r.model,
      year:                 int(r.year),
      trim:                 r.trim,
      class:                r.class,
      body_style:           r.body_style,
      engine_litres:        num(r.engine_litres),
      cylinders:            int(r.cylinders),
      motor_kw:             num(r.motor_kw),
      transmission:         r.transmission,
      drivetrain:           r.drivetrain,
      fuel_type:            r.fuel_type,
      fuel_city_l100km:     num(r.fuel_city_l100km),
      fuel_hwy_l100km:      num(r.fuel_hwy_l100km),
      fuel_combined_l100km: num(r.fuel_combined_l100km),
      ev_range_km:          num(r.ev_range_km),
      ev_range_cold_km:     num(r.ev_range_cold_km),
      co2_rating:           num(r.co2_rating),
      smog_rating:          num(r.smog_rating),
      msrp_cad:             num(r.msrp_cad),
      ground_clearance_mm:  num(r.ground_clearance_mm),
      data_source:          r.data_source,
      data_url:             r.data_url,
    }));

    function unique(arr) { return [...new Set(arr)].filter(Boolean).sort(); }

    const makes       = unique(vehicles.map(v => v.make));
    const bodyStyles  = unique(vehicles.map(v => v.body_style));
    const fuelTypes   = ['gasoline', 'diesel', 'hybrid', 'PHEV', 'BEV'];
    const drivetrains = ['AWD', '4WD', 'FWD', 'RWD'];

    const msrpValues  = vehicles.map(v => v.msrp_cad).filter(v => v != null);
    const minMsrp     = msrpValues.length ? Math.min(...msrpValues) : 20000;
    const maxMsrp     = msrpValues.length ? Math.max(...msrpValues) : 120000;

    return { vehicles, makes, bodyStyles, fuelTypes, drivetrains, minMsrp, maxMsrp };
  }

  fetch('data/vehicles.csv')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function (text) {
      window.NorthPlateData = buildData(text);
      document.dispatchEvent(new CustomEvent('northplate:ready'));
    })
    .catch(function (err) {
      console.error('NorthPlate: failed to load vehicles.csv —', err);
    });

})();
