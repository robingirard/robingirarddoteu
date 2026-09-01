---
name: Prévision frugale de la ressource solaire -- modèle de ciel clair, Extreme Learning Machine et apprentissage en ligne
number: "20"
year: 2026
Encadrant: Cyril Voyant
---

## Prévision frugale de la ressource solaire : modèle de ciel clair, Extreme Learning Machine et apprentissage en ligne

(Encadrant : Cyril Voyant)

## Descriptif

L'intégration croissante de la production photovoltaïque dans les
réseaux électriques nécessite des prévisions solaires fiables, rapides
et économiquement soutenables. Ce mini-projet porte sur la prévision, à
un horizon d'une heure, du rayonnement solaire global horizontal (GHI) à
Ajaccio.

À partir de mesures historiques et d'un modèle physique de ciel clair,
les étudiants isoleront la composante déterministe du rayonnement
solaire et la variabilité principalement associée à la couverture
nuageuse. Plusieurs méthodes seront comparées : persistance, smart
persistence, modèle autorégressif (AR) et Extreme Learning Machine
(ELM).

Les modèles AR et ELM seront étudiés sous une forme statique, puis
adaptative. L'apprentissage en ligne reposera sur une actualisation
récursive des coefficients du modèle AR et sur une approche Online
Sequential ELM (OS-ELM), dans laquelle la couche cachée reste fixe
tandis que les poids de sortie sont actualisés à mesure que de nouvelles
observations deviennent disponibles.

Les prévisions produites localement seront également comparées à des
prévisions issues d'un modèle météorologique numérique (Numerical
Weather Prediction ; i.e. NWP) ainsi qu'aux prévisions proposées par des
prestataires spécialisés. Les données NWP et les devis commerciaux
correspondants seront fournis.

L'objectif final sera de déterminer si l'augmentation de la complexité
et l'adaptation en ligne apportent un gain prédictif suffisant pour
justifier leur coût. Le projet conduira ainsi à arbitrer entre
précision, frugalité, coût, autonomie technique et contraintes de
maintenance.

## Attendus

-   Exploiter un modèle de ciel clair et construire une variable
    désaisonnalisée adaptée à la prévision du GHI.

-   Mettre en œuvre les modèles de persistance, smart persistence, AR et
    ELM.

-   Développer une version séquentielle de l'AR et de l'ELM selon un
    protocole « prévoir, observer, puis actualiser ».

-   Définir une séparation strictement chronologique entre les périodes
    d'apprentissage et de test, sans utilisation anticipée des données
    futures.

-   Sélectionner les principaux hyperparamètres des modèles sur la
    période d'apprentissage uniquement.

-   Comparer les prévisions locales, NWP et commerciales sur des
    périodes, horizons et instants d'émission strictement identiques.

-   Évaluer les performances à l'aide de la nMAE, de la nRMSE et d'un
    score de compétence calculé par rapport à la smart persistence.

-   Étudier la variabilité des résultats de l'ELM sur plusieurs
    initialisations aléatoires.

-   Quantifier la frugalité des méthodes : nombre de paramètres,
    empreinte mémoire, temps d'apprentissage ou d'actualisation et temps
    de prévision.

-   Évaluer les coûts directs et indirects : abonnement, accès aux
    données, calcul, stockage, développement, maintenance et
    surveillance des modèles.

-   Analyser la disponibilité des prévisions, les données manquantes, la
    dépendance à un fournisseur et les contraintes de déploiement
    opérationnel.

-   Produire un rapport professionnel, synthétique et illustré,
    accompagné d'un code documenté et reproductible.

-   Formuler une recommandation argumentée entre trois stratégies :
    développement interne, utilisation de prévisions NWP ou recours à un
    prestataire spécialisé.

## Références

Ineichen, P. (2008). "A broadband simplified version of the Solis clear
sky model." Solar Energy, 82(8), 758--762.\
[https://doi.org/10.1016/j.solener.2008.02.009](https://doi.org/10.1016/j.solener.2008.02.009)

Huang, G.-B., Zhu, Q.-Y., & Siew, C.-K. (2006). "Extreme learning
machine: Theory and applications." Neurocomputing, 70(1--3), 489--501.\
[https://doi.org/10.1016/j.neucom.2005.12.126](https://doi.org/10.1016/j.neucom.2005.12.126)

Liang, N.-Y., Huang, G.-B., Saratchandran, P., & Sundararajan, N.
(2006). "A fast and accurate online sequential learning algorithm for
feedforward networks." IEEE Transactions on Neural Networks, 17(6),
1411--1423.\
[https://doi.org/10.1109/TNN.2006.880583](https://doi.org/10.1109/TNN.2006.880583)

Voyant, C., Notton, G., Duchaud, J.-L., García-Gutiérrez, L. A., Bright,
J. M., & Yang, D. (2022). "Benchmarks for solar radiation time series
forecasting." Renewable Energy, 191, 747--762.\
[https://doi.org/10.1016/j.renene.2022.04.065](https://doi.org/10.1016/j.renene.2022.04.065)

Hyndman, R. J., & Athanasopoulos, G. (2021). Forecasting: Principles and
Practice, 3rd edition. OTexts.\
[https://otexts.com/fpp3/](https://otexts.com/fpp3/)

## Contact

Cyril Voyant
[cyril.voyant@minesparis.psl.eu](mailto:cyril.voyant@minesparis.psl.eu)
