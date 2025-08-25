const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  clientEmail: String,
  clientNom: String,
  adresse: {
    rue: String,
    ville: String,
    cp: String,
  },
  articles: [
    {
      id: mongoose.Schema.Types.ObjectId,
      nom: String,
      quantite: Number,
      prixUnitaire: Number,
    },
  ],
  total: Number,
  date: { type: Date, default: Date.now },
  stripeSessionId: {
    type: String,
    required: true,
    unique: true,
  },
});

module.exports = mongoose.model('Order', orderSchema);
