const Product = require("../models/Product");
const path = require("path");
const fs = require("fs");

// ➕ Ajouter un produit
exports.ajouterProduit = async (req, res) => {
  try {
    // Champs texte
    const { categorie, nom, prix, description, titreDescription, descriptionComplete, materiaux, reference, stock } = req.body;

    // Fichiers
    // Multer te donne file.filename (sans chemin)
// Fichiers (on ne garde que "uploads/filename", pas le chemin absolu)
    const imageCouverture = `uploads/${req.files.imageCouverture[0].filename}`;
    const imagesProduit   = (req.files.image || [])
      .map(f => `uploads/${f.filename}`);


    const product = new Product({
      categorie,
      nom,
      prix,
      description,
      titreDescription,
      descriptionComplete,
      materiaux,
      reference,
      stock,
      imageCouverture,
      image: imagesProduit
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
  console.error("Erreur lors de l'ajout :", err.message || err, err.stack);
  res.status(500).json({ message: "Erreur lors de l'ajout", error: err.message || err });
}
};


// 🔄 Modifier un produit

exports.modifierProduit = async (req, res) => {
  try {
    const produit = await Product.findById(req.params.id);
    if (!produit) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    // 🧼 1. Gestion des images à supprimer
    let imagesASupprimer = req.body.imagesASupprimer;
    if (!Array.isArray(imagesASupprimer)) {
      if (imagesASupprimer) {
        imagesASupprimer = [imagesASupprimer];
      } else {
        imagesASupprimer = [];
      }
    }

    imagesASupprimer.forEach(imgPath => {
      const fullPath = path.join(__dirname, "../", imgPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath); // Supprime le fichier physique
      }
    });

    // Mets à jour le tableau image[] en supprimant celles retirées
    produit.image = produit.image.filter(img => !imagesASupprimer.includes(img));

    // 📤 2. Ajout de nouvelles images
    if (req.files && req.files.image) {
      const files = Array.isArray(req.files.image) ? req.files.image : [req.files.image];
      const nouvellesImages = files.map(file => `uploads/${file.filename}`);
      produit.image.push(...nouvellesImages);
    }

    // 🖼️ 3. Mise à jour de l'image de couverture
    if (req.files && req.files.imageCouverture && req.files.imageCouverture[0]) {
      const couverture = req.files.imageCouverture[0];
      produit.imageCouverture = `uploads/${couverture.filename}`;
    }

    // 📝 4. Mise à jour des champs texte
    produit.categorie = req.body.categorie || produit.categorie;
    produit.nom = req.body.nom || produit.nom;
    produit.description = req.body.description || produit.description;
    produit.titreDescription = req.body.titreDescription || produit.titreDescription;
    produit.descriptionComplete = req.body.descriptionComplete || produit.descriptionComplete;
    produit.materiaux = req.body.materiaux || produit.materiaux;
    produit.prix = req.body.prix || produit.prix;
    produit.reference = req.body.reference || produit.reference;
    produit.stock = req.body.stock || produit.stock;

    // ✅ 5. Sauvegarde en base
    await produit.save();

    res.json({ message: "Produit mis à jour avec succès", produit });

  } catch (error) {
    console.error("Erreur modification :", error);
    res.status(500).json({ message: "Erreur lors de la modification", error });
  }
};



// ❌ Supprimer un produit
exports.supprimerProduit = async (req, res) => {
  try {
    const produitSupprime = await Product.findByIdAndDelete(req.params.id);
    if (!produitSupprime) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }
    res.json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error });
  }
};

// 📄 Récupérer tous les produits
exports.getProduits = async (req, res) => {
  try {
    const produits = await Product.find();
    res.json(produits);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération", error });
  }
};
