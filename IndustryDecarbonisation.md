---
permalink: IndustryDecarbonisation
layout: default_2
---

# Decarbonising industry — what each route costs

Industry is where decarbonisation stops being a matter of will and becomes a
matter of arithmetic. This is that arithmetic, made movable: production cost,
emissions and abatement cost for **forty-six routes across eight products** —
hydrogen, steel, cement, ammonia, methanol, olefins, aluminium and jet fuel —
with every assumption a slider you can move.

By **[Robin Girard]({{site.url}}/)**, MINES Paris — PSL.

**[Open the current version]({{site.url}}/assets/industrydecarbo/latest/index.html)** — v2.0.

It runs entirely in your browser. Nothing is sent anywhere, and the single HTML
file keeps working offline, on a memory stick or dropped into a course page.
**The application is in French** for now; the English version is planned, and
the assumption files already carry the English labels the figures use.

## What it is for

A plant manager does not choose a route because it is clean. They choose it
because of what it costs — and the point of the tool is to let a student move
the handful of numbers that decide that, and watch the ranking change.

Three of them are worth the visit on their own. **The price of electricity**:
at €70/MWh electrolytic hydrogen costs €4.9/kg against €3.3 for steam reforming;
at €30/MWh it costs €3.1, and €2.3 if the electrolyser runs 90 % of the time.
Hydrogen-based steel, ammonia, methanol and synthetic kerosene are only multiples
of that one figure. **The grid emission factor**: switch from France at 56 g to
the EU-27 at 240 g and the electric routes turn over — electrolysis then emits
more than the reforming it replaces, and the carbon market rewards it anyway,
because it prices direct emissions and the electric route has moved its own onto
the grid. **The price of coking coal**: the blast furnace looks cheap until you
give it the price coking coal actually trades at.

Each product tab opens on three such manipulations, and a **Compare** tab ranks
all forty-six routes by abatement cost and by how much of their cost is
electricity.

## Why it is worth checking

Every assumption lives in a YAML file with its unit, its bounds, its source, its
status and a note — not in a spreadsheet cell. The Python engine, the JavaScript
engine running in the page and the **Sources** tab all read those same files, so
a value shown and a value used cannot differ. The two engines are compared on
46 routes at every build, and the build fails if they disagree.

What is not known is written down as such: a status marks the figures that are
still orders of magnitude rather than sourced values, and the ones kept for want
of better while known to be wrong. Costs come from **pommes-industry**, the
techno-economic model of the PERSEE centre, for France in 2030.

If a number looks wrong to you, that is a contribution — the repository takes
issues.

Source code, model, assumptions, data and figures:
[git.persee.minesparis.psl.eu/energy-alternatives/industry_decarbo_routes](https://git.persee.minesparis.psl.eu/energy-alternatives/industry_decarbo_routes)

## Versions

Each minor release keeps its own permanent link, so a result quoted in a class
still opens against the model it was computed on.

 - [v2.0]({{site.url}}/assets/industrydecarbo/v2.0/index.html)

<small>Page updated 2026-09-21.</small>
