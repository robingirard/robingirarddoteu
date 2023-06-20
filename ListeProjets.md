---
permalink: ListeProjetsPrecedents
---
{%assign precyear = 2022%}

# Liste des Projets

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
{%assign precyear = 2022%}
<h4>
         <a id="annee{{precyear}}"> Année - {{precyear}}
         <br> <br>
{% for projet in site.UE14Projects reversed %}
      {% if projet.year != precyear %}
         {%assign precyear=projet.year %}

         <br>
         <a id="annee{{projet.year}}"> Année - {{projet.year}}
         <br> <br>

      {% else %}

      {% endif %}

      {{ projet.year }} - Sujet N°{{ projet.number }} - <a href="{{ projet.url }}">{{ projet.name }} </a>
        Encadrant : {{projet.Encadrant}} |  <a href="{{ site.url }}/assets/Posters/{{projet.year}}/UE14{{projet.year}}-S{{projet.number}}.pdf"> Poster </a>
        <br>
{% endfor %}
