import express from "express";
const router = express.Router();

export default function recompensesRoutes(db, upload) {
  router.get("/", async (req, res) => {
    try {
      const rows = await db.all("SELECT * FROM recompenses");
      res.json(rows);
    } catch (err) {
      console.error("Erreur récupération récompenses :", err);
      res.status(500).json({ error: "Erreur récupération récompenses" });
    }
  });

  router.post("/", upload.single("image"), async (req, res) => {
    try {
      const { label } = req.body;
      let imagePath = "";
      if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
      }
      const result = await db.run(
        "INSERT INTO recompenses (label, imagePath, selected) VALUES (?, ?, 0)",
        [label, imagePath]
      );
      res.json({ id: result.lastID, label, imagePath, selected: 0 });
    } catch (err) {
      console.error("Erreur ajout récompense :", err);
      res.status(500).json({ error: "Erreur ajout récompense" });
    }
  });

  router.patch("/select/0", async (req, res) => {
    try {
      await db.run("UPDATE recompenses SET selected = 0");
      res.json({ message: "Récompenses désélectionnées." });
    } catch (err) {
      console.error("Erreur désélection récompenses :", err);
      res.status(500).json({ error: "Erreur désélection récompenses" });
    }
  });

  router.patch("/select/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.run("UPDATE recompenses SET selected = 0");
      await db.run("UPDATE recompenses SET selected = 1 WHERE id = ?", [id]);
      res.json({ message: `Récompense ${id} sélectionnée.` });
    } catch (err) {
      console.error("Erreur sélection récompense :", err);
      res.status(500).json({ error: "Erreur sélection récompense" });
    }
  });

  // ✅ PATCH /recompenses/:id — modifie uniquement le label
  router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { label } = req.body;

    if (!label || typeof label !== "string") {
      return res.status(400).json({ error: "Label requis" });
    }

    try {
      await db.run("UPDATE recompenses SET label = ? WHERE id = ?", [
        label.trim(),
        id,
      ]);
      res.json({ message: `Récompense ${id} mise à jour.` });
    } catch (err) {
      console.error("Erreur mise à jour récompense :", err);
      res.status(500).json({ error: "Erreur mise à jour récompense" });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const rec = await db.get(
        "SELECT imagePath FROM recompenses WHERE id = ?",
        [id]
      );
      if (rec?.imagePath) {
        const fs = await import("fs");
        const path = await import("path");
        fs.unlink(path.join(process.cwd(), rec.imagePath), () => {});
      }
      await db.run("DELETE FROM recompenses WHERE id = ?", [id]);
      res.json({ message: `Récompense ${id} supprimée.` });
    } catch (err) {
      console.error("Erreur suppression récompense :", err);
      res.status(500).json({ error: "Erreur suppression récompense" });
    }
  });

  return router;
}
