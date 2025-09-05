// installer nodemailer si ce n'est pas déjà fait :
// npm install nodemailer

const nodemailer = require('nodemailer');

async function sendTestMail() {
  try {
    // 1. Crée un transporteur SMTP
    let transporter = nodemailer.createTransport({
      host: 'smtp.orange.fr', // ou smtp de ton fournisseur (ex: smtp-mail.outlook.com)
      port: 465, // 465 = SSL, 587 = TLS
      secure: true, // true pour 465, false pour 587
      auth: {
        user: 'maxime.esteves81@orange.fr', // ton adresse email
        pass: 'dpsyd-hobou-mjahp-vwbmv', // ton mot de passe ou mot de passe d’application
      },
    });

    // 2. Envoie du mail
    let info = await transporter.sendMail({
      from: '"Test Nodemailer" <maxime.esteves81@orange.fr>', // expéditeur
      to: 'maxime.esteves81200@gmail.com', // destinataire (ici toi-même)
      subject: 'Hello ✔', // sujet
      text: 'Ceci est un test avec Nodemailer.', // version texte
      html: '<b>Ceci est un test avec Nodemailer.</b>', // version HTML
    });

    console.log('Message envoyé: %s', info.messageId);
  } catch (error) {
    console.error('Erreur:', error);
  }
}

sendTestMail();
