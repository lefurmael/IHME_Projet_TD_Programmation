# Ligne d'eau - carnet de natation

Ligne d'eau aide les nageurs à préparer une séance adaptée à leur niveau, leur objectif et leur bassin, puis à garder une trace de leurs entraînements.

## Pourquoi cette application ?

Quand on nage librement, il peut être difficile de choisir un volume réaliste, de varier les exercices et de se souvenir des séances précédentes. Ligne d'eau propose une séance structurée et permet d'enregistrer un bilan ensuite.

Elle s'adresse aux nageurs débutants à avancés qui souhaitent organiser leurs entraînements libres. Les séances proposées restent générales et ne remplacent pas les conseils d'un entraîneur.

## Créer une séance

Depuis [l'espace Ligne d'eau](https://node219697-ihme26.jcloud.ik-server.com/projet-td-programmation/), choisis ton niveau, ton objectif, le temps disponible, la nage et la longueur du bassin : 25 ou 50 m.

La séance comprend un échauffement, deux séries principales et un retour au calme. Toutes les distances sont des multiples exacts du bassin choisi : en bassin de 25 m, les blocs font 25, 50, 75 m, etc.; en bassin de 50 m, ils font 50, 100, 150 m, etc.

## Après la nage

Dans l'historique, indique si la séance est terminée, partielle ou non réalisée, puis note le ressenti : très facile, facile, adaptée, difficile ou trop difficile. Une note facultative peut garder un commentaire d'entraînement.

Pour une même combinaison de niveau, objectif, nage et longueur de bassin, les bilans de séances terminées peuvent modérer le volume proposé :

- Séance difficile : volume réduit de 10 %
- Séance trop difficile : volume réduit de 15 %
- Au moins deux séances faciles parmi les trois dernières : volume augmenté de 5 %
- Sinon : volume standard

Le programme explique les ajustements. Les séances partielles ou non réalisées ne déclenchent pas de progression.

## Espace et confidentialité

Cette version est une démonstration pédagogique sans création de compte. L'historique de cet espace n'est pas privé : les séances peuvent être vues par les personnes qui ont accès à son adresse. L'hébergement du cours impose d'utiliser uniquement des données fictives. N'y saisis pas ton nom, des informations personnelles ou de santé, ni de commentaire confidentiel.

Un espace réellement individuel nécessiterait une authentification, des données séparées par utilisateur et un hébergement adapté aux informations privées. Ce n'est pas fourni par cette démonstration; il faudrait le concevoir et le déployer séparément avec l'accord de l'enseignant.

## Pour les développeurs

Le générateur peut aussi être lancé en terminal avec `python generator.py`. Les tests Python se lancent avec :

```bash
python -m unittest discover -s tests
```

La version web utilise React, Express et PostgreSQL. Pour la construire et la déployer, consulte le [guide étudiant du cours IHME](https://github.com/cedrictisseyre/ihme-suivi/blob/main/docs/deployer-son-projet.md).