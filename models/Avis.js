// models/avis.js
const mongoose = require('mongoose');

const AvisSchema = new mongoose.Schema(
  {
    productRef: { type: String, required: true, index: true },
    nom: { type: String, required: true, trim: true, maxlength: 50 },
    note: { type: Number, required: true, min: 0, max: 5 },
    commentaire: { type: String, required: true, maxlength: 2000 },
    date: { type: Date, default: Date.now },
    validated: { type: Boolean, default: false },
  },
  { versionKey: false }
);
module.exports = mongoose.model('Avis', AvisSchema);
