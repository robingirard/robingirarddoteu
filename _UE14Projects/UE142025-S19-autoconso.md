---
name: Potentiel de l\'autoconsommation photovoltaïque à différentes échelles
number: "19"
year: 2025
Encadrant: Yassine Abdelouadoud
---

## Évaluer (énergie, CO2, coût) le potentiel de l\'autoconsommation photovoltaïque à différentes échelles (individuelle, collective, territoriale).

(Encadrants : Yassine Abdelouadoud (MINES [Centre PERSEE](https://www.minesparis.psl.eu/recherche/18-centres-de-recherche-5-domaines-disciplinaires/energetiques-et-procedes/le-centre-persee/)))

### Introduction : enjeux et contexte

La transition énergétique s'effectue dans un contexte où :

-   la baisse continue du coût des systèmes photovoltaïques rend
    cette technologie de plus en plus compétitive,

-   la  hausse du prix de l'électricité issue du réseau incite les
    consommateurs à rechercher des alternatives,

-   le développement de solutions de ## stockage par batteries permet
    de mieux valoriser l'énergie produite localement,

-   la diffusion croissante du véhicule électrique (VE) modifie les
    profils de consommation et peut constituer une forme de stockage
    mobile.

Ainsi, l'autoconsommation photovoltaïque représente une option de
plus en plus réaliste pour maîtriser les coûts et accroître la
résilience énergétique. Cependant, le potentiel de cette solution varie
selon l'échelle (individuelle, collective, territoriale) et dépend de
nombreux paramètres (profil de consommation, surfaces disponibles,
météo, prix de l'électricité, usage du stockage et des VE).

Le mini-projet proposé vise à quantifier ce potentiel ainsi que les
### coûts et bénéfices (économiques et environnementaux) pour différents
types d'utilisateurs et à différentes échelles de mutualisation.

### Problématique

Comment quantifier le potentiel d'autoconsommation photovoltaïque (en
énergie, CO₂évités et coût) à différentes échelles (bâtiment individuel,
groupe de bâtiments, territoire) et comment ce potentiel évolue avec le
stockage et l'intégration des véhicules électriques ?

### Travail demandé

Sélectionner des territoires d'expérimentation

    -   l'IRIS comme unité de base

    -   Différentes typologies (urbain, rural, intermédiaire)

    -   Différents usages (résidentiel, tertiaire, industriel)


Estimation des consommations électriques par bâtiment

    -   Affecter une typologie Enedis (ménages, tertiaire, industrie
        légère... aux bâtiments d'un jeu de données local.

    -   Construire des courbes de charge représentatives.


Estimation des consommations électriques par bâtiment

    -   Affecter une typologie Enedis (ménages, tertiaire, industrie
        légère... aux bâtiments d'un jeu de données local.

    -   Construire des courbes de charge représentatives.


Simulation de la production photovoltaïque

    -   Estimer la surface de toiture exploitable (BD TOPO).

    -   Simuler la production PV horaire avec PVLib à partir des données
        météo (ex. ERA5).


Calcul du taux d'autoconsommation

    -   À trois échelles : individuelle, collective, territoriale.

    -   Déterminer la part d'énergie consommée localement, le surplus
        injecté et le taux de couverture des besoins.


Évaluation des indicateurs

    -   ## Énergie : taux d'autoconsommation, taux de couverture,
        surplus.

    -   ## Économie : coût évité sur la facture d'électricité, coût
        d'investissement, ROI, etc.

    -   ## Environnement : émissions de CO₂évitées (facteur d'émission
        du mix électrique) et induites par l'installation du PV


Extension au stockage

    -   Intégrer une batterie stationnaire (capacité et puissance
        choisies).

    -   Évaluer l'impact du stockage sur les indicateurs (meilleure
        valorisation du PV, réduction du surplus).

    -   Comparer différents scénarios de dimensionnement de batterie.


Extension au véhicule électrique

    -   Introduire un profil de recharge d'un ou plusieurs véhicules
        électriques (horaires, puissance).

    -   Étudier deux cas : recharge simple (l'utilisateur recharge dès
        que nécessaire) et recharge optimisée (l'utilisateur recharge de
        manière à maximiser l'autoconsommation du PV).

    -   Évaluer l'impact sur l'autoconsommation et les indicateurs
        énergie/CO₂coût.


Étude de sensibilité

    -   Variation de la surface PV installée, de la capacité de
        stockage, du taux d'équipement en VE, du prix futur de
        l'électricité, des prix futurs du PV.


Recommandations

    -   Comparer les résultats individuels, collectifs et territoriaux.

    -   Identifier les conditions où l'autoconsommation devient
        optimale.

    -   Proposer des recommandations pour chaque typologie d'utilisateur
        et de territoires

### Contact : yassine.abdelouadoud@gmail.com

## Références et ressources utiles

*Autoconsommation*

ADEME [https://librairie.ademe.fr/energies/7854-autoconsommation-collective-photovoltaique-guide-pratique-a-l-attention-des-collectivites-territoriales.html](https://librairie.ademe.fr/energies/7854-autoconsommation-collective-photovoltaique-guide-pratique-a-l-attention-des-collectivites-territoriales.html)

[https://www.ademe.fr/wp-content/uploads/2025/01/avis-ademe-autoconsommation-photovoltaique_-janvier-2025.pdf](https://www.ademe.fr/wp-content/uploads/2025/01/avis-ademe-autoconsommation-photovoltaique_-janvier-2025.pdf)

ProRéno
[https://www.proreno.fr/documents/installations-photovoltaiques-en-autoconsommation](https://www.proreno.fr/documents/installations-photovoltaiques-en-autoconsommation)

*Consommation électrique et typologies*

Enedis - Données ouvertes sur les courbes de charge types par catégorie de clients
[https://data.enedis.fr/explore/dataset/conso-inf36/](https://data.enedis.fr/explore/dataset/conso-inf36/)

[https://data.enedis.fr/explore/dataset/conso-sup36/](https://data.enedis.fr/explore/dataset/conso-sup36/)

Agence ORE - Consommation annuelle d'électricité et gaz par IRIS et par secteur

[https://opendata.agenceore.fr/explore/dataset/consommation-annuelle-d-electricite-et-gaz-par-iris/information/](https://opendata.agenceore.fr/explore/dataset/consommation-annuelle-d-electricite-et-gaz-par-iris/information/)

RTE --Données ouvertes sur la consommation et production d'électricité (mix électrique, émissions associées)
[https://opendata.reseaux-energies.fr/](https://opendata.reseaux-energies.fr/)


*Bâti et surfaces photovoltaïques*
IGN - BD TOPO (base de données géographiques sur les bâtiments,
toitures, etc.)
[https://geoservices.ign.fr/bdtopo](https://geoservices.ign.fr/bdtopo)

CEREMA/IGN - Études sur le potentiel solaire des bâtiments en France
[https://geoservices.ign.fr/portail-cartographique-enr](https://geoservices.ign.fr/portail-cartographique-enr)

*Production photovoltaïque et météo*
PVLib Python --Librairie open source pour la simulation photovoltaïque
[https://pvlib-python.readthedocs.io](https://pvlib-python.readthedocs.io)

Copernicus Climate Data Store --Données ERA5 (rayonnement solaire, météo horaire)
[https://cds.climate.copernicus.eu](https://cds.climate.copernicus.eu)
