# Backend — Mignonneries de Nathalie

Backend développé en **Node.js / Express**, avec une base de données **MongoDB**.

## Principes

- API REST légère pour la gestion des produits, du panier et des paiements.
- Stockage MongoDB via **Mongoose**.
- Paiement sécurisé avec **Stripe** + webhook pour finaliser les commandes.
- Envoi d’emails via **Nodemailer**.

## Démarrage

1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Créer un fichier .env avec les variables suivantes :
   **PORT=3000**
   **MONGO_URI=...**
   **JWT_SECRET=...**
   **STRIPE_SECRET_KEY=...**
   **STRIPE_WEBHOOK_SECRET=...**
   **EMAIL_USER=...**
   **EMAIL_PASS=...**
   **ADMIN_EMAIL=...**
   **ADMIN_PASSWORD=...**
   **FRONTEND_URL=...**

3. Lancer le serveur :

- Développement : npm run dev

- Production : npm start

## Points techniques essentiels

- Point d’entrée : server.js

- Webhook Stripe (body RAW) : route routes/webhook.js
  → contrôleur controllers/webhookController.handleStripeWebhook

- Création session Stripe : controllers/paymentController.createCheckoutSession
  → route routes/payment.js

- Produits : CRUD + upload d’images

  - controllers/produitController.ajouterProduit
  - controllers/produitController.modifierProduit
  - Routes : routes/produits.js

- Uploads : middleware middleware/upload.js

- Authentification : middleware JWT middleware/authMiddleware.js

- Modèles principaux :

  - models/Product.js
  - models/Order.js
  - models/Utilisateur.js

## Endpoints clés

- Produits

  - GET /api/produits

  - POST /api/produits (admin, upload)

  - PUT /api/produits/:id (admin, upload)

  - DELETE /api/produits/:id

- Paiement (Stripe)

  - POST /api/payment/create-checkout-session → controllers/paymentController.createCheckoutSession

  - POST /api/payment/webhook → controllers/webhookController.handleStripeWebhook

- Recherche

  - GET /api/recherche?search=...

- Galerie

  - GET /api/galerie

  - POST /api/galerie

## Outils d’import / export

- Export de la collection produits : export.js

- Import depuis produits.json: import.js

## Prochaines améliorations

- Gestion des avis clients dans la base MongoDB.

- Passage de Stripe en mode production.

- Autres évolutions prévues côté frontend.
