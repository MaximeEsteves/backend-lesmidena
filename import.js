require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

async function importCollection() {
  const uri = process.env.MONGO_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('boutique');
  const col = db.collection('orders');

  // Optionnel : vider la collection avant
  await col.deleteMany({});

  // Lire les données JSON
  const docs = JSON.parse(fs.readFileSync('ajoutCommande.json', 'utf-8'));

  const docsWithObjectIdAndDate = docs.map((doc) => {
    // --- Gestion de _id ---
    let _id;
    if (doc._id) {
      try {
        _id = new ObjectId(doc._id.$oid || doc._id);
      } catch (err) {
        _id = new ObjectId();
      }
    } else {
      _id = new ObjectId();
    }

    // --- Gestion de la date ---
    let date;
    if (doc.date && doc.date.$date) {
      date = new Date(doc.date.$date);
    } else if (doc.date) {
      date = new Date(doc.date);
    } else {
      date = new Date();
    }

    return { ...doc, _id, date };
  });

  // Insérer les documents corrigés
  await col.insertMany(docsWithObjectIdAndDate);

  console.log('Import terminé depuis ajoutCommande.json avec dates correctes');
  await client.close();
}

importCollection().catch(console.error);
