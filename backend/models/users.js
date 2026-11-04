import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
    required: true,
  },
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
