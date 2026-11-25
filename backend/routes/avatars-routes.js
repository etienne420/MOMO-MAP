import express from "express";
import multer from "multer";
import { getAvatars, createAvatar } from "../controllers/avatars-controller.js";

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

router.get("/", getAvatars);
router.post("/", upload.single("image"), createAvatar);

export default router;
