import random

# Volume total visé (en mètres) selon le niveau
VOLUMES = {"debutant": 1000, "intermediaire": 1800, "avance": 2800}

# Séries principales par objectif : (texte, distance d'une répétition)
MAIN_SETS = {
    "endurance": [
        ("{reps} x {dist} m allure souple, 20 s de repos", 200),
        ("{reps} x {dist} m régulier, 30 s de repos", 400),
    ],
    "vitesse": [
        ("{reps} x {dist} m sprint, 45 s de repos", 25),
        ("{reps} x {dist} m rapide, 30 s de repos", 50),
    ],
    "technique": [
        ("{reps} x {dist} m éducatifs, 20 s de repos", 50),
        ("{reps} x {dist} m respiration 3 temps, 15 s de repos", 100),
    ],
}


def generate_session(level, goal):
    total = VOLUMES[level]
    warmup = int(total * 0.2)
    cooldown = int(total * 0.1)
    main_target = total - warmup - cooldown

    text, dist = random.choice(MAIN_SETS[goal])
    reps = max(1, main_target // dist)

    print(f"Niveau : {level} | Objectif : {goal}")
    print(f"Échauffement : {warmup} m nage libre souple")
    print(f"Série principale : {text.format(reps=reps, dist=dist)}")
    print(f"Retour au calme : {cooldown} m dos ou nage libre souple")
    print(f"Total : {warmup + reps * dist + cooldown} m")


generate_session("intermediaire", "endurance")

