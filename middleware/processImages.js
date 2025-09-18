const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Règles de validation
const MAX_SIZE = 4 * 1024 * 1024; // 4 Mo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Dimensions cibles
const COVER_WIDTH = 1920;
const COVER_HEIGHT = 600;
const IMAGE_WIDTH = 900;
const IMAGE_HEIGHT = 600;

// 🔥 Suppression sécurisée d'un fichier

async function safeUnlink(filePath) {
  try {
    if (!filePath) return;
    await fs.unlink(filePath);
    console.log(`🗑️ Supprimé: ${filePath}`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`⚠️ Impossible de supprimer ${filePath}: ${err.message}`);
    }
  }
}

// 🔥 Nettoyage total : fichiers bruts + fichiers déjà convertis
async function cleanupUploadedFiles(req, generatedFiles = []) {
  if (req.files) {
    const allFiles = [
      ...(req.files.imageCouverture || []),
      ...(req.files.image || []),
    ];
    for (const file of allFiles) {
      await safeUnlink(file.path);
    }
  }

  for (const filePath of generatedFiles) {
    await safeUnlink(filePath);
  }
}

async function processImages(req, res, next) {
  const generatedFiles = []; // liste des fichiers .webp créés
  try {
    if (!req.files) return next();

    // --- Vérif & traitement imageCouverture ---
    if (req.files.imageCouverture && req.files.imageCouverture[0]) {
      const file = req.files.imageCouverture[0];

      if (file.size > MAX_SIZE)
        throw new Error('Fichier trop volumineux (> 4 Mo)');
      if (!ALLOWED_TYPES.includes(file.mimetype))
        throw new Error('Type de fichier non autorisé');

      const ext = path.extname(file.filename);
      const baseName = path.basename(file.filename, ext);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const newName = `${baseName}-${uniqueSuffix}.webp`;
      const newPath = path.join(file.destination, newName);

      await sharp(file.path)
        .resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'outside' })
        .webp({ quality: 90 })
        .toFile(newPath);

      generatedFiles.push(newPath); // ✅ garder trace

      safeUnlink(file.path); // supprime original
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
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const newName = `${baseName}-${uniqueSuffix}.webp`;
          const newPath = path.join(file.destination, newName);

          await sharp(file.path)
            .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: 'outside' })
            .webp({ quality: 90 })
            .toFile(newPath);

          generatedFiles.push(newPath); // ✅ garder trace

          safeUnlink(file.path); // supprime original

          return { ...file, filename: newName };
        })
      );
    }

    next();
  } catch (err) {
    console.error('Erreur traitement images:', err);

    // 🔥 Nettoyage des fichiers bruts ET des .webp déjà générés
    await cleanupUploadedFiles(req, generatedFiles);

    res
      .status(400)
      .json({ error: err.message || 'Impossible de traiter les images' });
  }
}

module.exports = processImages;
