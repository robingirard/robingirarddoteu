# Construire le site en local

Le `README.md` est celui du thème *online-cv* et décrit une installation
générique. Voici ce qui marche réellement sur cette machine.

## La contrainte : Ruby 3.3, ni plus ni moins

Le Ruby du système est le **2.6.10** livré par macOS, trop vieux pour
`github-pages` — d'où le `Could not find 'bundler' (2.3.19)` qu'on obtient en
tapant `bundle` sans rien préciser.

Mais le Ruby **3.4** de Homebrew ne marche pas non plus : `nokogiri 1.16.7`,
que `github-pages 232` traîne via `jekyll-mentions`, n'a pas de binaire
précompilé pour 3.4 et échoue à la compilation. Il faut donc **3.3**,
installé en *keg-only* le 1er septembre 2026 :

    brew install ruby@3.3

## Construire

    export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"
    bundle _2.3.19_ install          # une seule fois, gems dans vendor/bundle
    bundle _2.3.19_ exec jekyll build

Et pour prévisualiser sur <http://localhost:4000> :

    bundle _2.3.19_ exec jekyll serve

Le `_2.3.19_` épingle la version de bundler inscrite dans `Gemfile.lock` : sans
lui, on prend bundler 4 par défaut, dont les réglages ne sont plus les mêmes.

`vendor/` et `.bundle/` sont ignorés par git — GitHub Pages reconstruit de son
côté et n'utilise ni l'un ni l'autre. `Gemfile.lock` a gagné la plateforme
`arm64-darwin-25` (macOS 26) au passage, ce qui est sans effet en production
puisque GitHub Pages ignore ce fichier.

## À savoir

`_site/` est **versionné** dans ce dépôt, ce qui est inhabituel : chaque build
local produit donc un diff sur des dizaines de fichiers générés. C'est sans
conséquence pour la publication, mais ça noie le diff utile. À nettoyer un jour.
