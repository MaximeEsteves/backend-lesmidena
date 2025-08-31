require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const webhookController = require('./controllers/webhookController');

// --- CORS ---
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://lesmidena.netlify.app',
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// --- Webhook Stripe avant express.json / urlencoded ---
app.post(
  '/api/payment/webhook',
  express.raw({ type: 'application/json' }), // ✅ nécessaire pour Stripe
  webhookController.handleStripeWebhook
);

// --- Middlewares pour le reste des routes ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes API ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/produits', require('./routes/produits'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/galerie', require('./routes/galerie'));
app.use('/api/recherche', require('./routes/recherche'));
app.use('/api/avis', require('./routes/avis'));

// --- Fichiers statiques / uploads ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../FrontEnd')));

// --- Pages spécifiques ---
app.get('/produit/:ref', (req, res) => {
  res.sendFile(path.join(__dirname, '../FrontEnd/pages/produit/produit.html'));
});

// --- Fallback frontend pour pages valides ---
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, '../FrontEnd/error.html'));
});

// --- Connexion MongoDB ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connecté à MongoDB'))
  .catch((err) => console.error('❌ Erreur MongoDB :', err));

// --- Lancement serveur ---
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Serveur lancé sur ${HOST}:${PORT}`);
});
