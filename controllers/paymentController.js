// paymentController.js
const Produit = require('../models/Product');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Calcul simple des frais de livraison
 * Gratuit si total >= 100 €, sinon 4.99 €
 */
function calculerFraisLivraison(totalOrder) {
  const fraisFixe = 4.99;
  return totalOrder >= 100 ? 0 : fraisFixe;
}

exports.createCheckoutSession = async (req, res) => {
  try {
    const { lignes, customer } = req.body;
    // Vérification stock en base
    const produitsMap = new Map();
    for (let ligne of lignes) {
      const produit = await Produit.findById(ligne.id);
      if (!produit) {
        return res.status(400).json({ error: 'Produit introuvable' });
      }
      if (produit.stock < ligne.quantite) {
        return res.status(400).json({
          error: `Le produit ${produit.nom} n’a plus assez de stock (${produit.stock} restants)`,
        });
      }
      produitsMap.set(ligne.id, produit);
    }

    let line_items = [];
    let totalOrder = 0;
    for (const item of lignes) {
      const produit = produitsMap.get(item.id);
      const quantite = item.quantite || 1;
      const prixCentimes = Math.round(produit.prix * 100);
      totalOrder += produit.prix * quantite;

      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${produit.categorie} - ${produit.nom}`,
            description: produit.description || produit.reference,
          },
          unit_amount: prixCentimes,
        },
        quantity: quantite,
      });
    }

    // Frais de livraison
    const fraisLivraison = calculerFraisLivraison(totalOrder);
    if (fraisLivraison > 0) {
      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Frais de livraison',
            description: 'Frais d’expédition',
          },
          unit_amount: Math.round(fraisLivraison * 100),
        },
        quantity: 1,
      });
    }

    // Stocker les lignes en metadata pour le webhook
    // Reconstruire les lignes complètes avec reference et categorie
    const produitsAvecMeta = lignes.map((l) => {
      const produit = produitsMap.get(l.id);
      return {
        id: l.id,
        nom: produit.nom,
        reference: produit.reference,
        categorie: produit.categorie,
        quantite: l.quantite,
        prixUnitaire: produit.prix,
      };
    });

    // Création de la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      metadata: {
        nom: customer.nom,
        adresse: customer.adresse,
        ville: customer.ville,
        cp: customer.cp,
        email: customer.email,
        telephone: customer.telephone,
        products: JSON.stringify(produitsAvecMeta),
      },
      success_url: `${process.env.FRONTEND_URL}/pages/payment/success.html`,
      cancel_url: `${process.env.FRONTEND_URL}/pages/payment/cancel.html`,
      customer_email: customer.email,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Erreur Stripe:', err);
    return res.status(500).json({ message: 'Erreur création session Stripe' });
  }
};
