# Planificateur de séances de natation

Petit outil en Python qui propose une séance de natation adaptée à ton niveau
et à ce que tu veux travailler (endurance, vitesse, technique).

## Fonctionnalités

- Trois niveaux : débutant, intermédiaire, avancé
- Trois objectifs : endurance, vitesse, technique
- Durée au choix : 30, 45 ou 60 minutes
- Nage au choix : crawl, dos, brasse ou séance mixte
- Séance en trois parties : échauffement, deux séries principales, retour au calme
- Volume adapté au niveau et à la durée, exercices tirés au hasard selon les critères

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

Le programme demande ton niveau, ton objectif, la durée et la nage, puis affiche
une séance composée de plusieurs séries.

Exemple :

```
Ton niveau (debutant / intermediaire / avance) : intermediaire
Ton objectif (endurance / vitesse / technique) : endurance
Durée en minutes (30 / 45 / 60) : 45
Ta nage (crawl / dos / brasse / mixte) : crawl

Niveau : intermediaire | Objectif : endurance | Durée : 45 min | Nage : crawl
Échauffement : 360 m nage libre souple
Séries principales :
- 3 x 200 m progressif, accélération sur les derniers mètres, 25 s de repos
- 3 x 200 m allure souple, 20 s de repos
Retour au calme : 180 m dos ou nage libre souple
Total : 1740 m
```

## Structure du projet

```
.
├── generator.py   # génération des séances
├── data/
│   └── exercices.json  # échauffements, récupérations et séries
├── .gitignore
└── README.md
```

## Pistes d'amélioration

- Choix du matériel disponible
- Interface web (Streamlit)
- Calculateur d'allures
- Séries stockées dans un fichier JSON
- Tests automatisés

## Avertissement

Les séances sont des propositions générales et ne remplacent pas l'avis
d'un entraîneur.

## Auteur

Maël LEFUR