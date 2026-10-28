# Ligne d'eau - carnet de natation

Ligne d'eau aide les nageurs à préparer une séance adaptée à leur niveau, leur objectif et leur bassin, puis à garder une trace de leurs entraînements.

## Pourquoi cette application ?

Quand on nage librement, il peut être difficile de choisir un volume réaliste, de varier les exercices et de se souvenir des séances précédentes. Ligne d'eau propose une séance structurée et permet d'enregistrer un bilan ensuite.

Elle s'adresse aux nageurs débutants à avancés qui souhaitent organiser leurs entraînements libres. Les séances proposées restent générales et ne remplacent pas les conseils d'un entraîneur.

## Créer une séance

Depuis [l'espace Ligne d'eau](https://node219697-ihme26.jcloud.ik-server.com/projet-td-programmation/), choisis ton niveau, ton objectif, le temps disponible, la nage et la longueur du bassin : 25 ou 50 m.

La séance comprend un échauffement, deux séries principales et un retour au calme. Toutes les distances sont des multiples exacts du bassin choisi : en bassin de 25 m, les blocs font 25, 50, 75 m, etc.; en bassin de 50 m, ils font 50, 100, 150 m, etc.

Lors de la première visite, crée un compte avec une adresse e-mail et un mot de passe d'au moins 10 caractères. Les visites suivantes permettent de se connecter et de retrouver son espace. Le mot de passe est stocké sous forme de hachage; la session de connexion est conservée dans un cookie HttpOnly pendant 30 jours. Il n'y a pas de procédure de récupération de mot de passe.

## Après la nage

Dans l'historique, indique si la séance est terminée, partielle ou non réalisée, puis note le ressenti : très facile, facile, adaptée, difficile ou trop difficile. Une note facultative peut garder un commentaire d'entraînement.

Chaque séance de l'historique peut être supprimée individuellement avec le bouton correspondant. Une confirmation est demandée avant l'effacement, qui est définitif et ne concerne que cette séance de ton compte.

Pour une même combinaison de niveau, objectif, nage et longueur de bassin, les bilans de séances terminées peuvent modérer le volume proposé :

- Séance difficile : volume réduit de 10 %
- Séance trop difficile : volume réduit de 15 %
- Au moins deux séances faciles parmi les trois dernières : volume augmenté de 5 %
- Sinon : volume standard

Le programme explique les ajustements. Les séances partielles ou non réalisées ne déclenchent pas de progression.

## Tests chronométrés

Dans l'onglet « Tests », choisis un test de 50, 200 ou 400 m, puis saisis la durée en minutes et secondes. Le carnet conserve chaque résultat dans ton compte, calcule l'allure moyenne par 100 m et met en avant ton meilleur temps pour chacune des trois distances. Les temps sont des mesures saisies par le nageur; l'allure est une moyenne calculée à partir de la distance et du temps, pas une évaluation automatique du niveau.

## Comptes et confidentialité

Chaque compte dispose de son propre historique : les séances, bilans et ajustements de volume ne sont accessibles qu'après connexion au compte qui les a créés. Utilise une adresse fictive (par exemple `nageur@example.test`) sur cette démonstration pédagogique, et n'y saisis pas d'informations personnelles réelles, de santé ou de commentaire confidentiel. Le mot de passe ne peut pas être récupéré; garde-le en lieu sûr.

L'historique commun présent avant l'activation des comptes sera remis à zéro une seule fois par la migration de base de données en environnement de production. La migration s'exécute au démarrage de la nouvelle version; le site hébergé ne changera qu'après son déploiement. Elle ne supprime pas l'historique d'une base locale de développement. Les anciennes séances locales qui n'ont pas de compte restent sans propriétaire et ne sont donc pas affichées dans un compte.

## Pour les développeurs

Le générateur peut aussi être lancé en terminal avec `python generator.py`. Les tests Python se lancent avec :

```bash
python -m unittest discover -s tests
```

La version web utilise React, Express et PostgreSQL. Pour la construire et la déployer, consulte le [guide étudiant du cours IHME](https://github.com/cedrictisseyre/ihme-suivi/blob/main/docs/deployer-son-projet.md).

## Historique des modifications

Chaque modification fonctionnelle réalisée avec l'utilisateur doit être ajoutée ici, avec son intérêt et ses conséquences visibles.

### 2026-10-28 — Comptes personnels et remise à zéro de l'historique hébergé

- Ajout de la création de compte et de la connexion par adresse e-mail et mot de passe : chacun peut retrouver son carnet sur plusieurs visites sans voir celui des autres. Les mots de passe sont hachés avec scrypt; les sessions utilisent un cookie HttpOnly, SameSite=Lax, d'une durée de 30 jours et limité au chemin de l'application. Aucune récupération de mot de passe n'est prévue.
- Cloisonnement par compte des séances, bilans et séances comparables utilisées pour adapter le volume : cela empêche de mélanger les données de plusieurs nageurs.
- Ajout d'une migration de production exécutée une seule fois qui supprime l'ancien historique partagé et réinitialise les identifiants de séances. Les bases locales ne sont pas vidées; leurs anciennes séances non attribuées ne sont pas visibles dans les carnets.
- Ajout d'un écran de connexion/création de compte, de l'affichage du compte connecté et de la déconnexion pour rendre l'accès personnel visible et utilisable; le chemin de base de l'application est transmis à l'image afin de limiter le cookie au bon chemin.
- Documentation des étapes d'accès et de confidentialité, et tests des hachages, de l'inscription et de la protection de l'historique.

### 2026-10-28 — Suppression des séances et tests chronométrés

- Ajout d'une suppression individuelle depuis l'historique avec confirmation : cela permet de retirer une séance enregistrée par erreur sans effacer le reste du carnet.
- Protection de la suppression par compte côté serveur : une personne ne peut supprimer que ses propres séances.
- Ajout d'un espace Tests avec saisie des temps sur 50, 200 et 400 m : les résultats sont conservés dans le compte et l'allure moyenne par 100 m est calculée pour mieux suivre l'évolution.
- Affichage de l'historique des chronos et des meilleurs temps par distance, sans prétendre fournir une évaluation automatique du niveau.
- Ajout de tests serveur pour vérifier l'isolation des résultats, la validation des distances et la suppression limitée au propriétaire.