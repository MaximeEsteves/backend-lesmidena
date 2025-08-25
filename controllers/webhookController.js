const Produit = require('../models/Product');
const Order = require('../models/Order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // ✅ utiliser req.body ici (pas req.rawBody)
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Signature invalide Stripe :', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // 1) Protection doublon
    const exist = await Order.findOne({ stripeSessionId: session.id });
    if (exist) {
      console.log(`🔁 Commande déjà traitée pour la session ${session.id}`);
      return res.status(200).send('Webhook dupliqué ignoré');
    }
    try {
      const produits = JSON.parse(session.metadata.products);
      const articles = [];

      for (const item of produits) {
        const produit = await Produit.findById(item.id);
        if (produit) {
          articles.push({
            id: produit._id,
            nom: produit.nom,
            quantite: item.quantite,
            prixUnitaire: produit.prix,
          });
        }
      }

      const nouvelleCommande = new Order({
        clientNom: session.metadata.nom,
        clientEmail: session.metadata.email,
        adresse: {
          rue: session.metadata.adresse,
          ville: session.metadata.ville,
          cp: session.metadata.cp,
        },
        articles,
        total: session.amount_total / 100,
        stripeSessionId: session.id,
      });

      await nouvelleCommande.save();
      console.log('✅ Commande enregistrée dans MongoDB');

      for (const item of produits) {
        const produit = await Produit.findById(item.id);
        if (produit) {
          produit.stock -= item.quantite;
          if (produit.stock <= 0) {
            await Produit.findByIdAndDelete(produit._id);
            console.log(`🗑️ Produit supprimé (stock épuisé) : ${produit.nom}`);
          } else {
            await produit.save();
            console.log(`📉 Stock mis à jour pour : ${produit.nom}`);
          }
        }
      }

      // 📧 Envoi de l'email de confirmation
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const htmlClient = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Confirmation de votre commande</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .header { text-align: center; padding: 20px; }
    .header img { max-width: 150px; }
    .content { padding: 0 20px; }
    h2 { color: #D48B9C; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
    th { background-color: #f7f7f7; }
    .total { font-weight: bold; }
    .footer { text-align: center; font-size: 0.9em; color: #777; margin: 30px 0 10px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://lesmidena.netlify.app/assets/icons/logo.jpg" alt="Logo Mignonneries de Nathalie" />
  </div>
  <div class="content">
    <h2>🎉 Merci pour votre commande, ${session.metadata.nom} !</h2>
    <p>Votre paiement de <strong>${(session.amount_total / 100).toFixed(
      2
    )} €</strong> a été validé avec succès.</p>
    
    <h3>🧾 Récapitulatif de votre commande</h3>
    <table>
      <thead>
        <tr>
          <th>Produit</th>
          <th>Quantité</th>
          <th>Prix Unitaire</th>
          <th>Sous-total</th>
        </tr>
      </thead>
      <tbody>
        ${articles
          .map(
            (a) => `
          <tr>
            <td>${a.nom}</td>
            <td>${a.quantite}</td>
            <td>${a.prixUnitaire.toFixed(2)} €</td>
            <td>${(a.prixUnitaire * a.quantite).toFixed(2)} €</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="total">Total</td>
          <td class="total">${(session.amount_total / 100).toFixed(2)} €</td>
        </tr>
      </tfoot>
    </table>

    <p>📬 Nous expédions votre commande à :</p>
    <p>
      ${session.metadata.adresse}<br/>
      ${session.metadata.cp} ${session.metadata.ville}
    </p>

    <p>Pour toute question, répondez simplement à cet email ! 😊</p>
  </div>
  <div class="footer">
    <p>Mignonneries de Nathalie – <a href="https://lesmidena.netlify.app/">https://lesmidena.netlify.app</a></p>
    <p> ✉️ lesmidena@gmail.com</p>
  </div>
</body>
</html>
`;

      await transporter.sendMail({
        from: `"Mignonneries de Nathalie" <${process.env.EMAIL_USER}>`,
        to: session.metadata.email,
        subject: '🛍️ Votre commande Mignonneries de Nathalie',
        html: htmlClient,
      });
      console.log('📧 Email client envoyé.');

      const htmlAdmin = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Nouvelle commande reçue</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .header { text-align: center; padding: 20px; }
    .header img { max-width: 150px; }
    .content { padding: 0 20px; }
    h2 { color: #D48B9C; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
    th { background-color: #f7f7f7; }
    .footer { text-align: center; font-size: 0.9em; color: #777; margin: 30px 0 10px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://lesmidena.netlify.app/assets/icons/logo.jpg" alt="Logo Mignonneries de Nathalie" />
  </div>
  <div class="content">
    <h2>💰 Nouvelle commande reçue</h2>
    <p><strong>Client :</strong> ${session.metadata.nom} (${
        session.metadata.email
      })</p>
    <p><strong>Livraison :</strong><br/>
       ${session.metadata.adresse}<br/>
       ${session.metadata.cp} ${session.metadata.ville}
    </p>

    <h3>📋 Détails de la commande</h3>
    <table>
      <thead>
        <tr>
          <th>Produit</th>
          <th>Quantité</th>
          <th>PU</th>
          <th>ST</th>
        </tr>
      </thead>
      <tbody>
        ${articles
          .map(
            (a) => `
          <tr>
            <td>${a.nom}</td>
            <td>${a.quantite}</td>
            <td>${a.prixUnitaire.toFixed(2)} €</td>
            <td>${(a.prixUnitaire * a.quantite).toFixed(2)} €</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3"><strong>Total</strong></td>
          <td><strong>${(session.amount_total / 100).toFixed(2)} €</strong></td>
        </tr>
      </tfoot>
    </table>

    <p><em>Commande n°${
      nouvelleCommande._id
    } – ${new Date().toLocaleString()}</em></p>
  </div>
  <div class="footer">
    <p>Mignonneries de Nathalie – <a href="https://lesmidena.netlify.app/">https://lesmidena.netlify.app</a></p>
  </div>
</body>
</html>
`;

      await transporter.sendMail({
        from: `"Mignonneries de Nathalie" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `🛒 Nouvelle commande n°${nouvelleCommande._id}`,
        html: htmlAdmin,
      });
      console.log('📧 Email gérant envoyé.');

      console.log('📧 Email de confirmation client envoyé.');

      console.log('📧 Récapitulatif de commande envoyé au gérant.');

      console.log('📧 Email de confirmation envoyé');
    } catch (err) {
      console.error('❌ Erreur traitement commande :', err);
      return res.status(500).send('Erreur serveur');
    }
  }

  res.status(200).send('Webhook reçu');
};
