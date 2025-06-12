// src/routes/categories.js
import express from "express";

export default function categoriesRoutes(db) {
  const router = express.Router();

  // GET /categories — renvoie la liste triée par label
  router.get("/", async (req, res) => {
    try {
      const cats = await db.all(
        "SELECT value, label FROM categories ORDER BY label ASC"
      );
      res.json(cats);
    } catch (err) {
      console.error("Erreur récupération catégories :", err);
      res.status(500).json({ error: "Erreur récupération catégories" });
    }
  });

  // POST /categories — ajoute une nouvelle catégorie (value ≠ "none")
  router.post("/", async (req, res) => {
    const { value, label } = req.body;
    if (!value || !label || value === "none") {
      return res
        .status(400)
        .json({ error: "value et label requis, 'none' interdit" });
    }
    try {
      await db.run("INSERT INTO categories (value, label) VALUES (?, ?)", [
        value,
        label,
      ]);
      res.json({ value, label });
    } catch (err) {
      console.error("Erreur ajout catégorie :", err);
      res.status(500).json({ error: "Erreur ajout catégorie" });
    }
  });

  // DELETE /categories/:value — supprime et réaffecte 'none' aux tâches
  router.delete("/:value", async (req, res) => {
    const { value } = req.params;
    if (value === "none") {
      return res
        .status(400)
        .json({ error: "Impossible de supprimer la catégorie par défaut" });
    }
    try {
      // Réassigner 'none' aux taches qui avaient cette catégorie
      await db.run("UPDATE taches SET categorie = 'none' WHERE categorie = ?", [
        value,
      ]);
      // Supprimer la catégorie
      await db.run("DELETE FROM categories WHERE value = ?", [value]);
      res.json({ deleted: value });
    } catch (err) {
      console.error("Erreur suppression catégorie :", err);
      res.status(500).json({ error: "Erreur suppression catégorie" });
    }
  });

  return router;
}
