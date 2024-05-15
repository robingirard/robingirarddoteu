---
permalink: JobOffer
layout: default_2
---

If you wish to [go back to my main page]({{site.url}}/index.html#Available).
<br>
[Actual student list](https://www.robingirard.eu/StudentList.html)
# Current job offers

## Under my supervision
Details can be found below and via links. All positions are located in the PERSEE center of MINES Paris PSL, located in Sophia Antipolis in the South of France. Being located in Paris might be a possible option too to be discussed depending on the project/position.


 - A PhD position on the developpement of infrastructures for circular economy of CO2.  Starting between now and october 2024. [Full Description](#theseplanetterr4)
 - A PhD and a postdoc position in optimisation of building retrofit planing at the scale of a territory, in collaboration with CSTB (please contact me to know more), in the frame of an ANR project (not accepted yet). To start around october/november 2024  [Full Description](#thesebuilding)
 - A PhD in multi-energy multi-scale planing of H2 infrastructure in the frame of a franco-german project (not accepted yet) with the key actor of open energy modeling ([EOT](https://openenergytransition.org/) and Frauhofer on the German side, GRTGaz R&D and Verso Energy on the French side). To start around october / november 2024. [Full Description](#thesefrancogerman)



##  PhD position - Integrating CO2 resources into territorial energy planning.
<a id="theseplanetterr4">
In industry decarbonization, CO2 capture for reuse or storage plays a crucial role, such as in producing e-fuels, e-plastics [REF Zenon](https://www.zenon.ngo/insights/sustainable-aviation-fuels-safs), or decarbonizing cement. It also contributes to system hybridization, exemplified by low-carbon hydrogen production  [Jodry2023](https://www.sciencedirect.com/science/article/pii/S0959652623029086). However, the necessary infrastructure for CO2 transport, temporary or permanent storage, and reuse is often overlooked in prospective modeling works. This thesis aims to address this gap by integrating CO2 infrastructure into the multi-energy decarbonization planning of an industrial region, enabling economic and environmental evaluation, including CO2 capture, investment description, and potential financing challenges.

This thesis aims to create a methodological framework for optimized multi-resource planning of integrated energy systems, including CO2 capture, transport, reuse, and storage infrastructure. It builds on the [SPHYDERS](https://git.persee.mines-paristech.fr/energy-alternatives/operation-and-planning) open-source model developed from [Jodry2023](https://www.sciencedirect.com/science/article/pii/S0959652623029086) and links with ongoing industrial decarbonization research pursued at the PERSEE center [These Thibaut](https://www.robingirard.eu/StudentList.html#ThibautKnibiehly) and [These Quentin](https://www.robingirard.eu/StudentList.html#QuentinRaillard-Cazanove). Conducted within the [PlaneTerr](https://planeterr.fr/) project alongside energy industry partners, this framework seeks to develop low-carbon energy transition strategies for industrial territories, considering complex interactions between energy production, use, and CO2 management, and assesses CO2 capture and valorization benefits for greenhouse gas emission reduction goals.


This thesis will be supervised by Pedro Affonsso Nobrega and Robin Girard, with the student based at the PERSEE center in Sophia Antipolis, although a Paris location may be considered. Please send your CV at robin.girard@minesparis.psl.eu

##  PhD position - Large Scale optimisation of building retrofit.
<a id="thesebuilding">

In a context of massive buildings retrofit toward long term carbon neutrality, scaling from hundreds to millions of buildings comes with several challenges. It is necessary to integrate the diversity that exists at the territory scale in terms of building characteristics and usage, but impossible to reach the precision that can be obtained for few buildings. In preceding work (two PhDs: [Antoine Rogeau](https://theses.fr/2020UPSLM014) and Martin Rit), we have proposed a combination of three tools toward the optimization of building retrofit trajectories : (i) a model describing building characteristics from large databases available for a whole country on a building basis, (ii) an energy model and a calibration procedure (see the paper [[RIT2023](https://www-sciencedirect-com.minesparis-psl.idm.oclc.org/science/article/pii/S0378778823004358?via%3Dihub)], and open source code ["buildingmodel"](https://gitlab.com/energytransition/buildingmodel))that allow to simulate energy consumption rapidly and that depends linearly upon the characteristics we wish to optimize (heating devices, building characteristics) (iii) an optimization model that allows to decide along years and for each building, among many different retrofit options (first in [[Rogeau2020](https://www-sciencedirect-com.minesparis-psl.idm.oclc.org/science/article/pii/S0306261920301513?via%3Dihub)], and for the multi-horizon part in [[RIT2024](https://www-sciencedirect-com.minesparis-psl.idm.oclc.org/science/article/pii/S0306261924003192?via%3Dihub)]).

The simulation and optimization can operate at the scale of millions of buildings and has been applied to French territories but not at the scale of the whole country (see the PhD of Martin Rit for an application to four french metropoles). In addition, it has several limitations: if does not take into account uncertainties, it is dedicated to residential building missing the important tertiary sector, it does not take into account cold need and summer comfort, it integrates economic and scope 1&2 GHG emissions but not scope 3 and it focuses on retrofit of building while sometime full reconstruction is claimed to be an alternative. In the proposed PhD, the objective will be to propose a full robust/stochastic simulation-optimization model adapted to any type of building, taking into account climate change effects and cold demand, scope 3 impacts and evolution of associated emissions.

This thesis will be done in collaboration with CSTB and other partners of the PEPR SPACE project. The project financing the PhD is in a final phase of evaluation. The PhD should start between october and december 2024. We will consider applications until a satisfactory candidate is found.

##  PhD position - Multiscale, multi-energy planing of H2 infrastructures
<a id="thesefrancogerman">

In the PhD of [Anaelle Jodry](https://theses.fr/s247634) (defended in 2023, see the defense [here](https://www.youtube.com/watch?v=fftKdl0Rv1A) and the published paper [Jodry et Al. 2023](https://doi-org.minesparis-psl.idm.oclc.org/10.1016/j.jclepro.2023.138750)) and in a current PhD ([Thibaut Knibiehly](https://www.robingirard.eu/StudentList.html#ThibautKnibiehly)) we have proposed a multi-horizon planing methodology that is now implemented in the POMMES model. The POMMES Model is a multi-energy planning tool for trajectory investment optimisation under hourly equilibrium constraints.

In order to improve the model two objectives are set within this PhD: (i) increase the ability of POMMES to integrate the physical constraints relatives to H2 network and (ii) coupling of POMMES with larger scale models (such as [PyPSA](https://pypsa.org/) at a European or even larger scale)

The first objective will require to evaluate the possibility and the interest of including the modeling of loss of load in H2 and CH4 pipes in the investment problem. This implies modeling pressure, investment and operation of compressors, eventually including their location. Pressure modeling as well as investment in compressors will bring non-linearities and non convexities in the problem and a dedicated algorithm will have to be proposed. It might rely on relaxation or linearisation of the full problem, in accordance with the necessary precision regarding other sources of error. Inspiration from relaxations techniques developed in the electric distribution network ([[Adbelouadoud2015](https://doi.org/10.1016/j.ijepes.2014.12.084)]) might be useful. Another problem will be that of modeling CH4 pipes repurposing in the trajectory investment problem. This will require a reformulation of the problem and might increase the dimensionality. New optimisation decomposition methods might have to be proposed here.

The second objective of the PhD will be a central task in the project financing the PhD. The Multi-scale multi-energy model will have to couple models developed other Work Packages. (able to cope with panEU, import from North Africa, and the local industrial area e.g. that of the German France border).  This inter-action will either require soft (unidirectional or bidirectional) or hard coupling methods between models and meta models. Coupling techniques will build upon those developed in preceding works (See [Thomas Heggarty](https://theses.fr/2021UPSLM030)’s PhD) or ongoin PhD ([Hugo Hamburger](https://www.robingirard.eu/StudentList.html#HugoHamburger)) at MINES Paris PSL PERSEE.  

This thesis will be done in collaboration with partners of a franco-german project with [OET](https://openenergytransition.org/) (association related to the [PyPSA community](https://pypsa.org/)), Fraunhofer, [GRTGaz](https://www.grtgaz.com/) and [Verso Energy](https://verso.energy/en/homepage/). The project financing the PhD is in a final phase of evaluation. The PhD should start between october and december 2024. We will consider applications until a satisfactory candidate is found.


## In my research group
- Postdoc #1:   on Power System Planning (distribution grid/electric vehicles) in collaboration with Grenoble power system lab - [Full Description](https://www.persee.minesparis.psl.eu/Nous-rejoindre/PostDoc-Carnot-Mines-MatElec-PERSEE.pdf/)
- Postdoc #2: on mining engineering (impact of electrification on material need) in collaboration with MINES Paris geoscience center - [Full Description](https://www.geosciences.minesparis.psl.eu/wp-content/uploads/2023/12/231106_PostDocGeosciencesMatElec-1.pdf)
- PhD #1: "Artificial intelligence based prescriptive analytics for energy systems" - [Full Description](https://www.abg.asso.fr/fr/candidatOffres/show/id_offre/114613/job/phd-1-at-mines-paris-in-data-science-energy-artificial-intelligence-based-prescriptive-analytics-for-energy-systems)
- PhD #2: "High-dimensional optimization of distributed assets in smart grids" [Full Description](https://www.abg.asso.fr/fr/candidatOffres/show/id_offre/119694/job/phd-2-at-mines-paris-in-data-science-energy-high-dimensional-optimization-of-distributed-assets-in-smart-grids)
- PhD #3: "Seamless forecasting of local energy production and demand using multiple heterogeneous data sources" [Full Description](https://www.abg.asso.fr/fr/candidatOffres/show/id_offre/119712/job/phd-3-at-mines-paris-in-data-science-energy-seamless-forecasting-of-local-energy-production-and-demand-using-multiple-heterogeneous-data-sources)
- PhD #4: "Flexibility-aware forecasting of local energy demand" [Full Description](https://www.abg.asso.fr/fr/candidatOffres/show/id_offre/119787/job/phd-4-at-mines-paris-in-data-science-energy-flexibility-aware-forecasting-of-local-energy-demand)
- PhD #5: "Optimization of flexibility services under multiple local uncertainties in the context of smart grids" [Full Description](https://www.abg.asso.fr/fr/candidatOffres/show/id_offre/119969/job/phd-5-at-mines-paris-in-data-science-energy-optimization-of-flexibility-services-under-multiple-local-uncertainties-in-the-context-of-smart-grids)
- PhD #6: "Multi energy system planning for maritime regions" [Full Description](https://www.abg.asso.fr/fr/candidatOffres/show/id_offre/119886/job/multi-energy-system-planning-for-maritime-regions)
