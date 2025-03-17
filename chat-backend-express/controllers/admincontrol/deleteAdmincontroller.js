// controllers/deleteAdmin.js
const Admin = require('../../models/amdin');

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await Admin.findByIdAndDelete(id);
    res.status(200).json({ message: 'Administrateur supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'administrateur.' });
  }
};