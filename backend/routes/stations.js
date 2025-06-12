// routes/stations.js

import express from "express";
import ligne1 from "../data/ligne1.js";
import ligne6 from "../data/ligne6.js";
import ligne12 from "../data/ligne12.js";

const router = express.Router();

const lignesData = {
  1: ligne1,
  6: ligne6,
  12: ligne12,
};

export default function stationsRoutes(db) {
  router.get("/", async (req, res) => {
    try {
      const ligne = req.query.ligne || "1";
      const stations = await db.all(
        "SELECT * FROM stations WHERE ligne = ? ORDER BY id ASC",
        [ligne]
      );
      res.json(stations);
    } catch (err) {
      console.error("Erreur récupération stations :", err);
      res.status(500).json({ error: "Erreur récupération stations" });
    }
  });

  router.post("/init/:ligne", async (req, res) => {
    try {
      const ligne = parseInt(req.params.ligne, 10);
      if (isNaN(ligne)) {
        return res.status(400).json({ error: "Numéro de ligne invalide." });
      }

      const noms = lignesData[ligne];
      if (!noms) {
        return res
          .status(404)
          .json({ error: `Ligne ${req.params.ligne} non prise en charge.` });
      }

      await db.run("DELETE FROM stations WHERE ligne = ?", [String(ligne)]);
      for (const nom of noms) {
        await db.run("INSERT INTO stations (nom, ligne) VALUES (?, ?)", [
          nom,
          String(ligne),
        ]);
      }

      res.json({ success: true, total: noms.length });
    } catch (err) {
      console.error(
        `Erreur insertion stations ligne ${req.params.ligne} :`,
        err
      );
      res.status(500).json({ error: "Erreur insertion" });
    }
  });

  return router;
}
