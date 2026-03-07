const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema({
  clubName: { type: String, required: true },
  managerFirstName: { type: String, required: true },
  managerLastName: { type: String, required: true },
  managerEmail: { type: String, required: true, unique: true },
  managerPhone: { type: String, required: true },
  managerShare: { type: Number, required: true },
  adminShare: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Relation to User
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Club", clubSchema);
