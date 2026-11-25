import sharp from "sharp";
import DOMPurify from "isomorphic-dompurify";
import Avatar from "../models/avatar.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

function createHttpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

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
      return next(createHttpError("Le nom de l'avatar est requis", 400));
    }

    if (Number.isNaN(prix) || prix < 0) {
      return next(createHttpError("Le prix doit être un nombre positif", 400));
    }

    if (!req.file) {
      return next(createHttpError("Une image est requise", 400));
    }

    const isSvg = req.file.mimetype === "image/svg+xml";

    let bufferToUpload;
    if (isSvg) {
      const cleanedSvg = DOMPurify.sanitize(req.file.buffer.toString("utf8"), {
        USE_PROFILES: { svg: true, svgFilters: true },
      });
      bufferToUpload = Buffer.from(cleanedSvg, "utf8");
    } else {
      bufferToUpload = await sharp(req.file.buffer)
        .resize(256, 256, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer();
    }

    const result = await uploadBufferToCloudinary(
      bufferToUpload,
      "avatars",
      isSvg,
    );

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
