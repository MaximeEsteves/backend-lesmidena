const Utilisateur = require('../models/Utilisateur');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { email, motDePasse } = req.body;
  if (await Utilisateur.findOne({ email })) {
    return res.status(400).json({ message: 'Email déjà utilisé' });
  }

  const hash = await bcryptjs.hash(motDePasse, 10);
  const user = await new Utilisateur({ email, motDePasse: hash }).save();
  res.status(201).json({ message: 'Utilisateur créé', id: user._id });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Champs requis manquants' });
  }

  try {
    const user = await Utilisateur.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: 'Email ou mot de passe invalide' });
    }

    const isMatch = await bcryptjs.compare(password, user.motDePasse);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: 'Email ou mot de passe invalide' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('Erreur lors de la connexion :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
