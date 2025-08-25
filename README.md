# Backend — Mignonneries de Nathalie

Backend Node/Express, MongoDB.

Principes

- API REST légère pour gestion produits, panier et paiements.
- Stockage MongoDB via Mongoose.
- Paiement sécurisé avec Stripe + webhook pour finaliser commandes.
- Envoi d'emails via Nodemailer.

Démarrage

1. Installer : npm install
2. Variables d'environnement (.env) :
   - PORT="3000", MONGO_URI, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
   - EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL, ADMIN_PASSWORD FRONTEND_URL
3. Lancer :
   - Dev : npm run dev
   - Prod : npm start

Points techniques essentiels

- Point d'entrée : [server.js](server.js)
- Webhook Stripe (body RAW) : route [routes/webhook.js](routes/webhook.js) traitée par [`controllers.webhookController.handleStripeWebhook`](controllers/webhookController.js)
- Création session Stripe : [`controllers.paymentController.createCheckoutSession`](controllers/paymentController.js) — route [routes/payment.js](routes/payment.js)
- Produits : CRUD, upload d'images via [`controllers.produitController.ajouterProduit`](controllers/produitController.js) / [`controllers.produitController.modifierProduit`](controllers/produitController.js) — routes [routes/produits.js](routes/produits.js)
- Uploads : middleware [middleware/upload.js](middleware/upload.js) — fichiers servis statiquement sous /uploads
- Auth : middleware JWT [middleware/authMiddleware.js](middleware/authMiddleware.js)
- Modèles : [models/Product.js](models/Product.js), [models/Order.js](models/Order.js), [models/Utilisateur.js](models/Utilisateur.js)

Endpoints clés (résumé)

- GET /api/produits
- POST /api/produits (admin, upload) — [routes/produits.js](routes/produits.js)
- PUT /api/produits/:id (admin, upload)
- DELETE /api/produits/:id
- POST /api/payment/create-checkout-session — [`controllers.paymentController.createCheckoutSession`](controllers/paymentController.js)
- POST /api/payment/webhook — [`controllers.webhookController.handleStripeWebhook`](controllers/webhookController.js)
- GET /api/recherche?search=... — [routes/recherche.js](routes/recherche.js)
- GET/POST /api/galerie — [routes/galerie.js](routes/galerie.js)

Outils d'import / export
(non présent sur github en ligne)

- Export collection produits : [export.js](export.js)
- Import depuis produits.json : [import.js](import.js)
- Fichier exemple : [produits.json](produits.json)
