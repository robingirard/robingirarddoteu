---
permalink: ListeProjetsCourants
layout: default_2
---
{%assign precyear = 2023%}

# Liste des Projets passés

Cette page contient la liste des mini-projets proposés cette année pour l'unité d'enseignement "terre et société" (UE 14) en première année à l'Ecole des Mines de Paris. Si vous souhaitez revenir à la page des miniprojet de l'UE14 par exemple pour relire les instructions et noter les dates importantes c'est [ici]({{site.url}}/MINES-UE14-miniprojet.html). Si vous souhaitez voir la liste des projets des années précédentes, c'est c'est [ici]({{site.url}}/ListeProjetsPrecedents.html). Si vous souhaitez revenir à ma page principale, c'est [ici]({{site.url}}/index.html).

## Projets proposés
{%assign curyear = 2023%}
<h4>
         <a id="annee{{precyear}}"> Année - {{precyear}}
         <br> <br>
{% for projet in site.UE14Projects reversed %}
      {% if projet.year == curyear %}

         <br>
         <a id="annee{{projet.year}}"> Année - {{projet.year}}
         <br> <br>

      {% else %}

      {% endif %}

      {{ projet.year }} - Sujet N°{{ projet.number }} - <a href="{{ projet.url }}">{{ projet.name }} </a>
        Encadrant : {{projet.Encadrant}} |  <a href="{{ site.url }}/assets/Posters/{{projet.year}}/UE14{{projet.year}}-S{{projet.number}}.pdf"> Poster </a>
        <br>
{% endfor %}