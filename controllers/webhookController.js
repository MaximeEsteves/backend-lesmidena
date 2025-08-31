// controllers/webhookController.js
const Produit = require('../models/Product');
const Order = require('../models/Order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

// Vérifier la connexion SMTP au lancement (log utile)
transporter.verify((err, success) => {
  if (err) console.error('❌ SMTP verify failed:', err);
  else console.log('✅ SMTP ready');
});

exports.handleStripeWebhook = async (req, res) => {
  console.log('--- webhook received ---');
  console.log(
    'Headers stripe-signature present:',
    !!req.headers['stripe-signature']
  );
  console.log(
    'Raw body length:',
    Buffer.isBuffer(req.body) ? req.body.length : typeof req.body
  );

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    // req.body est le Buffer fourni par express.raw
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Signature Stripe validée. Event type:', event.type);
  } catch (err) {
    console.error('❌ Signature invalide Stripe :', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('➡️ checkout.session.completed pour session id=', session.id);

      // protection doublon
      const exist = await Order.findOne({ stripeSessionId: session.id });
      if (exist) {
        console.log(`🔁 Commande déjà traitée (session ${session.id})`);
        return res.status(200).send('Webhook dupliqué ignoré');
      }

      // parser les produits stockés en metadata (safe)
      let produits = [];
      try {
        produits = JSON.parse(session.metadata?.products || '[]');
      } catch (e) {
        console.error('⚠️ Impossible de parser session.metadata.products :', e);
        produits = [];
      }

      // construire les articles et vérifier l'existence
      const articles = [];
      for (const item of produits) {
        if (!item?.id) continue;
        const produit = await Produit.findById(item.id);
        if (produit) {
          articles.push({
            id: produit._id,
            nom: produit.nom,
            categorie: produit.categorie,
            quantite: item.quantite || 1,
            prixUnitaire: produit.prix,
            reference: produit.reference || String(produit._id), // utile pour le lien
          });
        } else {
          console.warn('⚠️ Produit introuvable pour id:', item.id);
        }
      }

      // Enregistrer la commande
      const nouvelleCommande = new Order({
        clientNom: session.metadata?.nom || 'Inconnu',
        clientEmail: session.metadata?.email || '',
        adresse: {
          rue: session.metadata?.adresse || '',
          ville: session.metadata?.ville || '',
          cp: session.metadata?.cp || '',
        },
        articles,
        total: (session.amount_total || 0) / 100,
        stripeSessionId: session.id,
      });

      await nouvelleCommande.save();
      console.log('✅ Commande enregistrée en BDD id=', nouvelleCommande._id);

      // Mise à jour du stock (silencieuse si produit introuvable)
      for (const item of produits) {
        if (!item?.id) continue;
        const produit = await Produit.findById(item.id);
        if (!produit) continue;
        produit.stock -= item.quantite || 1;
        if (produit.stock <= 0) {
          produit.stock = Math.max(0, produit.stock - (item.quantite || 1));
          await produit.save();
        }
      }

      // Emails — préparer destinataires (fallback pour tests CLI)
      const clientEmail = session.metadata?.email || process.env.EMAIL_USER;
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

      // Préparer HTML simplifié
      const baseFront = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

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
    .review-link {
      display:inline-block;
      padding:8px 12px;
      background:#D48B9C;
      color:#fff;
      border-radius:6px;
      text-decoration:none;
      margin-top:6px;
    }
    ul.product-list { list-style: none; padding: 0; margin: 0; }
    ul.product-list li { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #eee; }
    .footer { text-align: center; font-size: 0.9em; color: #777; margin: 30px 0 10px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://lesmidena.netlify.app/assets/icons/logo.webp" alt="Logo Mignonneries de Nathalie" />
  </div>
  <div class="content">
    <h2>🎉 Merci pour votre commande, ${
      session.metadata?.nom || 'client'
    } !</h2>
    <p>Votre paiement de <strong>${((session.amount_total || 0) / 100).toFixed(
      2
    )} €</strong> a été validé avec succès.</p>
    
    <h3>🧾 Récapitulatif de votre commande</h3>
    <table>
      <thead>
        <tr>
          <th>Produit</th>
          <th>Référence</th>
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
            <td>${a.categorie + ' ' + a.nom}</td>
            <td>${a.reference}</td>
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
          <td colspan="4" class="total">Total</td>
          <td class="total">${((session.amount_total || 0) / 100).toFixed(
            2
          )} €</td>
        </tr>
      </tfoot>
    </table>

    <p>📬 Nous expédions votre commande à :</p>
    <p>
      ${session.metadata?.adresse || ''}<br/>
      ${session.metadata?.cp || ''} ${session.metadata?.ville || ''}
    </p>

    <h3>✍️ Déposer un avis</h3>
    <p>Un petit mot pour vous, un grand pour nous — vous pouvez laisser un avis pour chaque produit acheté :</p>
    <ul class="product-list">
      ${articles
        .map((a) => {
          const ref = a.reference || a.id || '';
          const productUrl = ref
            ? `${baseFront}/produit/${encodeURIComponent(ref)}#avis-produit`
            : baseFront || '#';
          return `
            <li>
              <div style="font-weight:600;">${a.categorie + ' ' + a.nom}</div>
              <div>${a.quantite} × ${a.prixUnitaire.toFixed(2)} €</div>
              <div>
                <a class="review-link" href="${productUrl}" target="_blank" rel="noopener noreferrer">
                  Laisser un avis sur ce produit
                </a>
              </div>
            </li>
          `;
        })
        .join('')}
    </ul>

  </div>
  <div class="footer">
    <p>Mignonneries de Nathalie – <a href="https://lesmidena.netlify.app/">https://lesmidena.netlify.app</a></p>
    <p> ✉️ lesmidena@gmail.com</p>
  </div>
</body>
</html>
`;

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
    <img src="https://lesmidena.netlify.app/assets/icons/logo.webp" alt="Logo Mignonneries de Nathalie" />
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
          <th>Référence</th>
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
            <td>${a.categorie + ' ' + a.nom}</td>
            <td>${a.reference}</td>
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
          <td colspan="4"><strong>Total</strong></td>
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
      // Envoi mail client (try/catch indépendant)
      if (!clientEmail) {
        console.warn('⚠️ Aucun email client trouvé -> mail client non envoyé');
      } else {
        try {
          console.log('🚀 Envoi mail client à', clientEmail);
          const infoClient = await transporter.sendMail({
            from: `"Mignonneries de Nathalie" <${process.env.EMAIL_USER}>`,
            to: clientEmail,
            subject: '🛍️ Confirmation de votre commande',
            html: htmlClient,
            replyTo: process.env.EMAIL_USER,
          });
          console.log('📧 Mail client envoyé id=', infoClient.messageId);
        } catch (err) {
          console.error('❌ Erreur envoi mail client :', err);
        }
      }

      // Envoi mail admin
      if (!adminEmail) {
        console.warn('⚠️ ADMIN_EMAIL absent -> mail admin non envoyé');
      } else {
        try {
          console.log('🚀 Envoi mail admin à', adminEmail);
          const infoAdmin = await transporter.sendMail({
            from: `"Mignonneries de Nathalie" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `🛒 Nouvelle commande n°${nouvelleCommande._id}`,
            html: htmlAdmin,
          });
          console.log('📧 Mail admin envoyé id=', infoAdmin.messageId);
        } catch (err) {
          console.error('❌ Erreur envoi mail admin :', err);
        }
      }
    }
  } catch (err) {
    console.error('❌ Erreur traitement webhook :', err);
    // retourne 200 ou 500 selon ta stratégie ; ici on renvoie 500 si vraiment erreur interne
    return res.status(500).send('Erreur serveur pendant traitement webhook');
  }

  // Toujours répondre 200 si le traitement s'est bien déroulé (ou s'il s'agit d'un event non géré)
  res.status(200).send('Webhook reçu');
};
