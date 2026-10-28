import mongoose from "mongoose";

const localSchema = new mongoose.Schema({
  numero: { type: String, required: true },
  nom: { type: String, default: "" },
  etage: { type: Number, required: true },
  categorie: { type: String, required: true },
  bloc: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
});

export default mongoose.model("Local", localSchema);
