import sharp from "sharp";
import Theme from "../models/theme.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

// GET /api/themes
export async function getThemes(req, res, next) {
  try {
    const themes = await Theme.find().sort({ _id: -1 });
    return res.status(200).json(themes);
  } catch (err) {
    return next(err);
  }
}

// POST /api/themes
export async function createTheme(req, res, next) {
  try {
    const nom = req.body.nom?.trim();
    const prix = Number(req.body.prix);

    if (!nom) {
      return res.status(400).json({ message: "Le nom du thème est requis" });
    }

    if (Number.isNaN(prix) || prix < 0) {
      return res
        .status(400)
        .json({ message: "Le prix doit être un nombre positif" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Une image est requise" });
    }

    const optimizedBuffer = await sharp(req.file.buffer)
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();

    const result = await uploadBufferToCloudinary(optimizedBuffer, "themes");

    const themeData = {
      nom,
      prix,
      image: result.secure_url,
    };

    if (req.body.gridColor) themeData.gridColor = req.body.gridColor.trim();
    if (req.body.subgridColor)
      themeData.subgridColor = req.body.subgridColor.trim();
    if (req.body.crosshairColor)
      themeData.crosshairColor = req.body.crosshairColor.trim();
    if (req.body.backgroundColor)
      themeData.backgroundColor = req.body.backgroundColor.trim();
    if (req.body.animate !== undefined) {
      themeData.animate =
        req.body.animate === true || req.body.animate === "true";
    }

    const theme = await Theme.create(themeData);
    return res.status(201).json(theme);
  } catch (err) {
    return next(err);
  }
}
