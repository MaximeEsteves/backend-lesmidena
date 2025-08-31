// routes/avis.js (GET)
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');
const express = require('express');
const router = express.Router();
const Avis = require('../models/Avis');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const axios = require('axios');
const {
  verifierToken,
  verifierAdmin,
} = require('../middleware/authMiddleware');

// routes/avis.js (GET global ou filtré)
router.get('/', async (req, res) => {
  try {
    const { productRef, limit = 200 } = req.query;

    // Détection de l’admin via le token si présent
    const token = req.headers['authorization']?.split(' ')[1];
    let isAdmin = false;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        isAdmin = !!decoded.isAdmin;
      } catch (err) {
        // token invalide → non admin
      }
    }

    let query = {};
    if (productRef) {
      if (mongoose.Types.ObjectId.isValid(productRef)) {
        query = {
          $or: [
            { productRef: productRef },
            { productRef: mongoose.Types.ObjectId(productRef) },
          ],
        };
      } else {
        query = { productRef: productRef };
      }
    }

    // Si l'utilisateur n'est pas admin, ne renvoyer que les avis validés
    if (!isAdmin) {
      query.validated = true;
    }

    const list = await Avis.find(query).sort({ date: -1 }).limit(Number(limit));
    res.json(list);
  } catch (err) {
    console.error('GET /api/avis error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/avis
router.post('/', async (req, res) => {
  try {
    const { productRef, nom, note, commentaire, recaptchaToken } = req.body;
    // ✅ Vérification reCAPTCHA
    if (!recaptchaToken) {
      return res.status(400).json({ error: 'reCAPTCHA manquant' });
    }

    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (!data.success) {
      return res.status(400).json({ error: 'Échec vérification reCAPTCHA' });
    }
    // Vérifier que le produit existe
    const produitExiste = await Product.findOne({ reference: productRef });
    if (!produitExiste) {
      return res.status(400).json({ error: 'Produit inexistant' });
    }

    // Vérifier les champs obligatoires
    const missing = [];
    if (!productRef) missing.push('productRef');
    if (!nom) missing.push('nom');
    if (typeof note === 'undefined' || note === null || note === '')
      missing.push('note');
    if (!commentaire) missing.push('commentaire');
    if (missing.length) {
      return res
        .status(400)
        .json({ error: `Champs manquants: ${missing.join(', ')}` });
    }

    // Vérifier la note
    const noteNum = Number(note);
    if (!Number.isFinite(noteNum) || noteNum < 0 || noteNum > 5) {
      return res.status(400).json({ error: 'Note invalide (attendu 0-5)' });
    }

    // Limitation spam : un avis par minute pour le même nom et produit
    const lastAvis = await Avis.findOne({ productRef, nom }).sort({ date: -1 });
    if (lastAvis && Date.now() - new Date(lastAvis.date) < 60_000) {
      return res
        .status(429)
        .json({ error: "Merci d'attendre avant de poster un nouvel avis" });
    }

    // Nettoyer le commentaire pour éviter injection HTML/JS
    const commentairePropre = sanitizeHtml(commentaire, {
      allowedTags: [],
      allowedAttributes: {},
    });

    // Création de l'avis
    const nouvel = new Avis({
      productRef: String(productRef),
      nom: nom.trim(),
      note: Math.round(noteNum),
      commentaire: commentairePropre,
      date: new Date(),
      validated: false, // <--- par défaut non validé
    });

    await nouvel.save();
    res.status(201).json(nouvel);
  } catch (err) {
    console.error('POST /api/avis error:', err);
    res.status(500).json({ error: 'Impossible d’enregistrer l’avis' });
  }
});
// DELETE /api/avis/:id
router.delete('/:id', verifierToken, verifierAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Avis.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Avis non trouvé' });
    res.json({ message: 'Avis supprimé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/avis/:id/validate
router.patch(
  '/:id/validate',
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await Avis.findByIdAndUpdate(
        id,
        { validated: true },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Avis non trouvé' });
      res.json(updated);
    } catch (err) {
      console.error('PATCH /api/avis/:id/validate error:', err);
      res.status(500).json({ error: 'Erreur lors de la validation' });
    }
  }
);

module.exports = router;
