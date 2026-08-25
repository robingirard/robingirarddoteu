---
permalink: VehicleEfficiency
layout: default_2
---

# How much energy does a car really take out of the ground?

An interactive well-to-wheel comparison of six powertrains — battery electric,
hydrogen by electrolysis, hydrogen by steam reforming, petrol, diesel and hybrid.
Every link in the chain is a slider carrying its own source, and the Sankey
diagram, the overall efficiency and the running cost are recomputed live.

By **[Robin Girard]({{site.url}}/)**, MINES Paris — PSL.

**[Open the current version]({{site.url}}/assets/carefficiency/latest/index.html)** — v1.0.

It runs entirely in your browser, from a single file. Nothing is sent anywhere.

## What it is for

Three method choices decide the headline number more than the engineering does,
and the tool lets you move each one and watch the answer change:

 - **the perimeter** — the same electric car reads 21.9% well-to-wheel and 48.6%
   plug-to-wheel, and the second figure is the one that reaches the brochure;
 - **the primary-energy convention** — physical content, substitution or direct
   equivalent, which moves the same French-grid car from 17.6% to 41.4%;
 - **the type-approval cycle** — the JEC publishes both NEDC 2015 and WLTP 2025+,
   and the WLTP demands 19% more useful work for the same 100 km, so efficiencies
   jump while consumption barely falls.

Default values reproduce the **JEC Well-to-Wheels report v5** (JRC, EUCAR and
Concawe, 2020), the European Union's reference study, which simulates the same
C-segment vehicle in every powertrain — so the comparison is honest at equal
service. Each chain closes on the JEC's published consumption to within 0.2%.

## Why it is worth checking

Every slider carries the source of its value underneath it, and where sources
disagree the disagreement is shown rather than averaged away — including two
places where the JEC contradicts itself. Peak efficiency and cycle-average
efficiency are always distinguished, in both directions: a petrol engine
advertised at 50% delivers 42% in production and around 20% over a real cycle,
and an electric drivetrain advertised above 98% measures 63.9% over the WLTC.

Source code, sources and the reproducible figures:
[git.persee.minesparis.psl.eu/energy-alternatives/car_efficiency](https://git.persee.minesparis.psl.eu/energy-alternatives/car_efficiency)

Content under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
code under the MIT licence — reuse it in your own teaching, translated or cut
up, and say where it came from.

## Versions

Each minor release keeps its own permanent link, so a link given to a class
still opens the model it was given against.

 - [v1.0]({{site.url}}/assets/carefficiency/v1.0/index.html)

<small>Page updated 2026-08-25.</small>
