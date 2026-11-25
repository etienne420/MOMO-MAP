import express from "express";
import multer from "multer";
import { getThemes, createTheme } from "../controllers/themes-controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5 Mo
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      const err = new Error("Seuls les fichiers image sont autorisés");
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

router.get("/", getThemes);
router.post("/", upload.single("image"), createTheme);

export default router;
