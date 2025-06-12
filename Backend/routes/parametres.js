// routes/parametres.js

import express from "express";
const router = express.Router();

export default function parametresRoutes(db) {
  router.get("/", async (req, res) => {
    try {
      const row = await db.get("SELECT * FROM parametres WHERE id = 1");
      res.json(row);
    } catch (err) {
      console.error("Erreur récupération paramètres :", err);
      res.status(500).json({ error: "Erreur récupération paramètres" });
    }
  });

  router.patch("/", async (req, res) => {
    try {
      const { confettis } = req.body;
      if (typeof confettis !== "boolean") {
        return res
          .status(400)
          .json({ error: "champ 'confettis' attendu (boolean)" });
      }
      await db.run(
        "UPDATE parametres SET confettis = ? WHERE id = 1",
        confettis ? 1 : 0
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Erreur mise à jour paramètres :", err);
      res.status(500).json({ error: "Erreur mise à jour paramètres" });
    }
  });

  return router;
}
