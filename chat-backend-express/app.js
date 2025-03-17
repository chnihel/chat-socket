// server.js
const express = require("express");
const dotenv = require("dotenv");
const socketIo = require("socket.io");
const connectDB = require("./env/env");
const http = require("http");
const cors = require('cors');
const adminRoutes = require('./routes/Adminroutes');
const errorHandler = require('./utils/errorHandler');
const { initializeSocket } = require("./utils/socketmanger")
const messageRoutes = require("./routes/chat")
const userRoutes = require("./routes/chatusers")
const cookieParser = require('cookie-parser');
const Message = require("./models/chatmodel");
const User = require("./models/amdin");


dotenv.config();
const app = express();
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*", // Autoriser toutes les origines
  },
});
const connectedAdmins = new Map();

io.on("connection", async(socket) => {
  console.log(`Client connecté : ${socket.id}`);

  socket.on("requestHistory", async (userId) => {
    try {
        console.log("🛠 Demande de l'historique reçue pour l'utilisateur :", userId);

        const messages = await Message.find({
            $or: [{ sender: userId }, { recipient: userId }],
        }).sort({ createdAt: 1 });

        console.log("✅ Messages trouvés :", messages.length, "messages.");
        socket.emit("chatHistory", messages);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération de l'historique :", error);
        socket.emit("error", "Erreur lors de la récupération de l'historique.");
    }
});

  // Gestion de l'inscription d'un admin
  socket.on("registerAdmin", async (adminId) => {
    try {
      const admin = await User.findById(adminId);
      if (admin && admin.role === "admin") {
        connectedAdmins.set(socket.id, adminId);
        socket.emit("message", "Enregistré comme admin");
      } else {
        socket.emit("error", "Admin non trouvé ou rôle invalide");
      }
    } catch (error) {
      socket.emit("error", "Erreur lors de l'enregistrement");
    }
  });
  socket.on("message", async ({ recipientId, content }) => {
    try {
        console.log("📩 Données reçues :", { recipientId, content });

        // Récupération de l'ID de l'expéditeur depuis les sockets connectés
        const senderId = connectedAdmins.get(socket.id);
        if (!senderId) {
            console.error("Erreur : Aucun senderId trouvé pour socket.id :", socket.id);
            return socket.emit("error", "Non autorisé");
        }

        if (!recipientId || !content) {
            console.error("Données invalides : recipientId ou content manquant !");
            return socket.emit("error", "Les données du message sont invalides.");
        }

        // Création d'un nouvel objet message
        const newMessage = new Message({
            sender: senderId,
            recipient: recipientId,
            content: content,
        });

        console.log("💾 Message à sauvegarder :", newMessage);

        // Sauvegarde du message dans la base de données
        await newMessage.save()
            .then(() => console.log("Message sauvegardé avec succès !"))
            .catch((err) => {
                console.error("Erreur lors de l'enregistrement :", err);
                return socket.emit("error", "Échec de l'enregistrement du message.");
            });

        // Vérifier si le destinataire est en ligne
        const recipientSocketId = [...connectedAdmins.entries()].find(
            ([, id]) => id === recipientId
        )?.[0];

        // Si le destinataire est en ligne, lui envoyer le message en temps réel
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("newMessage", newMessage);
        }

        // Confirmation de l'envoi au client expéditeur
        socket.emit("message", `Message envoyé: ${content}`);

    } catch (error) {
        console.error("Erreur dans l'envoi du message :", error);
        socket.emit("error", "Erreur lors de l'envoi du message");
    }
});

  socket.on("disconnect", () => {
    console.log(`Client déconnecté : ${socket.id}`);
    connectedAdmins.delete(socket.id);
  });
});



// Middleware pour CORS (il faut d'abord initialiser l'app)
// Configure CORS
const corsOptions = {
    origin: 'http://localhost:3000', // L'origine de frontend
    credentials: true, // Permet d'envoyer des cookies avec la requête
};

app.use(cors(corsOptions)); // Appliquer cette configuration à toutes les routes

app.use(cookieParser());

// Connexion à la base de données MongoDB
connectDB();

// Middleware pour gérer les requêtes JSON
app.use(express.json());

app.use(errorHandler);
app.use('/api/admin', adminRoutes);
app.use("/api/users", userRoutes)
app.use("/api/messages", messageRoutes)
// Lancer le serveur sur un port
const PORT =  5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
