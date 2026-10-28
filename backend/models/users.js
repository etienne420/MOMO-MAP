import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tokens: { type: Number, default: 0 },
  themeActuel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Theme",
    default: null,
  },
  avatarActuel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Avatar",
    default: null,
  },
});

export default mongoose.model("User", userSchema);
