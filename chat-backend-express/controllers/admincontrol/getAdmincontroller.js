// controllers/getAdmins.js
const Admin = require('../../models/amdin');

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({});
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des administrateurs.' });
  }
};