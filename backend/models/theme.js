import mongoose from "mongoose";

const themeSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prix: { type: Number, required: true },
  image: { type: String, required: true },
  gridColor: { type: String, default: '#dadce0' },
  subgridColor: { type: String, default: 'rgba(60, 64, 67, 0.08)' },
  crosshairColor: { type: String, default: '#9aa0a6' },
  backgroundColor: { type: String, default: '#f1f3f4' },
  animate: { type: Boolean, default: false },
});

export default mongoose.model("Theme", themeSchema);
