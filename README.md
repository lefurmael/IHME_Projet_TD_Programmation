# Planificateur de séances de natation

Application de planification et de suivi de séances de natation. L'interface web
utilise React et Express; le générateur Python reste disponible dans le terminal.

## Fonctionnalités

- Trois niveaux : débutant, intermédiaire, avancé
- Trois objectifs : endurance, vitesse, technique
- Durée au choix : 30, 45 ou 60 minutes
- Nage au choix : crawl, dos, brasse ou séance mixte
- Séances composées d'un échauffement, de deux séries principales et d'un retour au calme
- Journal local des séances, bilans, difficultés ressenties et notes personnelles
- Ajustement modéré du volume selon les bilans comparables récents
- Interface web déployable sur l'espace IHME de la promotion

## Prérequis

- Python 3.10 ou plus récent
- Node.js 24 et npm pour l'interface web
- Git

## Installation

```bash
git clone https://github.com/lefurmael/IHME_Projet_TD_Programmation.git
cd IHME_Projet_TD_Programmation
python3 -m venv .venv
source .venv/bin/activate
```

## Lancer l'interface web avec Docker

```bash
docker compose up --build
```

Ouvre ensuite <http://localhost:5002>. PostgreSQL conserve l'historique dans un
volume Docker local. Arrête les services avec `Ctrl+C`.

Pour lancer l'interface sans Docker, il faut Node.js 24 et un serveur PostgreSQL :

```bash
npm install
docker compose up -d db
cp .env.example .env
npm run db:migrate
npm run dev:api
npm run dev
```

## Déployer sur l'espace IHME

Le workflow `.github/workflows/publish.yml` construit et publie une image après
chaque push sur `main` ou `master`. Pour la déployer, ouvrir **Actions** sur
GitHub, choisir **Construire et publier l'image**, cliquer **Run workflow** et
cocher l'option de déploiement.

Dans les paramètres **Settings → Secrets and variables → Actions** du dépôt,
configurer `IHME_BASE_PATH` (le chemin attribué, ici `/projet-td-programmation/`),
`IHME_DEPLOY_URL` et le secret `IHME_DEPLOY_TOKEN` reçus de l'enseignant. Ne
jamais ajouter le jeton au dépôt ni le partager dans une capture ou un message.
Le dépôt d'image doit être autorisé par l'enseignant. Voir le
[guide étudiant du professeur](https://github.com/cedrictisseyre/ihme-suivi/blob/main/docs/deployer-son-projet.md).

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
Sur l'hébergement partagé du cours, utilise uniquement des données fictives :
n'y saisis pas de note personnelle ou d'information de santé réelle.

Pour lancer les tests du moteur Python :

```bash
python -m unittest discover -s tests
```

Pour tester le moteur Node (Node.js 24 requis) :

```bash
npm test
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
├── server/
│   ├── app.js
│   ├── db.js
│   ├── index.js
│   └── session.js
├── src/
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── package.json
├── deploy/request.py
├── .github/workflows/publish.yml
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