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
  tokens: {                                                                                               
      type: Number,                                                                                         
      default: 1,                                                                                           
      min: 0,                                                                                               
    },                                                                                                      
    lastDailyBonusAt: {                                                                                     
      type: Date,                                                                                           
      default: null,                                                                                        
    },             
  avatarActuel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Avatar",
    default: null,
  },
  ownedThemes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Theme" }],
  ownedAvatars: [{ type: mongoose.Schema.Types.ObjectId, ref: "Avatar" }],
  settings: {
    turnByTurnGuidance: { type: Boolean, default: true },
    showSchoolInsights: { type: Boolean, default: true },
    reducedMotion: { type: Boolean, default: false },
  },
});

export default mongoose.model("User", userSchema);
