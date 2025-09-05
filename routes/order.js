const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const {
  verifierToken,
  verifierAdmin,
} = require('../middleware/authMiddleware');
const {
  ajouterProduit,
  exportOrders,
} = require('../controllers/orderController');
// Récupérer toutes les commandes
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter une commande
router.post('/', verifierToken, verifierAdmin, ajouterProduit);

// Export PDF / Excel
router.get('/export', verifierToken, verifierAdmin, exportOrders);
module.exports = router;
