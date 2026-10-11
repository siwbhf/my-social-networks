import json, re

UID = {"UserId": []}

def schema_from(example):
    if isinstance(example, dict):
        return {"type": "object", "properties": {k: schema_from(v) for k, v in example.items()}}
    if isinstance(example, list):
        return {"type": "array", "items": schema_from(example[0]) if example else {}}
    if isinstance(example, bool):
        return {"type": "boolean", "example": example}
    if isinstance(example, (int, float)):
        return {"type": "number", "example": example}
    return {"type": "string", "example": example}

paths = {}
def add(method, path, tag, summary, body=None, auth=True, ok=200, extra=None):
    params = [{"name": n, "in": "path", "required": True, "schema": {"type": "string"}}
              for n in re.findall(r"\{(\w+)\}", path)]
    op = {"tags": [tag], "summary": summary, "parameters": params}
    if auth:
        op["security"] = [UID]
    if body is not None:
        op["requestBody"] = {"required": True, "content": {"application/json": {"schema": schema_from(body), "example": body}}}
    codes = {str(ok): {"description": "Succès"}, "400": {"description": "Données invalides"}}
    if auth:
        codes["401"] = {"description": "En-tête x-user-id manquant ou utilisateur inconnu"}
        codes["403"] = {"description": "Droits insuffisants"}
    codes["404"] = {"description": "Ressource introuvable"}
    if extra:
        codes.update({str(k): {"description": v} for k, v in extra.items()})
    op["responses"] = codes
    paths.setdefault(path, {})[method] = op

ev = {"name": "Soirée de promo", "description": "Fin du semestre", "startDate": "2026-11-20T19:00:00Z",
      "endDate": "2026-11-20T23:00:00Z", "location": "Paris", "isPublic": False}
grp = {"name": "Les devs", "description": "Groupe de test", "type": "public",
       "membersCanPost": True, "membersCanCreateEvents": False}

# Users
add("post", "/users", "Users", "Créer un utilisateur (email unique)", {"firstname": "Siwar", "lastname": "Bouhafa", "email": "siwar@mail.com"}, auth=False, ok=201, extra={409: "Email déjà utilisé"})
add("get", "/users", "Users", "Lister les utilisateurs", auth=False)
add("get", "/users/{id}", "Users", "Récupérer un utilisateur", auth=False)
add("put", "/users/{id}", "Users", "Modifier un utilisateur", {"firstname": "Siwar", "lastname": "B.", "age": 24}, auth=False)
# Groups
add("post", "/groups", "Groups", "Créer un groupe (le créateur devient administrateur)", grp, ok=201)
add("get", "/groups", "Groups", "Lister les groupes visibles (les groupes secrets ne sont vus que par leurs membres)")
add("get", "/groups/{id}", "Groups", "Détail d'un groupe")
add("put", "/groups/{id}", "Groups", "Modifier un groupe (administrateurs)", {"name": "Nouveau nom", "membersCanPost": False})
add("delete", "/groups/{id}", "Groups", "Supprimer un groupe (administrateurs)")
add("post", "/groups/{id}/members", "Groups", "Ajouter un membre (administrateurs)", {"userId": "<id utilisateur>"}, extra={409: "Déjà membre"})
add("delete", "/groups/{id}/members/{userId}", "Groups", "Retirer un membre (administrateur, ou le membre lui-même)")
add("post", "/groups/{id}/admins", "Groups", "Promouvoir un membre administrateur", {"userId": "<id utilisateur>"})
# Events
add("post", "/events", "Events", "Créer un événement (le créateur devient organisateur)", ev, ok=201)
add("post", "/groups/{groupId}/events", "Events", "Créer un événement dans un groupe (tous les membres sont invités)", dict(ev, inviteAll=True), ok=201)
add("get", "/events", "Events", "Lister les événements visibles")
add("get", "/events/{id}", "Events", "Détail d'un événement")
add("put", "/events/{id}", "Events", "Modifier un événement (organisateurs)", {"name": "Nouveau nom"})
add("delete", "/events/{id}", "Events", "Supprimer un événement et ses données (organisateurs)")
add("post", "/events/{id}/participants", "Events", "Ajouter un participant (organisateurs)", {"userId": "<id utilisateur>"})
add("delete", "/events/{id}/participants/{userId}", "Events", "Retirer un participant")
add("post", "/events/{id}/join", "Events", "Rejoindre un événement public")
add("post", "/events/{id}/organizers", "Events", "Ajouter un organisateur (organisateurs)", {"userId": "<id utilisateur>"})
add("post", "/events/{id}/invite-group", "Events", "Inviter tous les membres d'un groupe", {"groupId": "<id groupe>"})
# Threads
add("get", "/groups/{id}/thread", "Threads", "Fil de discussion d'un groupe (membres)")
add("get", "/events/{id}/thread", "Threads", "Fil de discussion d'un événement (participants)")
add("get", "/threads/{id}/messages", "Threads", "Messages d'un fil")
add("post", "/threads/{id}/messages", "Threads", "Publier un message ou répondre (parentMessage)", {"content": "Bonjour à tous", "parentMessage": "<id message, optionnel>"}, ok=201)
add("get", "/messages/{id}/replies", "Threads", "Réponses à un message")
add("delete", "/messages/{id}", "Threads", "Supprimer un message (auteur ou administrateur/organisateur)")
# Albums / photos / comments
add("post", "/events/{id}/albums", "Albums", "Créer un album dans un événement (participants)", {"title": "Photos de la soirée", "description": "Les meilleurs moments"}, ok=201)
add("get", "/events/{id}/albums", "Albums", "Albums d'un événement")
add("get", "/albums/{id}", "Albums", "Détail d'un album")
add("put", "/albums/{id}", "Albums", "Modifier un album (auteur ou organisateurs)", {"title": "Nouveau titre"})
add("delete", "/albums/{id}", "Albums", "Supprimer un album, ses photos et leurs commentaires")
add("post", "/albums/{id}/photos", "Photos", "Poster une photo (participants)", {"url": "https://exemple.com/photo.jpg", "caption": "Super soirée"}, ok=201)
add("get", "/albums/{id}/photos", "Photos", "Photos d'un album")
add("get", "/photos/{id}", "Photos", "Détail d'une photo")
add("delete", "/photos/{id}", "Photos", "Supprimer une photo (auteur ou organisateurs)")
add("post", "/photos/{id}/comments", "Photos", "Commenter une photo (participants)", {"text": "Magnifique !"}, ok=201)
add("get", "/photos/{id}/comments", "Photos", "Commentaires d'une photo")
add("delete", "/comments/{id}", "Photos", "Supprimer un commentaire (auteur ou organisateurs)")
# Polls
add("post", "/events/{id}/polls", "Polls", "Créer un sondage (organisateurs)", {"title": "Organisation", "questions": [{"text": "Quel plat ?", "options": ["Pizza", "Burger", "Salade"]}]}, ok=201)
add("get", "/events/{id}/polls", "Polls", "Sondages d'un événement (participants)")
add("get", "/polls/{id}", "Polls", "Détail d'un sondage")
add("delete", "/polls/{id}", "Polls", "Supprimer un sondage et ses réponses (organisateurs)")
add("post", "/polls/{id}/answers", "Polls", "Répondre à un sondage (une réponse par question)", {"answers": [{"question": "<id question>", "option": "<id option>"}]}, ok=201, extra={409: "Déjà répondu"})
add("put", "/polls/{id}/answers", "Polls", "Modifier sa réponse", {"answers": [{"question": "<id question>", "option": "<id option>"}]})
add("get", "/polls/{id}/results", "Polls", "Résultats du sondage")
# Tickets
add("post", "/events/{id}/ticket-types", "Tickets", "Créer un type de billet (organisateurs, événement public)", {"name": "Standard", "price": 15, "quantity": 100}, ok=201)
add("get", "/events/{id}/ticket-types", "Tickets", "Types de billets disponibles (public)", auth=False)
add("put", "/ticket-types/{id}", "Tickets", "Modifier un type de billet (organisateurs)", {"price": 20, "quantity": 120})
add("delete", "/ticket-types/{id}", "Tickets", "Supprimer un type de billet non vendu (organisateurs)", extra={409: "Billets déjà vendus"})
add("post", "/events/{id}/tickets", "Tickets", "Acheter un billet (personne extérieure, sans compte)",
    {"ticketType": "<id type de billet>", "firstname": "Alice", "lastname": "Martin", "email": "alice@mail.com",
     "address": {"street": "1 rue de la Paix", "postalCode": "75002", "city": "Paris", "country": "France"}},
    auth=False, ok=201, extra={409: "Billet déjà pris par cette personne ou stock épuisé"})
add("get", "/events/{id}/tickets", "Tickets", "Billets vendus (organisateurs)")

openapi = {
    "openapi": "3.0.3",
    "info": {"title": "My Social Networks API", "version": "1.0.0",
             "description": "API REST pour la gestion d'événements, de groupes, de discussions, d'albums photo, de sondages et de billetterie.\n\nAuthentification simplifiée : les routes protégées attendent l'en-tête `x-user-id` contenant l'identifiant d'un utilisateur existant."},
    "servers": [{"url": "http://localhost:3000"}],
    "components": {"securitySchemes": {"UserId": {"type": "apiKey", "in": "header", "name": "x-user-id"}}},
    "paths": paths,
}
json.dump(openapi, open("docs/openapi.json", "w"), indent=2, ensure_ascii=False)
print(sum(len(v) for v in paths.values()), "opérations documentées")

# ---------- Collection Postman ----------
def req(name, method, path, body=None, auth=True, save=None):
    r = {"name": name, "request": {
        "method": method.upper(),
        "header": ([{"key": "x-user-id", "value": "{{userId}}"}] if auth else []) +
                  ([{"key": "Content-Type", "value": "application/json"}] if body is not None else []),
        "url": {"raw": "{{baseUrl}}" + path, "host": ["{{baseUrl}}"], "path": [p for p in path.split("/") if p]}}}
    if body is not None:
        r["request"]["body"] = {"mode": "raw", "raw": json.dumps(body, indent=2, ensure_ascii=False),
                                "options": {"raw": {"language": "json"}}}
    if save:
        lines = ["const j = pm.response.json();"] + [f"pm.collectionVariables.set('{k}', {v});" for k, v in save.items()]
        r["event"] = [{"listen": "test", "script": {"type": "text/javascript", "exec": lines}}]
    return r

def folder(name, items):
    return {"name": name, "item": items}

col = {
  "info": {"name": "My Social Networks", "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
           "description": "Les identifiants sont enregistrés automatiquement dans les variables de la collection. Change la variable userId pour agir en tant qu'un autre utilisateur."},
  "variable": [{"key": k, "value": ""} for k in
      ["userId", "otherUserId", "groupId", "eventId", "threadId", "messageId", "albumId", "photoId", "commentId",
       "pollId", "questionId", "optionId", "ticketTypeId"]] + [{"key": "baseUrl", "value": "http://localhost:3000"}],
  "item": [
    folder("Users", [
      req("Créer l'utilisateur A", "post", "/users", {"firstname": "Siwar", "lastname": "Bouhafa", "email": "a@mail.com"}, False, {"userId": "j._id"}),
      req("Créer l'utilisateur B", "post", "/users", {"firstname": "Sam", "lastname": "Durand", "email": "b@mail.com"}, False, {"otherUserId": "j._id"}),
      req("Liste des users", "get", "/users", auth=False)]),
    folder("Groups", [
      req("Créer un groupe", "post", "/groups", grp, save={"groupId": "j._id"}),
      req("Liste des groupes", "get", "/groups"),
      req("Détail du groupe", "get", "/groups/{{groupId}}"),
      req("Modifier le groupe", "put", "/groups/{{groupId}}", {"name": "Nouveau nom"}),
      req("Ajouter l'utilisateur B", "post", "/groups/{{groupId}}/members", {"userId": "{{otherUserId}}"}),
      req("Promouvoir B administrateur", "post", "/groups/{{groupId}}/admins", {"userId": "{{otherUserId}}"}),
      req("Retirer B", "delete", "/groups/{{groupId}}/members/{{otherUserId}}"),
      req("Supprimer le groupe", "delete", "/groups/{{groupId}}")]),
    folder("Events", [
      req("Créer un événement", "post", "/events", ev, save={"eventId": "j._id"}),
      req("Créer un événement public", "post", "/events", dict(ev, isPublic=True), save={"eventId": "j._id"}),
      req("Créer un événement dans le groupe", "post", "/groups/{{groupId}}/events", ev, save={"eventId": "j._id"}),
      req("Liste des événements", "get", "/events"),
      req("Détail de l'événement", "get", "/events/{{eventId}}"),
      req("Modifier l'événement", "put", "/events/{{eventId}}", {"name": "Nouveau nom"}),
      req("Ajouter B comme participant", "post", "/events/{{eventId}}/participants", {"userId": "{{otherUserId}}"}),
      req("Rejoindre (événement public)", "post", "/events/{{eventId}}/join"),
      req("Ajouter B comme organisateur", "post", "/events/{{eventId}}/organizers", {"userId": "{{otherUserId}}"}),
      req("Inviter un groupe", "post", "/events/{{eventId}}/invite-group", {"groupId": "{{groupId}}"}),
      req("Retirer B", "delete", "/events/{{eventId}}/participants/{{otherUserId}}"),
      req("Supprimer l'événement", "delete", "/events/{{eventId}}")]),
    folder("Threads", [
      req("Fil du groupe", "get", "/groups/{{groupId}}/thread", save={"threadId": "j._id"}),
      req("Fil de l'événement", "get", "/events/{{eventId}}/thread", save={"threadId": "j._id"}),
      req("Publier un message", "post", "/threads/{{threadId}}/messages", {"content": "Bonjour à tous"}, save={"messageId": "j._id"}),
      req("Répondre à un message", "post", "/threads/{{threadId}}/messages", {"content": "Bienvenue !", "parentMessage": "{{messageId}}"}),
      req("Messages du fil", "get", "/threads/{{threadId}}/messages"),
      req("Réponses d'un message", "get", "/messages/{{messageId}}/replies"),
      req("Supprimer un message", "delete", "/messages/{{messageId}}")]),
    folder("Albums et photos", [
      req("Créer un album", "post", "/events/{{eventId}}/albums", {"title": "Photos de la soirée", "description": "Les meilleurs moments"}, save={"albumId": "j._id"}),
      req("Albums de l'événement", "get", "/events/{{eventId}}/albums"),
      req("Détail de l'album", "get", "/albums/{{albumId}}"),
      req("Modifier l'album", "put", "/albums/{{albumId}}", {"title": "Nouveau titre"}),
      req("Poster une photo", "post", "/albums/{{albumId}}/photos", {"url": "https://exemple.com/photo.jpg", "caption": "Super soirée"}, save={"photoId": "j._id"}),
      req("Photos de l'album", "get", "/albums/{{albumId}}/photos"),
      req("Commenter la photo", "post", "/photos/{{photoId}}/comments", {"text": "Magnifique !"}, save={"commentId": "j._id"}),
      req("Commentaires de la photo", "get", "/photos/{{photoId}}/comments"),
      req("Supprimer le commentaire", "delete", "/comments/{{commentId}}"),
      req("Supprimer la photo", "delete", "/photos/{{photoId}}"),
      req("Supprimer l'album", "delete", "/albums/{{albumId}}")]),
    folder("Polls", [
      req("Créer un sondage", "post", "/events/{{eventId}}/polls", {"title": "Organisation", "questions": [{"text": "Quel plat ?", "options": ["Pizza", "Burger", "Salade"]}]},
          save={"pollId": "j._id", "questionId": "j.questions[0]._id", "optionId": "j.questions[0].options[0]._id"}),
      req("Sondages de l'événement", "get", "/events/{{eventId}}/polls"),
      req("Répondre au sondage", "post", "/polls/{{pollId}}/answers", {"answers": [{"question": "{{questionId}}", "option": "{{optionId}}"}]}),
      req("Modifier sa réponse", "put", "/polls/{{pollId}}/answers", {"answers": [{"question": "{{questionId}}", "option": "{{optionId}}"}]}),
      req("Résultats", "get", "/polls/{{pollId}}/results"),
      req("Supprimer le sondage", "delete", "/polls/{{pollId}}")]),
    folder("Billetterie", [
      req("Créer un type de billet (événement public)", "post", "/events/{{eventId}}/ticket-types", {"name": "Standard", "price": 15, "quantity": 100}, save={"ticketTypeId": "j._id"}),
      req("Types de billets (public)", "get", "/events/{{eventId}}/ticket-types", auth=False),
      req("Modifier le type de billet", "put", "/ticket-types/{{ticketTypeId}}", {"price": 20, "quantity": 120}),
      req("Acheter un billet (public)", "post", "/events/{{eventId}}/tickets",
          {"ticketType": "{{ticketTypeId}}", "firstname": "Alice", "lastname": "Martin", "email": "alice@mail.com",
           "address": {"street": "1 rue de la Paix", "postalCode": "75002", "city": "Paris", "country": "France"}}, auth=False),
      req("Billets vendus (organisateur)", "get", "/events/{{eventId}}/tickets"),
      req("Supprimer le type de billet", "delete", "/ticket-types/{{ticketTypeId}}")]),
  ]}
json.dump(col, open("docs/postman_collection.json", "w"), indent=2, ensure_ascii=False)
print("collection ok")