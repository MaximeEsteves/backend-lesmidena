const Order = require('../models/Order');
const Produit = require('../models/Product');
const { exportToPDF, exportToExcel } = require('../middleware/exportService');

exports.ajouterProduit = async (req, res) => {
  try {
    const {
      date,
      categorie,
      nom,
      reference,
      quantite,
      prixUnitaire,
      produitId,
    } = req.body;

    if (!categorie || !nom || !reference || !quantite || !prixUnitaire) {
      return res
        .status(400)
        .json({ error: 'Tous les champs sont obligatoires.' });
    }

    // Crée une nouvelle commande magasin
    const nouvelleCommande = new Order({
      clientEmail: 'magasin@example.com',
      clientNom: 'Magasin',
      clientTelephone: 0,
      adresse: { rue: '', ville: '', cp: '' },
      articles: [
        {
          id: produitId || null, // utile si l’article vient du stock
          reference,
          categorie,
          nom,
          quantite,
          prixUnitaire,
        },
      ],
      total: quantite * prixUnitaire,
      internet: false,
      date: date ? new Date(date) : new Date(),
      stripeSessionId: `manual-${Date.now()}`, // id unique fictif
    });

    await nouvelleCommande.save();

    // 👉 Mise à jour du stock si produitId est fourni
    if (produitId) {
      const produit = await Produit.findById(produitId);
      if (produit) {
        produit.stock = Math.max(0, (produit.stock || 0) - quantite);
        await produit.save();
      }
    }

    res.status(201).json({
      message: 'Article ajouté avec succès !',
      order: nouvelleCommande,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de l’ajout.' });
  }
};

exports.exportOrders = async (req, res) => {
  try {
    const { format, periode, mois, annee } = req.query;

    let filter = {};
    if (periode === 'year' && annee) {
      const year = parseInt(annee);
      const start = new Date(year, 0, 1);
      const end = new Date(year + 1, 0, 1); // 1er janvier année suivante
      filter.date = { $gte: start, $lt: end };
    }

    if (periode === 'month' && mois !== undefined && annee) {
      const year = parseInt(annee);
      const month = parseInt(mois);
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 1); // début du mois suivant
      filter.date = { $gte: start, $lt: end };
    }

    let orders;
    if (Object.keys(filter).length > 0) {
      orders = await Order.find(filter).sort({ date: 1 });
    } else {
      orders = await Order.find().sort({ date: 1 });
    }
    console.log(
      'Orders backend:',
      orders.map((o) => ({ _id: o._id, date: o.date }))
    );
    let buffer;
    if (format === 'pdf') {
      buffer = await exportToPDF(orders, annee, mois);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=export.pdf');
    } else {
      buffer = await exportToExcel(orders, annee, mois);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename=export.xlsx');
    }

    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur export' });
  }
};
