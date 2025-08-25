require('dotenv').config();
const nodemailer = require('nodemailer');

(async () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Test Mignonneries" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'Test Nodemailer',
      html: "<h1>Test d'envoi d'email</h1>",
    });
    console.log('✅ Email envoyé :', info.messageId);
  } catch (err) {
    console.error("❌ Erreur lors de l'envoi du test d'email :", err);
  }
})();
