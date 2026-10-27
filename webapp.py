import os

from flask import Flask, flash, redirect, render_template, request, url_for

import generator
import tracker

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "local-swim-planner-key")

NIVEAU_LABELS = {
    "debutant": "Débutant",
    "intermediaire": "Intermédiaire",
    "avance": "Avancé",
}
OBJECTIF_LABELS = {
    "endurance": "Endurance",
    "technique": "Technique",
    "vitesse": "Vitesse",
}
NAGE_LABELS = {"crawl": "Crawl", "dos": "Dos", "brasse": "Brasse", "mixte": "Mixte"}
RESSENTI_LABELS = {
    "tres_facile": "Très facile",
    "facile": "Facile",
    "adaptee": "Adaptée",
    "difficile": "Difficile",
    "trop_difficile": "Trop difficile",
}
EFFECTUE_OPTIONS = {"oui": "Terminée", "partiellement": "Partielle", "non": "Non réalisée"}


@app.context_processor
def injecter_labels():
    return {
        "niveau_labels": NIVEAU_LABELS,
        "objectif_labels": OBJECTIF_LABELS,
        "nage_labels": NAGE_LABELS,
        "ressenti_labels": RESSENTI_LABELS,
        "effectue_options": EFFECTUE_OPTIONS,
    }


def _date_courte(iso_date):
    return iso_date[:10] if iso_date else ""


@app.get("/")
def dashboard():
    seances = tracker.charger_suivi()
    terminees = [seance for seance in seances if seance["effectue"] == "oui"]
    nouvelles_seance = request.args.get("seance", type=int)
    session_selectionnee = next(
        (seance for seance in seances if seance["id"] == nouvelles_seance), None
    )
    en_attente = [seance for seance in reversed(seances) if not seance["bilan_enregistre"]]
    derniere = seances[-1] if seances else None
    stats = {
        "seances": len(terminees),
        "volume": sum(seance["total"] for seance in terminees),
        "en_attente": len(en_attente),
    }
    return render_template(
        "index.html",
        stats=stats,
        en_attente=en_attente[:3],
        derniere=derniere,
        session_selectionnee=session_selectionnee,
        dates={seance["id"]: _date_courte(seance["date"]) for seance in seances},
        niveaux=generator.VOLUMES,
        objectifs=OBJECTIF_LABELS,
        durees=generator.DUREES,
        nages=NAGE_LABELS,
    )


@app.get("/historique")
def historique():
    seances = list(reversed(tracker.charger_suivi()))
    return render_template(
        "history.html",
        seances=seances,
        dates={seance["id"]: _date_courte(seance["date"]) for seance in seances},
    )


@app.post("/seances/generer")
def generer():
    niveau = request.form.get("niveau", "")
    objectif = request.form.get("objectif", "")
    nage = request.form.get("nage", "")
    try:
        pool_length = int(request.form.get("pool_length", "25"))
    except ValueError:
        pool_length = 0
    try:
        duree = int(request.form.get("duree", ""))
    except ValueError:
        duree = 0

    if (
        niveau not in generator.VOLUMES
        or objectif not in generator.OBJECTIFS
        or nage not in generator.NAGES
        or pool_length not in generator.LONGUEURS_BASSIN
        or duree not in generator.DUREES
    ):
        flash("Vérifie les critères de ta séance.", "error")
        return redirect(url_for("dashboard"))

    ajustement, raison = tracker.calculer_ajustement(
        tracker.charger_suivi(), niveau, objectif, nage, pool_length
    )
    session = generator.generate_session(
        niveau,
        objectif,
        duree,
        nage,
        volume_factor=1 + ajustement,
        pool_length=pool_length,
    )
    session["raison_adaptation"] = raison
    enregistrement = tracker.enregistrer_seance(session)
    flash("Ta séance est prête et ajoutée à ton suivi.", "success")
    return redirect(url_for("dashboard", seance=enregistrement["id"]) + "#nouvelle-seance")


@app.post("/seances/<int:identifiant>/bilan")
def enregistrer_bilan(identifiant):
    effectue = request.form.get("effectue", "")
    ressenti = request.form.get("ressenti", "")
    if effectue not in EFFECTUE_OPTIONS or ressenti not in RESSENTI_LABELS:
        flash("Choisis un statut et un ressenti valides.", "error")
        return redirect(url_for("historique"))
    try:
        tracker.enregistrer_bilan(
            identifiant, effectue, ressenti, request.form.get("note", "")
        )
    except ValueError:
        flash("Cette séance n'existe pas dans le suivi.", "error")
        return redirect(url_for("historique"))
    flash("Bilan enregistré.", "success")
    return redirect(url_for("historique"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=False)