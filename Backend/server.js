// server.js
import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import multer from "multer";

import tachesRoutes from "./routes/taches.js";
import recompensesRoutes from "./routes/recompenses.js";
import parametresRoutes from "./routes/parametres.js";
import stationsRoutes from "./routes/stations.js";
import categoriesRoutes from "./routes/categories.js";

async function start() {
  const db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });

  // === Tables existantes ===
  await db.exec(`
    CREATE TABLE IF NOT EXISTS parametres (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      confettis BOOLEAN DEFAULT 1
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS taches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT,
      categorie TEXT,
      aujourdhui BOOLEAN,
      fait BOOLEAN DEFAULT 0,
      imagePath TEXT,
      position INTEGER DEFAULT 0
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS recompenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT,
      imagePath TEXT,
      selected BOOLEAN DEFAULT 0
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      ligne TEXT NOT NULL
    );
  `);

  // === Table catégories ===
  await db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      value TEXT PRIMARY KEY,
      label TEXT NOT NULL
    );
  `);

  // Seed de la catégorie par défaut 'none' / 'Pas de catégorie'
  await db.run(
    `INSERT OR IGNORE INTO categories (value, label)
     VALUES ('none', 'Pas de catégorie');`
  );

  // === Middleware ===
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static("uploads"));

  // Limitation upload
  const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  // === Routes ===
  app.use("/taches", tachesRoutes(db, upload));
  app.use("/recompenses", recompensesRoutes(db, upload));
  app.use("/parametres", parametresRoutes(db));
  app.use("/stations", stationsRoutes(db));
  app.use("/categories", categoriesRoutes(db));

  // === Démarrage ===
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () =>
    console.log(`Serveur démarré sur http://localhost:${PORT}`)
  );
}

start().catch((err) => {
  console.error("Erreur au démarrage du serveur :", err);
});
