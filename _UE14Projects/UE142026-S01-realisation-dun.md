---
name: Réalisation d'un outil tout-public d'optimisation du dimensionnement d'un système PV-batterie domestique ou pour un batiment tertiaire
number: "01"
year: 2026
Encadrant: Parmentier Pimprenelle
---

## Réalisation d'un outil tout-public d'optimisation du dimensionnement d'un système PV-batterie domestique ou pour un batiment tertiaire

(Encadrant : Parmentier Pimprenelle)

## Descriptif

L'installation de panneaux solaires domestiques est une pratique qui se
développe chez les particuliers et les entreprises depuis déjà plusieurs
années. Les conditions d'aide et les tarifs de rachats évoluant, il peut
être compliqué pour un particulier de savoir si une telle installation
est rentable et dans quelles conditions. Le prix de rachat de
l'électricité ayant baissé, les particuliers se tournent à présent vers
des systèmes de stockage. Se pose alors la question de la taille
optimale de ce stockage, qui a également un impact environnemental.

[https://www.lemonde.fr/argent/article/2026/06/29/panneaux-solaires-la-batterie-devient-elle-obligatoire-pour-rentabiliser-l-investissement_6716831_1657007.html?search-type=classic&ise_click_rank=1](https://www.lemonde.fr/argent/article/2026/06/29/panneaux-solaires-la-batterie-devient-elle-obligatoire-pour-rentabiliser-l-investissement_6716831_1657007.html?search-type=classic&ise_click_rank=1)

Pour répondre à ce type de questions, le CEA développe l'outil Cairn
Open
[https://github.com/CEA-Liten/CairnOpen](https://github.com/CEA-Liten/CairnOpen)
, qui permet d'optimiser le dimensionnement et le pilotage de systèmes
énergétiques décarbonés. Cet outil est facilement utilisable pour un
ingénieur grâce à son interface graphique, mais reste trop complexe pour
le grand public. Pour répondre à cette question spécifique mais
dépendant de la production solaire, de la consommation du ménage et du
contexte économique, on souhaite développer une interface web simplifiée
pour le grand public.

## Attendus

-   Développement d'un modèle générique représentant le système à
    optimiser à l'aide de CairnOpen.

-   Développement d'une interface graphique web simplifiée, avec la
    technologie "Streamlit".
    [https://streamlit.io/](https://streamlit.io/) qui
    permet à l'utilisateur de modifier uniquement les paramètres
    d'intérêt:

    -   La consommation heure par heure du ménage

    -   Les couts de rachat de l'électricité

    -   Le productible solaire

> De lancer le calcul et de visualiser les résultats:

-   les tailles installées du PV et de la batterie

-   Un temps de retour sur investissement

<!-- -->

-   Production d'une documentation / vidéo permettant de vulgariser et
    de rendre transparent au maximum l'outil pour un utilisateur grand
    public.

-   Les élèves travailleront sur Github, et s'attacheront à produire un
    code commenté, réutilisable et maintenable. Si la qualité est
    suffisante, l'outil sera diffusé en Open Source au grand public.

## Références

[https://github.com/CEA-Liten/CairnOpen](https://github.com/CEA-Liten/CairnOpen)

[https://pvgis.com/fr/calculateur-solaire-pvgis](https://pvgis.com/fr/calculateur-solaire-pvgis)
: cet outil permet de simuler un système PV-batterie mais pas d'en
optimiser la taille.

Contact :
[pimprenelle.parmentier@cea.fr](mailto:pimprenelle.parmentier@cea.fr)
