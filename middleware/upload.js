const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Création du dossier uploads si besoin
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Fonction pour récupérer le prochain index disponible
function getNextIndex() {
  const files = fs.readdirSync(uploadsDir);

  // Extraire les numéros à la fin du nom de fichier (avant l'extension)
  const indexes = files
    .map((file) => {
      const match = file.match(/_(\d+)\.[^.]+$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((num) => num !== null);

  return indexes.length > 0 ? Math.max(...indexes) + 1 : 1;
}

// Configuration de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    const { categorie, nom, reference } = req.body;

    const safeCategorie = (categorie || 'unknow')
      .replace(/\s+/g, '_')
      .toLowerCase();
    const safeNom = (nom || 'unknow').replace(/\s+/g, '_').toLowerCase();
    const safeRef = (reference || 'unknow').replace(/\s+/g, '_').toLowerCase();

    // Récupérer le prochain index basé sur les fichiers existants
    const idx = getNextIndex();

    cb(null, `${safeCategorie}_${safeNom}_${safeRef}_${idx}${ext}`);
  },
});

// Export du middleware d'upload
const upload = multer({ storage });

module.exports = upload;
