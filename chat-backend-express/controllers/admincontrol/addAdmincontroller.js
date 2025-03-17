const bcrypt = require('bcryptjs'); // Importez bcrypt
const Admin = require('../../models/amdin'); // Assurez-vous que le chemin est correct

exports.addAdmin = async (req, res) => {
  try {
    const { firstName, lastName, username, password, role } = req.body;

    // Hacher le mot de passe
    const salt = await bcrypt.genSalt(10); // Générer un "salt"
    const hashedPassword = await bcrypt.hash(password, salt); // Hacher le mot de passe

    // Créer un nouvel administrateur avec le mot de passe haché
    const newAdmin = new Admin({
      firstName,
      lastName,
      username,
      password: hashedPassword, // Utiliser le mot de passe haché
      role,
    });
    await newAdmin.save(); // Enregistrer l'administrateur dans la base de données
    res.status(201).json({ message: 'Administrateur ajouté avec succès.' });
  } catch (error) {
    if (error.code === 11000) {
      // Gérer l'erreur de duplication (nom d'utilisateur déjà pris)
      res.status(400).json({ errors: { username: 'Ce nom d\'utilisateur est déjà pris.' } });
    } else {
      // Gérer les autres erreurs
      console.error('Erreur lors de l\'ajout de l\'administrateur:', error);
      res.status(500).json({ message: 'Une erreur est survenue lors de l\'ajout de l\'administrateur.' });
    }
  }
};