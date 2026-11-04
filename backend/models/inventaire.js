import mongoose from "mongoose";

const inventaireSchema = new mongoose.Schema({
  utilisateurid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  themes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Theme" }],
  avatars: [{ type: mongoose.Schema.Types.ObjectId, ref: "Avatar" }],
});

export default mongoose.model("Inventaire", inventaireSchema);
