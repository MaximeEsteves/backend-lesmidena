// export.js
require('dotenv').config();
console.log("🔑 MONGO_URI chargé :", process.env.MONGO_URI);

const { MongoClient } = require('mongodb');
const fs = require('fs');

async function exportCollection() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("🚨 MONGO_URI non défini dans .env");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const col = client.db().collection("products");
    const all = await col.find({}).toArray();
    fs.writeFileSync("produits.json", JSON.stringify(all, null, 2));
    console.log("✅ Export terminé : produits-database.json");
  } catch (err) {
    console.error("❌ Erreur lors de l’export :", err);
  } finally {
    await client.close();
  }
}

exportCollection();
