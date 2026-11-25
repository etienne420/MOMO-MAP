import sharp from "sharp";
import Avatar from "../models/Avatar.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

// GET /api/avatars
export async function getAvatars(req, res, next) {
  try {
    const avatars = await Avatar.find().sort({ createdAt: -1 });
    return res.status(200).json(avatars);
  } catch (err) {
    return next(err);
  }
}

// POST /api/avatars
export async function createAvatar(req, res, next) {
  try {
    const nom = req.body.nom?.trim();
    const prix = Number(req.body.prix);

    if (!nom) {
      return res.status(400).json({ message: "Le nom de l'avatar est requis" });
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
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();

    const result = await uploadBufferToCloudinary(optimizedBuffer, "avatars");

    const avatar = await Avatar.create({
      nom,
      prix,
      image: result.secure_url,
      imageKey: result.public_id,
    });

    return res.status(201).json(avatar);
  } catch (err) {
    return next(err);
  }
}
