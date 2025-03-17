const express = require('express');
const { getAllAdmins } = require('../controllers/admincontrol/getAdmincontroller'); // Importer la fonction de récupération
const { deleteAdmin } = require('../controllers/admincontrol/deleteAdmincontroller'); // Importer la fonction de suppression
const adminController = require('../controllers/admincontrol/addAdmincontroller');
const adminloginController = require('../controllers/admincontrol/Adminlogincontroller');
const authMiddleware = require('../midlleware/Adminmidlleware'); // Middleware d'authentification

const {logout} =require('../controllers/admincontrol/Adminlogincontroller')
const router = express.Router();

router.get('/all', getAllAdmins); // Route pour récupérer les administrateurs
router.delete('/delete/:id', deleteAdmin); // Route pour supprimer un administrateur
router.post('/add', adminController.addAdmin);
router.post('/login', adminloginController.login);
router.post('/logout', logout);
module.exports = router;