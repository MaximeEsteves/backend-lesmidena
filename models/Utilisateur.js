const mongoose = require("mongoose");

const utilisateurSchema = new mongoose.Schema({
  email:      { type: String, required: true, unique: true },
  motDePasse: { type: String, required: true },
  isAdmin:    { type: Boolean, default: false }
});

module.exports = mongoose.model("Utilisateur", utilisateurSchema);
