import mongoose from "mongoose";

const avatarSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prix: { type: Number, required: true },
  image: { type: String, required: true },
});

export default mongoose.model("Avatar", avatarSchema);
