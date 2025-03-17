const mongoose = require('mongoose');
const { Schema } = mongoose; 

const adminSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  role: { type: String, required: true, enum: ['admin', 'super-admin'] }
});

// Mettre à jour `lastActive` à chaque sauvegarde
adminSchema.pre('save', function (next) {
    this.lastActive = Date.now();
    next();
});


module.exports = mongoose.model('Admin', adminSchema);
