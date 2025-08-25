const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../controllers/webhookController');

router.post(
  '/',
  express.raw({ type: 'application/json' }), // requis pour Stripe
  handleStripeWebhook
);

module.exports = router;
