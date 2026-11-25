import mongoose from "mongoose";

const avatarSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    prix: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    imageKey: { type: String },
  },
  { timestamps: true },
);

export default mongoose.models.Avatar || mongoose.model("Avatar", avatarSchema);
