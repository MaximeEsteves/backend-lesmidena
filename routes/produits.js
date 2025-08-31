// routes/produits.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const upload = require('../middleware/upload');
const processImages = require('../middleware/processImages');
const {
  getProduits,
  ajouterProduit,
  modifierProduit,
  supprimerProduit,
} = require('../controllers/produitController');

const {
  verifierToken,
  verifierAdmin,
} = require('../middleware/authMiddleware');
// routes/produits.js, avant router.get("/", getProduits);
router.get('/by-ref/:ref', async (req, res) => {
  try {
    const p = await Product.findOne({ reference: req.params.ref });
    if (!p) return res.status(404).json({ message: 'Produit non trouvé' });
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
router.get('/', getProduits);
router.post(
  '/',
  verifierToken,
  verifierAdmin,
  upload.fields([
    { name: 'imageCouverture', maxCount: 1 },
    { name: 'image', maxCount: 10 },
  ]),
  processImages,
  ajouterProduit
);

router.put(
  '/:id',
  verifierToken,
  verifierAdmin,
  upload.fields([
    { name: 'imageCouverture', maxCount: 1 },
    { name: 'image', maxCount: 10 },
  ]),
  processImages,
  modifierProduit
);
router.delete('/:id', verifierToken, verifierAdmin, supprimerProduit);
router.get('/secret', verifierToken, (req, res) => {
  res.json({ message: 'Accès autorisé', user: req.utilisateur });
});

module.exports = router;
