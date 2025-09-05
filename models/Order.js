const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  clientEmail: String,
  clientNom: String,
  clientTelephone: Number,
  adresse: {
    rue: String,
    ville: String,
    cp: String,
  },
  articles: [
    {
      id: mongoose.Schema.Types.ObjectId,
      reference: String,
      categorie: String,
      nom: String,
      quantite: Number,
      prixUnitaire: Number,
    },
  ],
  total: Number,
  internet: {
    type: Boolean,
    default: true,
  },

  date: { type: Date, default: Date.now },
  stripeSessionId: {
    type: String,
    required: true,
    unique: true,
  },
});

module.exports = mongoose.model('Order', orderSchema);
