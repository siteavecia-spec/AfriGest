# AfriTalk — Messagerie Interne Contextuelle (Phase 4.2)

Dernière mise à jour: 2025-09-25

## 1) Contexte & Objectifs
- Intégrer une couche de communication directe et contextuelle dans AfriGest (multi-tenant), alignée sur la hiérarchie et les permissions existantes.
- Canal sécurisé, traçable, à faible impact perf, prêt pour l'évolutivité (groupes/push en phases futures).

## 2) Périmètre (Scope)
- In: 1-to-1 intra-tenant, notifications in-app, historique persistant, intégration contextuelle (ventes/produits/alertes), présence/lecture, logs conformité.
- Out (Phase 4.3+): groupes/canaux, voix/vidéo, inter-entreprises, fichiers lourds.

## 3) Architecture
- Backend: Express + Socket.io (adapter Redis), Prisma (tenant), Redis (présence/cache), JWT auth WS, RBAC.
- Frontend (Admin): React/MUI, Redux + middleware WS, composants Conversations/ConversationView, intégration contextuelle "💬 Discuss".
- Observabilité: métriques connexions/latence/messages, audit complet, tests charge.

## 4) Modèle de Données (Prisma tenant)
```prisma
model Conversation {
  id           String   @id @default(uuid())
  tenantId     String
  userOneId    String
  userTwoId    String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @default(now())
  messages     Message[]

  @@unique([tenantId, userOneId, userTwoId])
}

model Message {
  id                 String   @id @default(uuid())
  conversation       Conversation @relation(fields: [conversationId], references: [id])
  conversationId     String
  senderId           String
  content            String
  relatedEntityType  String?
  relatedEntityId    String?
  read               Boolean  @default(false)
  readAt             DateTime?
  createdAt          DateTime @default(now())
}

model Notification {
  id                 String   @id @default(uuid())
  userId             String
  title              String
  message            String
  type               String   // message|alert|system
  status             String   @default("unread") // unread|read|archived
  relatedEntityType  String?
  relatedEntityId    String?
  pushSent           Boolean  @default(false)
  pushSentAt         DateTime?
  createdAt          DateTime @default(now())
}

model MessagingAuditLog {
  id         String   @id @default(uuid())
  tenantId   String
  userId     String?
  action     String   // ws.connect|ws.disconnect|message.send|message.read|conversation.create|forbidden_attempt
  entityType String?
  entityId   String?
  details    Json?
  ipAddress  String?
  createdAt  DateTime @default(now())
}
```

Notes:
- Index additionnels recommandés: `(conversationId, createdAt)`, `(tenantId, userOneId, userTwoId)`.
- Option: réutiliser `AuditLog` générique; on garde `MessagingAuditLog` pour l’isolation domaine.

## 5) API & WebSocket
### 5.1 WebSocket (auth JWT)
- `WS /api/tenants/:tenantId/messaging/socket`
- Namespaces & rooms: `tenant:{tenantId}`, `user:{userId}`
- Client → Serveur:
  - `messaging:join` { userId }
  - `messaging:send` { toUserId, content, related? }
  - `messaging:read` { messageId }
  - `presence:ping` {}
- Serveur → Client:
  - `messaging:new` { conversationId, message }
  - `messaging:read` { messageId, readAt }
  - `presence:update` { userId, status, lastSeen }
  - `notify:new` { type, payload }

### 5.2 REST (MVP)
- Conversations/Messages
  - `GET /api/tenants/:tenantId/messaging/conversations` (tri lastMessage desc, non lus)
  - `GET /api/tenants/:tenantId/messaging/conversation/:userId` (historique, pagination)
  - `POST /api/tenants/:tenantId/messaging/message` (création + notifs + WS broadcast)
  - `PUT /api/tenants/:tenantId/messaging/:messageId/read`
- Notifications
  - `GET /api/tenants/:tenantId/notifications` (non lus prioritaires)
  - `PUT /api/tenants/:tenantId/notifications/:notificationId/read`
- Présence (optionnel, snapshot)
  - `GET /api/tenants/:tenantId/presence`

## 6) Permissions & Hiérarchie
- Matrice: PDG → {PDG, DG, Employé}, DG → {PDG, DG, Employé}, Employé → {DG, Employé(s)}.
- Contrôles appliqués à la connexion WS et à l’envoi de messages; audit `forbidden_attempt` en cas de refus.

## 7) UX Admin (MVP)
- Liste conversations: avatar, nom, dernier message, timestamp, badge non lus, recherche.
- Vue conversation: envoi Enter/bouton, ✓/✓✓/✓✓+time, édition < 2 min.
- Présence: 🟢 en ligne, 🟡 inactif (<10m), ⚪ hors-ligne; "Vu à …".
- Intégration contextuelle: bouton "💬 Discuss" sur entités (ventes/produits/alertes), message pré-rempli + preview.

## 8) Non-Fonctionnel
- Perf: latence < 100ms (cible 80ms), chargement 100 msgs < 1s.
- Sécu: TLS 1.3+, JWT WS, chiffrement au repos (DB), RGPD (droit à l’oubli ultérieur).
- Observabilité: métriques latence, msgs/s, connexions; retention audit 12 mois.

## 9) Plan d’Implémentation
- Phase 4.2.1 (3 semaines)
  - **S1**: Setup Socket.io + adapter Redis, middleware auth JWT, namespacing tenant, handlers join/leave/ping/presence.
  - **S2**: Modèles Prisma + services conversations/messages/notifications + migrations.
  - **S3**: Routes REST (conversations, message, read, notifications) + audit.
- Phase 4.2.2 (2 semaines)
  - **S4**: In-app notifications (badge + toasts).
  - **S5**: Intégration contextuelle + deep links.
- Phase 4.2.3 (2 semaines)
  - **S6**: Audit logging complet + sécurité (forbidden attempts).

- **[Connexion WS]**
  - Ouvrir l’Admin (session 1), puis l’Admin (session 2) avec un autre compte.
  - Vérifier la connexion WS (logs côté serveur) et la présence (widget Dashboard ou snapshot `/presence`).

- **[Envoi / Réception]**
  - Session 1 → `/messaging` → ouvrir une conversation avec l’utilisateur B → envoyer un message.
  - Session 2 → doit recevoir en temps réel (`messaging:new`).

- **[Read receipts]**
  - Session 2 → ouvre la conversation → vérifier que le message côté session 1 passe à ✓✓ + horodatage (`messaging:read`).

- **[Présence]**
  - Snapshot: `GET /api/tenants/{tenantId}/presence` doit lister `{ userId, status, lastSeen }`.
  - Changer l’état (fermer un onglet, inactivité) → vérifier mise à jour du statut via `presence:update` et/ou polling Dashboard.

- **[Messagerie contextuelle]**
  - Admin → `Ecommerce/Orders` → bouton “💬 Discuss”: vérifiez que le brouillon contextuel se charge dans Chat.

- **[Permissions]**
  - Employé → PDG: tenter `POST /messaging/message` → attendre HTTP 403 et une ligne `MessagingAuditLog` avec `forbidden_attempt`.

- **[Robustesse]**
  - Rechargez l’Admin: la connexion WS se rétablit, le badge “non lus” s’affiche correctement, les conversations se rechargent.

---

## 13) Delivered (MVP 2025-10-03)

- Backend REST livré:
  - `GET /api/tenants/:tenantId/messaging/conversations` (unread, lastMessage).
  - `GET /api/tenants/:tenantId/messaging/conversation/:userId?limit&before` (pagination).
  - `POST /api/tenants/:tenantId/messaging/message` (sanitation, rate-limit, audit, WS `messaging:new`).
  - `PUT /api/tenants/:tenantId/messaging/:messageId/read` (audit, WS `messaging:read`).
- WebSocket:
  - Initialisation Socket.io avec rooms `tenant:` et `user:`.
  - Émissions `messaging:new` et `messaging:read`; présence mémoire + `presence:ping`.
- RBAC:
  - ModuleKey `messaging` ajouté; routes protégées (`read` pour lecture, `create` pour envoi).
- Sécurité:
  - Sanitation côté serveur (contenu non vide, ≤ 2000 chars), rate‑limit 30 msgs / 60s / utilisateur (MVP mémoire).
- Frontend Admin:
  - Pages Conversations, Chat (pagination bouton “Charger plus”, read receipts), Présence.
- E2E:
  - Spéc REST `e2e/tests/messaging.spec.ts` (send/read). Les tests WS temps‑réel sont couverts en smoke.
