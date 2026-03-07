const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true }, // Make email optional and unique
  countryCode: { type: String, required: false }, // New field
  phoneNumber: { type: String, required: true, unique: true }, // Ensure phoneNumber is unique
  password: { type: String, required: true },
  userType: { type: String, enum: ['Admin', 'Manager', 'Member', 'Driver'], default: 'Member' },
  memberOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  credits: { type: Number, default: 0 },

  referralCode: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },
  referralEarnings: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
});

// Generate referral code before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') && this.referralCode) return next();
  
  // Generate referral code if it doesn't exist
  if (!this.referralCode) {
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.referralCode = `${this.firstName.substring(0, 1)}${randomString}`;
  }

  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});


// Virtual field for the club managed by this user
userSchema.virtual('managedClub', {
  ref: 'Club',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
});

// Ensure virtual fields are included when converting to JSON or objects
userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

// // Hash password before saving
// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// Match Password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);