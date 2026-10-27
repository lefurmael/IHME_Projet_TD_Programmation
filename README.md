# Planificateur de séances de natation

Petit outil en Python qui propose des séances de natation selon le niveau,
l'objectif, la durée et la nage souhaitée, puis permet de suivre les entraînements.

## Fonctionnalités

- Trois niveaux : débutant, intermédiaire, avancé
- Trois objectifs : endurance, vitesse, technique
- Durée au choix : 30, 45 ou 60 minutes
- Nage au choix : crawl, dos, brasse ou séance mixte
- Séances composées d'un échauffement, de deux séries principales et d'un retour au calme
- Journal local des séances, bilans, difficultés ressenties et notes personnelles
- Ajustement modéré du volume selon les bilans comparables récents

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

## Lancer l'interface web

```bash
docker compose up --build
```

Ouvre ensuite <http://localhost:5002>. Le dossier `data/` est monté dans le
conteneur pour conserver ton journal entre deux lancements. Arrête le serveur
avec `Ctrl+C`.

Sans Docker, tu peux lancer l'interface localement :

```bash
pip install -r requirements.txt
python webapp.py
```

## Utiliser le générateur en terminal

```bash
python generator.py
```

Le menu terminal permet aussi de générer une séance, d'enregistrer un bilan et
de consulter l'historique. Une séance générée est conservée comme « à faire ».

Pour enregistrer un bilan, indique si la séance a été faite, sa difficulté
ressentie (`tres_facile`, `facile`, `adaptee`, `difficile` ou `trop_difficile`)
et une note facultative.

Le journal est enregistré dans `data/suivi.json` et reste sur ton ordinateur.
Ce fichier est ignoré par Git pour ne pas publier tes données personnelles.

Pour lancer les tests automatisés :

```bash
python -m unittest discover -s tests
```

## Adaptation du volume

L'adaptation ne concerne que les séances entièrement réalisées avec le même
niveau, objectif et nage. Une séance ressentie « difficile » réduit le volume
suivant de 10 %, une séance « trop difficile » de 15 %. Après au moins deux
séances faciles parmi les trois dernières et sans ressenti difficile, le volume
augmente de 5 %. Dans les autres cas, le volume reste standard. Le programme
affiche la raison de l'adaptation.

## Structure du projet

```
.
├── generator.py
├── tracker.py
├── webapp.py
├── templates/
│   ├── base.html
│   ├── index.html
│   └── history.html
├── static/
│   └── style.css
├── Dockerfile
├── compose.yaml
├── requirements.txt
├── data/
│   └── exercices.json
├── tests/
│   ├── test_tracker.py
│   └── test_webapp.py
├── .gitignore
└── README.md
```

## Avertissement

Les séances sont des propositions générales et ne remplacent pas l'avis
d'un entraîneur.

## Auteur

Maël LEFUR