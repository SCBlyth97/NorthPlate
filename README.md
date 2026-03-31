# NorthPlate

NorthPlate 🍁
The Canadian vehicle intelligence platform. Browse, compare, and decide — free, forever.
NorthPlate is a browser-based vehicle decision tool built specifically for Canadian buyers. Not a listings site. Not a review site. A decision engine: transparent data, explained scores, no ads.

What it does
NorthPlate gives you the tools to make a real purchase decision without wading through sponsored content or paywalled features:

Browse & filter vehicles by any combination of specs
Side-by-side comparison with weighted personal scoring — you set what matters
5-year Total Cost of Ownership calculator in CAD
Provincial fuel cost calculator across all 13 provinces
Winter suitability score — AWD, ground clearance, EV cold-weather range
EV range at −20°C — clearly labelled, something no major site does well
CSV import & manual entry for custom data management


Why Canadian-specific
Generic vehicle tools are built for the US market and bolted onto Canada as an afterthought. NorthPlate is built from the ground up for Canadian conditions:
FeatureDetailAll pricesCADFuel costsProvincial pump prices, all 13 provincesInsurance estimatesProvincial rate differences baked into TCOWinter scoreAWD, ground clearance, cold-weather EV range penaltyEV cold rangeRated range adjusted for −20°C Canadian wintersBilingualEN/FR structure planned for Stage 2

Data sources
All figures are cited. Data is seeded from public Canadian sources:

Natural Resources Canada — fuel consumption ratings (2026 Fuel Consumption Guide)
Transport Canada — safety ratings and vehicle classifications
Manufacturer websites — MSRP, trim specs, drivetrain details

No scraping of commercial listings. No data sold. Sources linked inline throughout the tool.

Tech stack
Stage 1 is intentionally zero-infrastructure:

Vanilla HTML / CSS / JavaScript — no frameworks
Hosted on GitHub Pages — zero running cost
All data in flat CSV/JSON files — no backend, no database
Works entirely in the browser


Roadmap
StageGoal1 — MVPBest free Canadian vehicle tool. Public, trusted, zero cost.2 — Growth10k monthly users. Monthly Canada Car Report. Dealer conversations begin.3 — PartnershipsOEM/fleet data exchange. Parts pricing. Fleet dashboard.4 — RevenueConsumer Pro tier, Fleet Dashboard, OEM Intelligence Reports.
The long-term model is a data exchange: build a trusted public audience first, then partner with OEMs and fleet operators who contribute private data (parts pricing, service costs, residual values) in exchange for aggregated intelligence reports.

What this is not

❌ A car listings site — no inventory, no dealer links
❌ A review site — no editorial opinions
❌ A paywall — core tools are free, always
❌ Finished — data, features, and design will evolve


Contributing
Data corrections and additions are welcome. If you spot a spec that's wrong or a source that's better, open an issue or submit a pull request with a citation.

License
Data sourced from Natural Resources Canada and Transport Canada is published under the Open Government Licence – Canada. Project code is MIT.
