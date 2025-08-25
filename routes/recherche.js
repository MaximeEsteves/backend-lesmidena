const express = require('express');
const router = express.Router();
const Article = require('../models/Product');

router.get('/', async (req, res) => {
  const search = req.query.search || '';
  try {
    const articles = await Article.find({
      $or: [
        { nom: { $regex: search, $options: 'i' } },
        { categorie: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { titreDescription: { $regex: search, $options: 'i' } },
      ],
    }).limit(15); // limite pour éviter de renvoyer 200 produits

    res.json(articles);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
