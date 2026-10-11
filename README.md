# My Social Networks – API REST

API REST pour gérer des évènements, des groupes, des fils de discussion, des albums photo, des sondages et une billetterie.

**Stack** : Node.js, Express 5, MongoDB (Mongoose), Helmet, CORS, validator, Swagger UI.

## Installation

```bash
git clone https://github.com/siwbhf/my-social-networks.git
cd my-social-networks
npm install
cp .env
```

Renseigner ensuite `.env` :

| Variable | Description |
|---|---|
| `PORT` | Port de l'API (3000 par défaut) |
| `MONGODB_URI` | URI de connexion MongoDB (Atlas ou local) |

## Lancement

```bash
npm run dev
```

- API : http://localhost:3000
- Documentation interactive (Swagger) : http://localhost:3000/docs
- Spécification OpenAPI : `docs/openapi.json`
- Collection Postman : `docs/postman_collection.json` (Import dans Postman)

## Structure

```
index.mjs                  point d'entrée
src/
  server.mjs               configuration Express, connexion MongoDB, routes, gestion d'erreurs
  config.mjs               configuration (port, URI MongoDB)
  models/                  schémas Mongoose et validators
  controllers/             une classe par ressource (routes + logique métier)
  middlewares/requireUser  identification de l'utilisateur
  helpers/                 contrôle d'accès et suppressions en cascade
docs/                      OpenAPI et collection Postman
```

## Authentification (simplifiée)

Il n'y a pas de système de connexion. Les routes protégées attendent l'en-tête HTTP
`x-user-id` contenant l'`_id` d'un utilisateur existant. Un seul middleware
(`requireUser`) lit cet en-tête, ce qui permet de le remplacer plus tard par un JWT
sans modifier les contrôleurs. Les routes de billetterie destinées aux personnes
extérieures (consultation des billets disponibles et achat) sont publiques.

## Choix de conception et règles métier

**Utilisateurs** : l'email est unique (index unique, validation du format, mis en minuscules).

**Groupes** : trois types (`public`, `private`, `secret`). Un groupe a au moins un
administrateur. Les groupes secrets n'apparaissent que pour leurs membres. Les droits
`membersCanPost` et `membersCanCreateEvents` sont appliqués. Le dernier administrateur
ne peut pas être retiré.

**Évènements** : un évènement a au moins un organisateur, une date de fin postérieure à
la date de début, et peut être public ou privé (un évènement privé n'est visible que par
ses participants et organisateurs). Créé depuis un groupe, il invite tous les membres en
une seule requête (`inviteAll`, activé par défaut). Les organisateurs sont aussi participants.
La suppression d'un évènement supprime ses fils, albums, photos, commentaires, sondages,
réponses et billets.

**Fils de discussion** : un fil est lié à un groupe **ou** à un évènement, jamais aux deux
(validation du schéma). Il est créé à la première consultation. Tout membre ou participant
peut répondre à un message ; si le groupe interdit aux membres de publier, ils peuvent
quand même répondre mais pas ouvrir un nouveau message.

**Albums photo** : un album est rattaché à un évènement. Seuls les participants peuvent
créer un album, poster des photos et commenter. Photo et commentaire sont dans leurs
propres collections. Une photo ou un commentaire peut être supprimé par son auteur ou
par un organisateur.

**Sondages** : créés par un organisateur, avec au moins une question et au moins deux
réponses par question. Les réponses sont stockées dans la collection `poll_answers`
(un document par participant et par sondage). Il faut répondre à chaque question en
choisissant une seule option. La réponse peut être modifiée (`PUT`), et les résultats
sont consultables (`/polls/:id/results`).

**Billetterie** : réservée aux événements publics. Un organisateur crée un ou plusieurs
types de billets (nom, montant, quantité limitée). Un achat enregistre le type, le nom,
le prénom, l'adresse complète et la date d'achat. Pour identifier une « personne
extérieure » et limiter à un billet par personne et par évènement, un email est demandé
(index unique `event + email`). Le stock est décrémenté de façon atomique pour éviter
de dépasser la quantité disponible.

## Codes de réponse

`200` / `201` succès, `400` données invalides, `401` utilisateur non identifié,
`403` droits insuffisants, `404` ressource introuvable ou non visible, `409` conflit
(doublon, stock épuisé).

## Tester l'API

Importer `docs/postman_collection.json` dans Postman. Les identifiants créés
(`userId`, `groupId`, `eventId`, etc.) sont enregistrés automatiquement dans les
variables de la collection. Pour agir en tant qu'un autre utilisateur, modifier la
variable `userId`.

## Limites

- Authentification simplifiée par en-tête (pas de mot de passe ni de JWT).
- Les fonctionnalités bonus (liste de courses, covoiturage) ne sont pas implémentées.