// routes/taches.js

import express from "express";
const fs = await import("fs");
const path = await import("path");
const router = express.Router();

export default function tachesRoutes(db, upload) {
  // === GET toutes les tâches ===
  router.get("/", async (req, res) => {
    try {
      const orderBy =
        req.query.orderBy === "position" ? "ORDER BY position ASC" : "";
      const taches = await db.all(`SELECT * FROM taches ${orderBy}`);
      res.json(taches);
    } catch (err) {
      console.error("Erreur récupération tâches :", err);
      res.status(500).json({ error: "Erreur récupération tâches" });
    }
  });

  // === POST une nouvelle tâche ===
  router.post("/", upload.single("image"), async (req, res) => {
    try {
      const { label, categorie } = req.body;
      let imagePath = "";
      if (req.file) imagePath = `/uploads/${req.file.filename}`;

      const result = await db.run(
        `INSERT INTO taches (label, categorie, aujourdhui, fait, imagePath, position)
         VALUES (?, ?, 0, 0, ?, 0)`,
        [label, categorie, imagePath]
      );

      res.json({
        id: result.lastID,
        label,
        categorie,
        aujourdhui: 0,
        fait: 0,
        imagePath,
        position: 0,
      });
    } catch (err) {
      console.error("Erreur ajout tâche :", err);
      res.status(500).json({ error: "Erreur ajout tâche" });
    }
  });

  // === PATCH reset aujourdhui ===
  router.patch("/reset", async (req, res) => {
    try {
      await db.run("UPDATE taches SET aujourdhui = 0");
      res.json({ message: "Toutes les tâches décochées dans l’édition." });
    } catch (err) {
      console.error("Erreur reset tâches :", err);
      res.status(500).json({ error: "Erreur reset tâches" });
    }
  });

  // === PATCH reset fait ===
  router.patch("/resetfait", async (req, res) => {
    try {
      await db.run("UPDATE taches SET fait = 0");
      res.json({ message: "Toutes les tâches faites décochées." });
    } catch (err) {
      console.error("Erreur reset fait :", err);
      res.status(500).json({ error: "Erreur reset fait" });
    }
  });

  // === PATCH mise à jour d'une tâche ===
  router.patch("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { aujourdhui, fait, label, categorie, position } = req.body || {};

      if (typeof aujourdhui !== "undefined") {
        await db.run("UPDATE taches SET aujourdhui = ? WHERE id = ?", [
          aujourdhui ? 1 : 0,
          id,
        ]);
      }
      if (typeof fait !== "undefined") {
        await db.run("UPDATE taches SET fait = ? WHERE id = ?", [
          fait ? 1 : 0,
          id,
        ]);
      }
      if (typeof label !== "undefined") {
        await db.run("UPDATE taches SET label = ? WHERE id = ?", [label, id]);
      }
      if (typeof categorie !== "undefined") {
        await db.run("UPDATE taches SET categorie = ? WHERE id = ?", [
          categorie,
          id,
        ]);
      }
      if (typeof position !== "undefined") {
        await db.run("UPDATE taches SET position = ? WHERE id = ?", [
          position,
          id,
        ]);
      }

      res.json({ message: `Tâche ${id} mise à jour.` });
    } catch (err) {
      console.error("Erreur mise à jour tâche :", err);
      res.status(500).json({ error: "Erreur mise à jour tâche" });
    }
  });

  // === DELETE tâche ===
  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const tache = await db.get("SELECT imagePath FROM taches WHERE id = ?", [
        id,
      ]);
      if (tache?.imagePath) {
        fs.unlink(path.join(process.cwd(), tache.imagePath), (e) => {
          if (e) console.warn("Image non supprimée :", e.message);
        });
      }
      await db.run("DELETE FROM taches WHERE id = ?", [id]);
      res.json({ message: `Tâche ${id} supprimée.` });
    } catch (err) {
      console.error("Erreur suppression tâche :", err);
      res.status(500).json({ error: "Erreur suppression tâche" });
    }
  });

  return router;
}
