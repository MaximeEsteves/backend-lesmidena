const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    categorie: { type: String, required: true },
    imageCouverture: { type: String, required: true },
    nom: { type: String, required: true },
    image: [{ type: String }],
    description: { type: String },
    titreDescription: { type: String },
    descriptionComplete: { type: String },
    materiaux: { type: String },
    prix: { type: Number, required: true },
    reference: { type: String },
    stock: { type: Number, required: true },
  },
  {
    timestamps: true, // Pour createdAt et updatedAt
  }
);

module.exports = mongoose.model('Product', productSchema);
