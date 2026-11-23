# Firestore Security Specification

## 1. Data Invariants
- Portfolio visitors can read `siteConfig/main` and `projects/*` without authentication, but can never create, update, or delete any document.
- Only verified Admin (`request.auth.token.email == 'sohelkhan65686@gmail.com' && request.auth.token.email_verified == true` or existence in `/admins/{request.auth.uid}`) can write to `siteConfig/main` or `projects/{projectId}`.
- Every `projects` and `siteConfig` write enforces strict key allowlists (`hasAll` + `hasOnly`), string length bounds (`<= 350000` for compressed thumbnails/banners), bounded arrays (`<= 12` highlights, `<= 10` techStack items), server timestamps (`request.time`), and `authorId`/`updatedBy == request.auth.uid`.
- No unverified email or shadow fields are accepted.

## 2. Adversarial Payloads Blocked
1. Unauthenticated `create` on `/projects/evil`: rejected (`isAdmin()` false).
2. Unverified email spoofing `email_verified: false` claiming admin email: rejected (`email_verified == true` required).
3. Shadow field injection (`isAdmin: true`) on `/projects` or `/siteConfig/main`: rejected (`hasOnly` check).
4. Oversized 1.5KB document ID on `/projects/{id}`: rejected (`isValidId` <= 128 chars).
5. Client-forged `createdAt` / `updatedAt` timestamp: rejected (`== request.time`).
6. Oversized `thumbnailUrl` (> 350KB): rejected (string `.size() <= 350000`).
7. Unbounded `highlights` array (> 12 entries): rejected (`.size() <= 12`).
8. Invalid `category` enum (`"crypto-scam"`): rejected (`in ['business', 'ecommerce', 'web-apps']`).
9. Changing immutable `createdAt` or `authorId` on `projects` update: rejected (`incoming().createdAt == existing().createdAt`).
10. Arbitrary list on `/siteConfig` or `/admins`: rejected (`allow list: if false`).
11. Self-escalation by creating `/admins/{uid}` as non-admin: rejected (`isAdmin()` required).
12. Unknown collection `/secret/doc`: rejected by global catch-all deny rule.
