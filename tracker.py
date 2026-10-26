import json
from datetime import datetime
from pathlib import Path

TRACKING_FILE = Path(__file__).parent / "data" / "suivi.json"


def charger_suivi():
    """Renvoie les séances enregistrées, ou une liste vide au premier lancement."""
    if not TRACKING_FILE.exists():
        return []
    with open(TRACKING_FILE, encoding="utf-8") as fichier:
        return json.load(fichier)


def _sauvegarder_suivi(seances):
    TRACKING_FILE.parent.mkdir(parents=True, exist_ok=True)
    TRACKING_FILE.write_text(
        json.dumps(seances, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def enregistrer_seance(session):
    """Ajoute une séance générée au journal, en attente de son bilan."""
    seances = charger_suivi()
    enregistrement = {
        **session,
        "id": max((seance["id"] for seance in seances), default=0) + 1,
        "date": datetime.now().astimezone().isoformat(timespec="minutes"),
        "bilan_enregistre": False,
        "effectue": None,
        "ressenti": None,
        "note": "",
    }
    seances.append(enregistrement)
    _sauvegarder_suivi(seances)
    return enregistrement


def seances_a_bilan():
    return [seance for seance in charger_suivi() if not seance["bilan_enregistre"]]


def enregistrer_bilan(identifiant, effectue, ressenti, note=""):
    seances = charger_suivi()
    for seance in seances:
        if seance["id"] == identifiant:
            seance["bilan_enregistre"] = True
            seance["effectue"] = effectue
            seance["ressenti"] = ressenti
            seance["note"] = note.strip()
            _sauvegarder_suivi(seances)
            return
    raise ValueError(f"Séance introuvable : {identifiant}")


def calculer_ajustement(seances, niveau, objectif, nage):
    """Adapte le volume selon les trois derniers bilans comparables."""
    recentes = [
        seance
        for seance in reversed(seances)
        if seance["niveau"] == niveau
        and seance["objectif"] == objectif
        and seance["nage"] == nage
        and seance["bilan_enregistre"]
        and seance["effectue"] == "oui"
        and seance["ressenti"]
    ][:3]
    if not recentes:
        return 0, "Pas encore de bilan comparable : volume standard."

    dernier_ressenti = recentes[0]["ressenti"]
    if dernier_ressenti == "trop_difficile":
        return -0.15, "La dernière séance comparable était trop difficile : volume réduit de 15 %."
    if dernier_ressenti == "difficile":
        return -0.10, "La dernière séance comparable était difficile : volume réduit de 10 %."

    ressentis = [seance["ressenti"] for seance in recentes]
    faciles = sum(ressenti in ("tres_facile", "facile") for ressenti in ressentis)
    difficiles = any(ressenti in ("difficile", "trop_difficile") for ressenti in ressentis)
    if faciles >= 2 and not difficiles:
        return 0.05, "Au moins deux séances récentes étaient faciles : volume augmenté de 5 %."
    return 0, "Les derniers ressentis ne justifient pas de changement de volume."