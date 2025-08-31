const jwt = require('jsonwebtoken');

function verifierToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // attend "Bearer <token>"
  if (!token) return res.status(401).json({ message: 'Token requis' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.utilisateur = decoded; // contient id, email, isAdmin
    next();
  } catch (err) {
    res.status(403).json({ message: 'Token invalide' });
  }
}

function verifierAdmin(req, res, next) {
  if (!req.utilisateur?.isAdmin) {
    return res.status(403).json({ message: 'Accès refusé : Admin uniquement' });
  }
  next();
  console.log('✅ middleware ok');
  console.log(req.utilisateur);
}

module.exports = { verifierToken, verifierAdmin };
