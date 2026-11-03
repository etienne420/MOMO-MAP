import mongoose from "mongoose";

const poiSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  numero: { type: String, default: "" },
  description: { type: String, default: "" },
  categorie: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  etage: { type: Number, required: true },
});

export default mongoose.model("POI", poiSchema);
