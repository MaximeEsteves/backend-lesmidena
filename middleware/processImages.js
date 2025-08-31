const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Règles de validation
const MAX_SIZE = 4 * 1024 * 1024; // 4 Mo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Dimensions cibles
const COVER_WIDTH = 1920;
const COVER_HEIGHT = 600;
const IMAGE_WIDTH = 900;
const IMAGE_HEIGHT = 600;

async function processImages(req, res, next) {
  try {
    if (!req.files) return next();

    // --- Vérif & traitement imageCouverture ---
    if (req.files.imageCouverture && req.files.imageCouverture[0]) {
      const file = req.files.imageCouverture[0];

      // Vérifs sécurité
      if (file.size > MAX_SIZE)
        throw new Error('Fichier trop volumineux (> 4 Mo)');
      if (!ALLOWED_TYPES.includes(file.mimetype))
        throw new Error('Type de fichier non autorisé');

      // Conversion en .webp
      const ext = path.extname(file.filename);
      const baseName = path.basename(file.filename, ext);
      const newName = `${baseName}.webp`;
      const newPath = path.join(file.destination, newName);

      await sharp(file.path)
        .resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'outside' })
        .webp({ quality: 90 })
        .toFile(newPath);

      fs.unlinkSync(file.path); // supprime original
      req.files.imageCouverture[0].filename = newName;
    }

    // --- Vérif & traitement images multiples ---
    if (req.files.image && req.files.image.length > 0) {
      req.files.image = await Promise.all(
        req.files.image.map(async (file) => {
          if (file.size > MAX_SIZE)
            throw new Error('Fichier trop volumineux (> 4 Mo)');
          if (!ALLOWED_TYPES.includes(file.mimetype))
            throw new Error('Type de fichier non autorisé');

          const ext = path.extname(file.filename);
          const baseName = path.basename(file.filename, ext);
          const newName = `${baseName}.webp`;
          const newPath = path.join(file.destination, newName);

          await sharp(file.path)
            .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: 'outside' })
            .webp({ quality: 90 })
            .toFile(newPath);

          fs.unlinkSync(file.path);

          // On retourne un "fichier" cohérent avec filename mis à jour
          return { ...file, filename: newName };
        })
      );
    }

    next();
  } catch (err) {
    console.error('Erreur traitement images:', err);
    res
      .status(400)
      .json({ error: err.message || 'Impossible de traiter les images' });
  }
}

module.exports = processImages;
