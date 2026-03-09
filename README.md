# Lash Booking (Next.js + SQLite)

Site de reservation pour rehaussement de cils, self-hosted sur PC (0 EUR), avec:

- Pages publiques: accueil, prestations, galerie, FAQ, contact, reservation, confirmation
- Admin: login, dashboard avance, gestion services, gestion creneaux (suppression unitaire ou journee entiere), reservations (filtres + export CSV + confirmation / annulation), liste des comptes clients, journal d'activite
- Admin planning intelligent: jours travailles, pause, fermetures exceptionnelles, limite journaliere, generation hebdomadaire auto
- Liste d'attente automatique quand un creneau est indisponible
- Comptes clientes: inscription, connexion email/mot de passe, connexion Google
- API REST JSON via `app/api/*`
- SQLite (`better-sqlite3`) + migrations SQL
- Session admin en cookie `httpOnly` (`iron-session`)
- Anti spam reservation: rate limit memoire + honeypot
- Securite API: verification `Origin`, limites de taille body, validation Zod stricte, CSRF token admin
- Workflow reservation: creation en `pending`, validation manuelle admin, emails "en attente" puis "confirmee"
- Cliente connectee: consultation des creneaux reserves + demande d'annulation (validation admin)

## Prerequis

- Node.js 20+
- npm

## Installation

```bash
npm i
```

## Variables d'environnement

Copie `.env.example` en `.env.local` puis ajuste:

```env
DB_PATH=./data/app.sqlite
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
SESSION_SECRET=change-this-with-a-very-long-random-secret-please
NEXTAUTH_SECRET=change-this-with-a-very-long-random-secret-please
NEXTAUTH_URL=http://localhost:3000
ADMIN_COOKIE_SECURE=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MAIL_FROM=
ADMIN_NOTIFICATION_EMAIL=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
APP_TIMEZONE=Europe/Paris
NEXT_PUBLIC_APP_TIMEZONE=Europe/Paris
```

## Commandes

```bash
npm run migrate
npm run seed
npm run backup
npm run dev
```

Production:

```bash
npm run build
npm run start
```

## API publique

- `GET /api/services`
- `GET /api/availability?serviceId=&date=YYYY-MM-DD`
- `POST /api/bookings`
- `POST /api/bookings/cancel-request` (cliente connectee)
- `POST /api/auth/register`
- `GET/POST /api/auth/*` (NextAuth: credentials + Google OAuth)

## API admin (session requise)

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET/POST/PUT/DELETE /api/admin/services`
- `GET/POST/PUT/DELETE /api/admin/slots`
- `GET/POST /api/admin/bookings` (POST pour annulation)
- `GET /api/admin/customers`
- `GET /api/admin/audit`
- `GET/PUT/POST/DELETE /api/admin/planning`
- `GET/POST /api/admin/waitlist`

Routes admin mutantes (`POST/PUT/DELETE`) exigent un header CSRF `x-csrf-token` valide.

Note cookie admin:
- `ADMIN_COOKIE_SECURE=false` pour acces local `http://localhost:3000`
- `ADMIN_COOKIE_SECURE=true` si tu utilises uniquement HTTPS (tunnel/domaine)

`POST /api/admin/bookings` accepte:
- `{ "action": "confirm", "bookingId": 123 }`
- `{ "action": "cancel", "bookingId": 123 }`
- `{ "action": "reject_cancel_request", "bookingId": 123 }`
- `{ "action": "mark_no_show", "bookingId": 123 }`

Filtres admin reservations (`GET /api/admin/bookings`):
- `date=YYYY-MM-DD`
- `serviceId=...`
- `status=pending|confirmed|cancel_requested|cancelled`
- `q=texte` (nom/email/telephone)

## Migrations

Les fichiers SQL sont dans `migrations/`.

- `001_init.sql`: tables principales
- `002_indexes.sql`: index + contrainte d'unicite des creneaux
- `003_customer_users.sql`: table comptes clientes
- `004_audit_log.sql`: journal d'audit admin
- `005_advanced_booking.sql`: planning intelligent, fermetures, waitlist, VIP/blacklist/notes client

Le script `npm run migrate` applique automatiquement les migrations non executees.

## Connexion Google (optionnel)

1. Crée un OAuth Client dans Google Cloud Console (Web application).
2. Ajoute l'URL autorisée:
   - `http://localhost:3000/api/auth/callback/google`
3. Renseigne `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `.env.local`.
4. Redémarre le serveur.

## Emails de reservation

Si SMTP est configure, la cliente recoit:
1. un email quand la demande est creee (`pending`)
2. un email quand l'admin confirme la reservation
3. l'admin recoit un email a chaque nouvelle demande (si `ADMIN_NOTIFICATION_EMAIL` est renseigne)

Variables SMTP:

```env
MAIL_FROM=no-reply@tondomaine.com
ADMIN_NOTIFICATION_EMAIL=admin@tondomaine.com
SMTP_HOST=smtp.tonprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
```

## Exposer en HTTPS gratuitement (Cloudflare Tunnel)

1. Lancer l'app en local:

```bash
npm run build
npm run start
```

2. Installer `cloudflared` puis ouvrir un tunnel vers `localhost:3000`:

```bash
cloudflared tunnel --url http://localhost:3000
```

3. Cloudflare te donne une URL publique HTTPS.

Tu n'as pas besoin d'ouvrir un port sur ta box.

## Securite active dans le code

- Cookies admin: `httpOnly`, `secure` (en HTTPS), `sameSite=strict`
- CSRF admin: double verif cookie + header `x-csrf-token` + token en session
- Headers HTTP de securite (CSP, HSTS en HTTPS, `nosniff`, `frame` bloque, etc.)
- Validation Zod stricte (`.strict()`), normalisation email/tel, limites de taille
- Limite de taille body JSON sur routes sensibles
- Rate limiting:
  - login admin
  - creation compte
  - reservation (5/min + 30/heure)
  - demande d'annulation cliente
- Protection anti-bot reservation:
  - honeypot
  - delai minimal de soumission du formulaire

## Fonctionnalites avancees de reservation (implantees)

- Planning intelligent:
  - jours travailles configurables
  - pause configurable (ex: 13:00-14:00)
  - fermetures exceptionnelles (vacances)
  - limite journaliere de reservations + overbooking controle
- Generation hebdomadaire auto des creneaux depuis l'admin (`/admin/planning`)
- Liste d'attente auto si le creneau est deja pris ou journee pleine
- Dashboard business:
  - CA mensuel
  - taux d'occupation
  - taux de no-show
  - clientes recurrentes
  - volume liste d'attente
- Fiche cliente admin:
  - VIP
  - blacklist
  - notes internes

## Backup SQLite

Creer un backup horodate:

```bash
npm run backup
```

- Destination: `data/backups/`
- Retention: 30 derniers backups

### Restauration rapide

1. Arreter le serveur Next.js
2. Copier un backup vers `data/app.sqlite`
3. Relancer:

```bash
npm run start
```

## Securite machine/reseau (manuel)

Ces points ne peuvent pas etre auto-configures par le code app:

- Activer/maintenir pare-feu OS
- Mises a jour Windows + redemarrages planifies
- Compte OS dedie serveur (pas ton compte principal)
- Mot de passe OS fort + verrouillage auto
- BitLocker (si PC portable)
- Wi-Fi WPA2/WPA3, WPS desactive
- Ne pas ouvrir de ports publics (garder Cloudflare Tunnel)
