import json
import random
from pathlib import Path

import tracker

DATA_FILE = Path(__file__).parent / "data" / "exercices.json"

# Volume total visé (en mètres) selon le niveau
VOLUMES = {"debutant": 1000, "intermediaire": 1800, "avance": 2800}
DUREES = [30, 45, 60]
NAGES = ["crawl", "dos", "brasse", "mixte"]


def charger_donnees():
    """Lit la base de séances dans le fichier JSON."""
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


DONNEES = charger_donnees()
OBJECTIFS = sorted({s["objectif"] for s in DONNEES["series"]})


def generate_session(level, goal, duration=45, nage="mixte", volume_factor=1.0):
    """Construit une séance et la renvoie sous forme de dictionnaire."""
    total = int(VOLUMES[level] * duration / 45 * volume_factor)
    warmup = int(total * 0.2)
    cooldown = int(total * 0.1)
    main_target = total - warmup - cooldown

    # On ne garde que les séries adaptées à l'objectif, au niveau et à la nage.
    candidates = [
        s for s in DONNEES["series"]
        if s["objectif"] == goal
        and level in s["niveaux"]
        and (nage == "mixte" or nage in s["nages"])
    ]
    if not candidates:
        raise ValueError("Aucune série disponible pour ces critères.")

    series = random.sample(candidates, k=min(2, len(candidates)))
    block_target = main_target // len(series)
    main_sets = []
    main_total = 0
    for serie in series:
        reps = max(1, block_target // serie["distance"])
        distance = reps * serie["distance"]
        main_total += distance
        main_sets.append(
            f"{reps} x {serie['distance']} m {serie['description']}, "
            f"{serie['repos']} s de repos"
        )

    return {
        "niveau": level,
        "objectif": goal,
        "duree": duration,
        "nage": nage,
        "adaptation_volume": int(round((volume_factor - 1) * 100)),
        "echauffement": f"{warmup} m {random.choice(DONNEES['echauffements'])}",
        "series_principales": main_sets,
        "retour_au_calme": f"{cooldown} m {random.choice(DONNEES['retours_au_calme'])}",
        "total": warmup + main_total + cooldown,
    }


def afficher_session(session):
    print(
        f"Niveau : {session['niveau']} | Objectif : {session['objectif']} | "
        f"Durée : {session['duree']} min | Nage : {session['nage']}"
    )
    if session.get("adaptation_volume", 0):
        print(f"Adaptation du suivi : {session['adaptation_volume']:+d} % du volume")
    print(f"Échauffement : {session['echauffement']}")
    print("Séries principales :")
    for serie in session["series_principales"]:
        print(f"- {serie}")
    print(f"Retour au calme : {session['retour_au_calme']}")
    print(f"Total : {session['total']} m")


def demander_choix(question, options):
    """Pose une question et répète tant que la réponse n'est pas valide."""
    while True:
        reponse = input(f"{question} ({' / '.join(options)}) : ").strip().lower()
        if reponse in options:
            return reponse
        print("Choix invalide, réessaie.")


def generer_seance():
    niveau = demander_choix("Ton niveau", list(VOLUMES))
    objectif = demander_choix("Ton objectif", OBJECTIFS)
    duree = int(demander_choix("Durée en minutes", [str(d) for d in DUREES]))
    nage = demander_choix("Ta nage", NAGES)

    ajustement, raison = tracker.calculer_ajustement(
        tracker.charger_suivi(), niveau, objectif, nage
    )
    print()
    session = generate_session(niveau, objectif, duree, nage, 1 + ajustement)
    afficher_session(session)
    enregistrement = tracker.enregistrer_seance(session)
    print(f"Séance ajoutée au suivi (n° {enregistrement['id']}).")
    if raison:
        print(f"Pourquoi ce volume ? {raison}")


def enregistrer_bilan():
    seances = tracker.seances_a_bilan()
    if not seances:
        print("Aucune séance à évaluer. Génère d'abord une séance.")
        return

    print("Séances à évaluer :")
    for seance in seances:
        print(
            f"N° {seance['id']} | {seance['date']} | {seance['niveau']} | "
            f"{seance['objectif']} | {seance['duree']} min | {seance['nage']}"
        )
    identifiants = [str(seance["id"]) for seance in seances]
    identifiant = int(demander_choix("Numéro de la séance", identifiants))
    effectue = demander_choix("Séance réalisée ?", ["oui", "partiellement", "non"])
    ressenti = demander_choix(
        "Difficulté ressentie",
        ["tres_facile", "facile", "adaptee", "difficile", "trop_difficile"],
    )
    note = input("Note facultative (Entrée pour passer) : ").strip()
    tracker.enregistrer_bilan(identifiant, effectue, ressenti, note)
    print("Bilan enregistré.")


def afficher_historique():
    seances = tracker.charger_suivi()
    if not seances:
        print("L'historique est vide. Génère une séance pour commencer le suivi.")
        return

    print("Historique des séances :")
    for seance in reversed(seances):
        bilan = "à faire"
        if seance["bilan_enregistre"]:
            bilan = f"{seance['effectue']} | ressenti : {seance['ressenti']}"
            if seance["note"]:
                bilan += f" | note : {seance['note']}"
        print(
            f"N° {seance['id']} | {seance['date']} | {seance['niveau']} | "
            f"{seance['objectif']} | {seance['nage']} | {seance['total']} m | {bilan}"
        )


def main():
    while True:
        print("\n1. Générer une séance")
        print("2. Enregistrer un bilan")
        print("3. Voir l'historique")
        print("0. Quitter")
        choix = demander_choix("Que veux-tu faire ?", ["1", "2", "3", "0"])
        if choix == "1":
            generer_seance()
        elif choix == "2":
            enregistrer_bilan()
        elif choix == "3":
            afficher_historique()
        else:
            break


if __name__ == "__main__":
    main()

    