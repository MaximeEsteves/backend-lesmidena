require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

async function importCollection() {
  const uri = process.env.MONGO_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('boutique');
  const col = db.collection('products');

  // Optionnel : vider la collection avant
  await col.deleteMany({});

  // Lire les données JSON
  const docs = JSON.parse(fs.readFileSync('produits.json', 'utf-8'));

  // Pour chaque document, convertir _id en ObjectId si possible ou en générer un nouveau sinon
  const docsWithObjectId = docs.map((doc) => {
    if (doc._id) {
      // Si _id est une chaîne de 24 caractères hexadécimale, on la convertit
      if (typeof doc._id === 'string' && doc._id.match(/^[0-9a-fA-F]{24}$/)) {
        return { ...doc, _id: new ObjectId(doc._id) };
      } else if (!(doc._id instanceof ObjectId)) {
        // Tentative de conversion, sinon génère un nouvel ObjectId
        try {
          return { ...doc, _id: new ObjectId(doc._id) };
        } catch (err) {
          return { ...doc, _id: new ObjectId() };
        }
      }
      return doc;
    }
    // Si pas d'_id, en générer un nouveau
    return { ...doc, _id: new ObjectId() };
  });

  // Insérer les documents corrigés
  await col.insertMany(docsWithObjectId);

  console.log('Import terminé depuis produits.json');
  await client.close();
}

importCollection().catch(console.error);
