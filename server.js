const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const corsOptions = {
  //origin: 'https://localhost:3000',
  origin: 'https://lesmidena.netlify.app',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  optionsSuccessStatus: 204,
};

// 1) Pour les webhooks, il faut récupérer le corps en RAW
const webhookController = require('./controllers/webhookController');
const rechercheRoutes = require('./routes/recherche');

app.post(
  '/api/payment/webhook',
  express.raw({ type: 'application/json' }),
  webhookController.handleStripeWebhook
);

// 2) Puis le reste des middlewares normaux
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3) Vos routes existantes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/produits', require('./routes/produits'));
app.use('/api/payment', require('./routes/payment'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/galerie', require('./routes/galerie'));
app.use('/api/recherche', rechercheRoutes);

// 4) Frontend static et fallback
app.use(express.static(path.join(__dirname, '../FrontEnd')));
app.get('/produit/:ref', (req, res) => {
  res.sendFile(path.join(__dirname, '../FrontEnd/pages/produit/produit.html'));
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../FrontEnd/index.html'));
});

// 5) Connexion MongoDB, lancement du serveur…
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connecté à MongoDB'))
  .catch((err) => console.error('❌ Erreur MongoDB :', err));

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Serveur lancé sur ${HOST}:${PORT}`);
});
