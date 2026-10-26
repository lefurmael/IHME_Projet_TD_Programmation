# Planificateur de séances de natation

Petit outil en Python qui propose une séance de natation adaptée à ton niveau
et à ce que tu veux travailler (endurance, vitesse, technique).

## Fonctionnalités

- Trois niveaux : débutant, intermédiaire, avancé
- Trois objectifs : endurance, vitesse, technique
- Séance en trois parties : échauffement, série principale, retour au calme
- Volume total adapté au niveau, série principale tirée au hasard

## Prérequis

- Python 3.10 ou plus récent
- Git

## Installation

```bash
git clone https://github.com/lefurmael/IHME_Projet_TD_Programmation.git
cd IHME_Projet_TD_Programmation
python3 -m venv .venv
source .venv/bin/activate
```

## Utilisation

```bash
python3 generator.py
```

Le programme demande ton niveau puis ton objectif, et affiche la séance.

Exemple :

```
Ton niveau (debutant / intermediaire / avance) : intermediaire
Ton objectif (endurance / vitesse / technique) : endurance

Niveau : intermediaire | Objectif : endurance
Échauffement : 360 m nage libre souple
Série principale : 3 x 400 m régulier, 30 s de repos
Retour au calme : 180 m dos ou nage libre souple
Total : 1740 m
```

## Structure du projet

```
.
├── generator.py   # génération des séances
├── .gitignore
└── README.md
```

## Pistes d'amélioration

- Choix de la durée de la séance et de la nage
- Interface web (Streamlit)
- Calculateur d'allures
- Séries stockées dans un fichier JSON
- Tests automatisés

## Avertissement

Les séances sont des propositions générales et ne remplacent pas l'avis
d'un entraîneur.

## Auteur

Maël LEFUR