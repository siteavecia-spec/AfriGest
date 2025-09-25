# Ambassadeurs AfriGest – Spéc technique (résumé)

Objectif: parrainage aligné à l’onboarding manuel. Mesurer, attribuer, récompenser.

## Données (Prisma tenant)
- Enums: ReferralRequestStatus(pending, approved, rejected), RewardStatus(pending, paid, cancelled)
- Modèles:
  - ReferralCode(id, userId->User, code unique, isActive, createdAt)
  - ReferralRequest(id, referralCodeId->ReferralCode?, prospectEmail, prospectPhone?, companyName?, status, createdAt)
  - ReferralReward(id, referrerId->User, referredUserId->User, rewardType, rewardValue(10,2), status, paidAt?, createdAt)

Statut: ajouté dans infra/prisma/tenant/schema.prisma (migrations à pousser quand DB prête).

## API (stubs livrés)
- Ambassadeur: GET /referrals/code, POST /referrals/generate, GET /referrals/stats, GET /referrals/leads
- Admin: GET /referrals/admin/overview, GET /referrals/admin/requests, POST /referrals/admin/rewards/validate/:id, POST /referrals/admin/rewards/pay/:id
- Public: GET /public/referrals/validate?code=...

## Front (client)
- client_clean.ts: getReferralCode, generateReferralCode, getReferralStats, getReferralRequests, validateReferralPublic, adminListReferralRequests, adminValidateReferralReward, adminMarkRewardPaid
- Pages: Ambassador (code/QR/partage + stats + leads), Landing (champ code + validation temps réel)

## Règles métier (résumé)
- Éligibilité: parrain actif ≥ 3 mois; filleul = nouvelle entreprise.
- Limites: 5 parrainages actifs/mois/PDG. Doublons email/phone refusés.
- Carence: récompenses après 30 jours d’activité du filleul.
- Récompenses: parrain 10% 1er paiement + 1 mois gratuit après 3 filleuls; filleul -15% 3 mois.

## Notifications & CRON
- Emails: parrain (événements), équipe (à valider), rapport hebdo.
- CRON: vérif carence → pending→paid + rapport.

## Checklist
- [x] Prisma: enums+modèles
- [x] API stubs referrals / referralsAdmin
- [x] Client front (endpoints)
- [ ] DB push + generate + handlers Prisma réels
- [ ] Landing: soumission avec code
- [ ] Ambassador: stats+leads réelles
- [ ] Admin: overview+validation+export
- [ ] Notifications (Mailjet/Sendgrid)
- [ ] CRON hebdo
- [ ] Anti‑fraude
