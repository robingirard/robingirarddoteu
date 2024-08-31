---
permalink: ListeProjetsPrecedents
layout: default_2
---
{%assign precyear = 2024%}
{%assign curyear = 2024%}

# Liste des Projets passés

Cette page contient la liste des mini-projets des années passées de l'unité d'enseignement "terre et société" (UE 14) en première année à l'Ecole des Mines de Paris.
 - Si vous voulez accéder à la liste des projets proposés cette année, c'est [ici]({{site.url}}/ListeProjetsCourants.html).
 - Si vous souhaitez revenir à la page des miniprojets de l'UE14 c'est [ici]({{site.url}}/MINES-UE14-miniprojet.html).
 - Si vous souhaitez revenir à ma page principale, c'est [ici]({{site.url}}/index.html).

## Table des années disponibles :

<a href="#annee{{precyear}}"> {{precyear}}</a>
{% for projet in site.UE14Projects reversed %}
      {% if projet.year != precyear %}
         {%assign precyear=projet.year %}
<a href="#annee{{projet.year}}"> {{projet.year}}</a>
      {% else %}
      {% endif %}
{% endfor %}

## Détails :
{%assign precyear = 2024%}
<h4>
         <a id="annee{{precyear}}"> Année - {{precyear}}
         <br> <br>
{% for projet in site.UE14Projects reversed %}
      {% if projet.year != precyear %}
         {%assign precyear=projet.year %}
         {% if projet.year != curyear %}
           <br>
           <a id="annee{{projet.year}}"> Année - {{projet.year}}
           <br> <br>
         {% else %}

         {% endif %}
      {% else %}

      {% endif %}
      {% if projet.year != curyear %}
        {{ projet.year }} - Sujet N°{{ projet.number }} - <a href="{{ projet.url }}">{{ projet.name }} </a>
          Encadrant : {{projet.Encadrant}} |  <a href="{{ site.url }}/assets/Posters/{{projet.year}}/UE14{{projet.year}}-S{{projet.number}}.pdf"> Poster </a>
          <br>
      {% else %}

      {% endif %}


{% endfor %}
