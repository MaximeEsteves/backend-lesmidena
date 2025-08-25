const express = require('express');
const router = express.Router();
const Galerie = require('../models/Galerie');

// POST : Ajouter une galerie avec plusieurs liens
router.post('/', async (req, res) => {
  const { videos } = req.body; // `videos` doit être un tableau de strings
  try {
    const nouvelleGalerie = new Galerie({ videos });
    const saved = await nouvelleGalerie.save();
    res.status(201).json(saved);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Erreur lors de l'enregistrement", error: err });
  }
});

// GET : Récupérer toutes les galeries
router.get('/', async (req, res) => {
  try {
    const galeries = await Galerie.find();
    res.json(galeries);
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Erreur lors de la récupération', error: err });
  }
});

module.exports = router;
