import mongoose from "mongoose";

const themeSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prix: { type: Number, required: true },
  image: { type: String, required: true },
  // Couleurs du plan, dérivées de la version blanche : sol, blocs, rues, contours, espaces verts
  backgroundColor: { type: String, default: "#ffffff" },
  gridColor: { type: String, default: "#d9d9d9" },
  crosshairColor: { type: String, default: "#b9b9be" },
  subgridColor: { type: String, default: "#646464" },
  greenColor: { type: String, default: "#358838" },
  // Couleur principale de l'interface (boutons, focus, tracé d'itinéraire)
  primaryColor: { type: String, default: "#1e6b37" },
  // « light » : interface claire ; « dark » : interface sombre (thème Darklight)
  mode: { type: String, enum: ["light", "dark"], default: "light" },
  animate: { type: Boolean, default: false },
});

export default mongoose.models.Theme || mongoose.model("Theme", themeSchema);
