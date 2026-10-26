import json
import random
from pathlib import Path

DATA_FILE = Path(__file__).parent / "data" / "exercices.json"

# Volume total visé (en mètres) selon le niveau
VOLUMES = {"debutant": 1000, "intermediaire": 1800, "avance": 2800}


def charger_donnees():
    """Lit la base de séances dans le fichier JSON."""
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


DONNEES = charger_donnees()
OBJECTIFS = sorted({s["objectif"] for s in DONNEES["series"]})


def generate_session(level, goal):
    """Construit une séance et la renvoie sous forme de dictionnaire."""
    total = VOLUMES[level]
    warmup = int(total * 0.2)
    cooldown = int(total * 0.1)
    main_target = total - warmup - cooldown

    # On ne garde que les séries adaptées à l'objectif et au niveau
    candidates = [
        s for s in DONNEES["series"]
        if s["objectif"] == goal and level in s["niveaux"]
    ]
    serie = random.choice(candidates)
    reps = max(1, main_target // serie["distance"])

    return {
        "niveau": level,
        "objectif": goal,
        "echauffement": f"{warmup} m {random.choice(DONNEES['echauffements'])}",
        "serie_principale": (
            f"{reps} x {serie['distance']} m {serie['description']}, "
            f"{serie['repos']} s de repos"
        ),
        "retour_au_calme": f"{cooldown} m {random.choice(DONNEES['retours_au_calme'])}",
        "total": warmup + reps * serie["distance"] + cooldown,
    }


def afficher_session(session):
    print(f"Niveau : {session['niveau']} | Objectif : {session['objectif']}")
    print(f"Échauffement : {session['echauffement']}")
    print(f"Série principale : {session['serie_principale']}")
    print(f"Retour au calme : {session['retour_au_calme']}")
    print(f"Total : {session['total']} m")


def demander_choix(question, options):
    """Pose une question et répète tant que la réponse n'est pas valide."""
    while True:
        reponse = input(f"{question} ({' / '.join(options)}) : ").strip().lower()
        if reponse in options:
            return reponse
        print("Choix invalide, réessaie.")


if __name__ == "__main__":
    niveau = demander_choix("Ton niveau", list(VOLUMES))
    objectif = demander_choix("Ton objectif", OBJECTIFS)
    print()
    afficher_session(generate_session(niveau, objectif))

    