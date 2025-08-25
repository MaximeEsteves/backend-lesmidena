const mongoose = require('mongoose');

const galerieSchema = new mongoose.Schema({
  videos: [String], // Tableau de liens (URLs) de vidéos
});

module.exports = mongoose.model('Galerie', galerieSchema);
