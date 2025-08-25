const Produit = require('../models/Product');
const Order = require('../models/Order'); // on va l'utiliser plus tard
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Exemple de fonction pour calculer les frais de livraison côté backend
// Ici, frais fixes à 4.99 €, ou logique plus complexe selon totalOrder ou adresse.
function calculerFraisLivraison(totalOrder, customer) {
  // totalOrder est en euros (nombre), customer contient adresse, ville, cp, etc.
  // Exemple simple : frais fixes 4.99 €, gratuits si totalOrder >= 100€
  const fraisFixe = 4.99;
  if (totalOrder >= 100) {
    return 0;
  }
  return fraisFixe;
}

exports.createCheckoutSession = async (req, res) => {
  try {
    const { lignes, customer } = req.body;
    // lignes : [{ id: ..., quantite: ... }, ...]
    // customer : { nom, adresse, ville, cp, email, telephone }
    if (!Array.isArray(lignes) || !customer) {
      return res
        .status(400)
        .json({ message: 'Données du panier ou du client manquantes.' });
    }

    // 1) Calculer les line_items Stripe pour les produits
    const line_items = [];
    let totalOrder = 0;

    for (const ligne of lignes) {
      const produitId = ligne.id;
      const quantite = ligne.quantite || 1;
      const produit = await Produit.findById(produitId);
      if (!produit) {
        return res
          .status(400)
          .json({ message: `Produit non trouvé (${produitId})` });
      }

      const prixCentimes = Math.round(produit.prix * 100);
      totalOrder += produit.prix * quantite;

      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${produit.categorie} - ${produit.nom}`,
            description: produit.description || '',
            description: produit.reference,
            // Vous pouvez ajouter images: [URL], etc.
          },
          unit_amount: prixCentimes,
        },
        quantity: quantite,
      });
    }

    // 2) Calculer les frais de livraison côté serveur
    const fraisLivraisonEuro = calculerFraisLivraison(totalOrder, customer);
    if (fraisLivraisonEuro > 0) {
      const fraisCentimes = Math.round(fraisLivraisonEuro * 100);
      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Frais de livraison',
            description: 'Frais d’expédition',
          },
          unit_amount: fraisCentimes,
        },
        quantity: 1,
      });
    }
    // Si fraisLivraisonEuro == 0, on n’ajoute pas de ligne, ou on peut ajouter une ligne "Livraison gratuite" si souhaité.

    // 3) Préparer metadata ou stocker commande en base
    const produitsJSON = JSON.stringify(lignes);

    // Optionnel : créer en base une Order avant redirection, afin d’avoir un enregistrement
    // const newOrder = await Order.create({ customer, lignes, status: 'pending', total: totalOrder + fraisLivraisonEuro });

    // 4) Création de la session Stripe
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
        products: produitsJSON,
        // Si vous avez créé une commande en base, incluez son ID en metadata:
        // order_id: newOrder._id.toString(),
      },
      success_url: `${process.env.FRONTEND_URL}/success.html`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel.html`,
      // Vous pouvez aussi ajouter customer_email: customer.email si vous voulez pré-remplir
      customer_email: customer.email,
      // Si vous souhaitez collecter l'adresse de livraison via Stripe, utilisez shipping_address_collection:
      // shipping_address_collection: {
      //   allowed_countries: ['FR'], // ou autres
      // },
      // Et configurer shipping_options si vous préférez rates configurés dans Stripe Dashboard:
      // shipping_options: [
      //   { shipping_rate: 'shr_standard_shipping_rate_id' },
      // ],
    });

    // 5) Répondre au front-end avec l’URL de redirection Stripe
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Erreur Stripe:', err);
    return res
      .status(500)
      .json({ message: 'Erreur lors de la création de la session Stripe' });
  }
};
