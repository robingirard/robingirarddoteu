---
permalink: Enseignement
layout: default_2
---

# Enseignement

Cette page rassemble mes contenus d'enseignement accessibles publiquement :
les outils interactifs, les supports et les pages de projets étudiants.

<small>[English version]({{site.url}}/Teaching.html) · [Retour à ma page principale]({{site.url}}/index.html)</small>

## Outils interactifs

Quatre applications, à ouvrir directement dans un navigateur. Elles fonctionnent
entièrement en local : rien n'est envoyé nulle part, et elles restent utilisables
hors connexion une fois la page chargée. Leur code et leurs sources sont ouverts.

Servez-vous-en pour vos propres cours — traduites, découpées ou modifiées. Les
contenus sont sous CC BY 4.0 et le code sous licence MIT ; citez simplement la
provenance.

### [The Net Zero Game]({{site.url}}/TheNetZeroGame.html)

Un modèle pédagogique de la France en 2050. On y pilote les transports, le
chauffage des bâtiments et l'industrie face à des objectifs d'émissions et face
aux contraintes physiques qui font de l'électrification un arbitrage plutôt
qu'un gain gratuit — la pointe électrique d'hiver, et le biogaz, les biocarburants
et la biomasse que le pays peut réellement fournir.

Chaque formule est déclarée dans un fichier YAML plutôt qu'enfouie dans une
cellule de tableur, et chaque hypothèse porte sa valeur, ses bornes et ses sources.
Code et modèle :
[git.persee.minesparis.psl.eu/energy-alternatives/The-net-zero-game](https://git.persee.minesparis.psl.eu/energy-alternatives/The-net-zero-game)

### [Rendement des véhicules, du puits à la roue]({{site.url}}/VehicleEfficiency.html)

Une comparaison interactive de six motorisations — électrique, hydrogène par
électrolyse, hydrogène par vaporeformage, essence, diesel et hybride. Chaque
maillon de la chaîne est un curseur qui porte sa source, et le diagramme de
Sankey, le rendement global et le coût à l'usage sont recalculés en direct.

L'objet du jeu est de montrer que trois choix de méthode — le périmètre, la
convention de comptage de l'énergie primaire, et le cycle d'homologation —
décident du chiffre annoncé davantage que la technique elle-même. Les valeurs
par défaut reproduisent le JEC Well-to-Wheels v5 (JRC, EUCAR et Concawe), le
référentiel de l'Union européenne. Code, sources et figures reproductibles :
[git.persee.minesparis.psl.eu/energy-alternatives/car_efficiency](https://git.persee.minesparis.psl.eu/energy-alternatives/car_efficiency)

### [L'empilement des énergies dans le monde]({{site.url}}/WorldEnergyMix.html)

L'énergie mondiale par source, de 1800 à 2030, pour le monde, l'Europe, l'UE-27,
les États-Unis et la France — sous quatre conventions de comptage différentes.

Deux choses s'y voient. D'abord qu'aucune source d'énergie n'a jamais été
remplacée : le charbon n'a pas remplacé le bois, le pétrole n'a pas remplacé le
charbon, le gaz n'a pas remplacé le pétrole. Chacune s'est ajoutée par-dessus
pendant que les précédentes continuaient de croître. Ensuite que « l'énergie
primaire » est une convention et non une mesure : selon celle qu'on retient, le
nucléaire est compté à trois fois sa production électrique ou à deux fois et
demie, et l'éolien à une fois ou à deux fois et demie — sans qu'un seul joule ne
bouge. La France affiche 50 % de bas-carbone en énergie primaire et 23 % en
énergie finale.

La page fonctionne hors ligne et n'embarque aucun jeu de données, seulement les
valeurs agrégées de la figure. Code et sources :
[git.persee.minesparis.psl.eu/energy-alternatives/world_energy_mix](https://git.persee.minesparis.psl.eu/energy-alternatives/world_energy_mix)

### [Révise — réviser par répétition espacée]({{site.url}}/Revise.html)

Un outil de révision, pas un cours : un exercice raté revient vite, un exercice réussi
s'espace, et l'on progresse compétence par compétence. Il est vide par lui-même et se
garnit de **paquets de fiches** — le moteur ne connaît aucune matière, en brancher une
autre ne demande pas d'y toucher.

Le premier paquet couvre le **bac STI2D** — ingénierie et 2I2D, physique-chimie,
mathématiques — soit 2 058 exercices où chaque mauvaise réponse porte sa propre
explication. Je l'ai écrit pour mon fils qui prépare ce bac ; il est ouvert parce qu'il
n'y a pas de raison de le garder.

L'application s'installe sur l'écran d'accueil d'un téléphone et fonctionne sans
connexion. Rien n'est envoyé nulle part : la progression reste sur l'appareil. Moteur
(MIT) :
[git.persee.minesparis.psl.eu/energy-alternatives/revise-core](https://git.persee.minesparis.psl.eu/energy-alternatives/revise-core) ·
paquet STI2D (CC BY 4.0) :
[github.com/robingirard/revise-pour-le-bac-sti2D](https://github.com/robingirard/revise-pour-le-bac-sti2D)

## I-BE³ — International Bachelor of Environmentally Engaged Engineering

**Introduction to Energy** — cours de trois jours pour le
[bachelor I-BE³](https://www.minesparis.psl.eu/en/education/i-be3/) de
MINES Paris — PSL, sur le campus de Sophia Antipolis. Ce qu'est l'énergie et
comment on la mesure, d'où elle vient et où elle va, et ce qu'une transition
bas carbone demande réellement. Le cours est en anglais.

- [**Les supports de cours**]({{site.url}}/IntroductionToEnergy.html) — édition
  2026, en PDF et en PowerPoint modifiable. Les decks 1 à 3 pour l'instant :
  ce qu'est l'énergie, l'histoire de l'énergie, et le rendement et la
  thermodynamique. La page est en anglais, comme le cours.

Les trois premiers outils interactifs ci-dessus ont été construits pour ce cours
— Révise, lui, vise un tout autre public. Les decks suivants, et le code qui
produit les figures, sont ouverts un à un.

## MINES Paris — UE 14 « Terre et Société »

Mini-projets de première année.

- [Descriptif de l'unité d'enseignement et déroulement]({{site.url}}/MINES-UE14-miniprojet.html) — à lire avant de commencer
- [Liste des projets de l'année en cours]({{site.url}}/ListeProjetsCourants.html)
- [Liste des projets des années précédentes]({{site.url}}/ListeProjetsPrecedents.html)

## Encadrement

- [Étudiants et stagiaires encadrés]({{site.url}}/StudentList.html)
- [Offres de stage, thèse et post-doctorat]({{site.url}}/JobOffer.html)

Pour toute question, vous pouvez m'écrire :
[robin.girard@minesparis.psl.eu](mailto:robin.girard@minesparis.psl.eu).
