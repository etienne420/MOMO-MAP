import mongoose from "mongoose";

const themeSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prix: { type: Number, required: true },
  image: { type: String, required: true },
});

export default mongoose.model("Theme", themeSchema);
