"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import styles from "./chat.module.css"
import axios from "axios"
import { io } from "socket.io-client";

export default function ChatPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [chatHistory, setChatHistory] = useState([]);
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    const socketInstance = io("http://localhost:5000",{ transports: ["websocket"] });
    setSocket(socketInstance);
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    } else {
      router.push("/login");
    }
    return () => {
      socketInstance.disconnect();
    };
  }, [router]);

  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("✅ Connecté avec socket ID:", socket.id);

      // Récupérer l'utilisateur depuis LocalStorage
      const user = JSON.parse(localStorage.getItem("data"));
      if (user && user._id) {
        console.log("Enregistrement de l'admin avec ID :", user._id);
        socket.emit("registerAdmin", user._id); // Assure-toi d'utiliser "registerAdmin"
        console.log(" Demande d'historique envoyée...");
            socket.emit("requestHistory", user._id);
      
      } else {
        console.error("Aucun utilisateur trouvé dans LocalStorage");
      }
    });

    socket.on("chatHistory", (history) => {
      console.log("📜 Historique des messages reçu :", history);
      if (history.length === 0) {
          console.warn("⚠️ Aucun message dans l'historique !");
      }
      setChatHistory([...history]);
  });

  socket.on("error", (errorMsg) => {
      console.error(" Erreur reçue du serveur :", errorMsg);
  })

    // Cleanup lors du démontage du composant
    return () => {
      socket.off("connect");
      socket.off("chatHistory");
      socket.off("error");

    };
  }, [socket]);


  return (
    <main className={styles.main}>
      {isLoggedIn ? (
        <div className={styles.container}>
          <h1 className={styles.title}>Chat Room</h1>
          <ChatRoom socket={socket} chatHistory={chatHistory}/>
        </div>
      ) : (
        <div className={styles.loading}>Loading...</div>
      )}
    </main>
  )
}

function ChatRoom({socket,chatHistory }) {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const inputRef = useRef(null)
  const [error, setError] = useState(null)

  console.log(users, "userss")

  // Keeping the existing axios call
  useEffect(() => {

    axios.get("http://localhost:5000/api/users/")
      .then((response) => {
        setUsers(response.data)
        setIsLoading(false)

      })
      .catch((err) => {
        setError("Failed to fetch users")
        setIsLoading(false)
      })
  }, [])

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (socket) {
      socket.on("receiveMessage", (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      });
    }
  }, [socket]);
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  useEffect(() => {
    // Fetch current user info
    const fetchCurrentUser = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("token")

        const response = await axios.get("http://localhost:5000/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setCurrentUser(response.data)
      } catch (error) {
        console.error("Error fetching current user:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentUser()

    // Update last active status every minute
    const updateActiveStatus = async () => {
      try {
        const token = localStorage.getItem("token")

        await axios.put(
          "http://localhost:5000/api/users/active",
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )
      } catch (error) {
        console.error("Error updating active status:", error)
      }
    }

    const activeInterval = setInterval(updateActiveStatus, 60000)

    return () => clearInterval(activeInterval)
  }, [])

  useEffect(() => {
  
    const fetchUnreadCounts = async () => {
      if (!currentUser) return

      try {
        const token = localStorage.getItem("data")

        const promises = users.map(async (user) => {
          const response = await axios.get(`http://localhost:5000/api/messages/${user._id}/unread`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          return { userId: user._id, count: response.data.count }
        })

        const counts = await Promise.all(promises)
        const countsObj = counts.reduce((acc, curr) => {
          acc[curr.userId] = curr.count
          return acc
        }, {})

        setUnreadCounts(countsObj)
      } catch (error) {
        console.error("Error fetching unread counts:", error)
      }
    }

    if (currentUser) {
      fetchUsers()

      const usersInterval = setInterval(fetchUsers, 10000)
      const unreadInterval = setInterval(fetchUnreadCounts, 15000)

      return () => {
        clearInterval(usersInterval)
        clearInterval(unreadInterval)
      }
    }
  }, [currentUser, users.length])



  const fetchMessages = async (userId) => {
    if (!userId) {
        console.error("fetchMessages appelé sans userId valide.");
        return;
    }

    try {
        const token = localStorage.getItem("token");

        if (!token) {
            console.error("Aucun token trouvé dans localStorage.");
            return;
        }

        const response = await axios.get(`http://localhost:5000/api/messages/sender/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        setMessages(response.data);
    } catch (error) {
        console.error("Erreur lors de la récupération des messages :", error);
    }
};
  useEffect(() => {
    const userData = localStorage.getItem("data");
    console.log("Données récupérées depuis localStorage:", userData);
    
    if (userData) {
        const user = JSON.parse(userData);
        console.log("Utilisateur connecté:", user);

        if (user && user._id) {
           
            fetchMessages(user._id);
        } else {
            console.error("L'utilisateur n'a pas d'ID valide.");
        }
    } else {
        console.error("Aucune donnée utilisateur trouvée dans localStorage.");
    }
}, []);
  const handleUserSelect = (user) => {
    setSelectedUser(user)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }
 
  const handleSendMessage = (e) => {
    e.preventDefault(); 
  
    if (!selectedUser) {
      console.log("Erreur : Aucun utilisateur sélectionné !");
      return;
    }
  
    const recipientId = selectedUser._id; // Récupérer l'ID de l'utilisateur sélectionné
  console.log('recipientId',recipientId)
    if (socket && newMessage.trim() !== "") {
      const messageToSend = { recipientId, content: newMessage };
  
      console.log("Message envoyé :", messageToSend); 
  
      socket.emit("message", messageToSend); // Envoyer au serveur
  
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "me", content: newMessage, type: "sent" }
      ]);
  
      setNewMessage(""); // Réinitialiser le champ d'entrée
    } else {
      console.log("Erreur : message vide !");
    }
  };
  useEffect(() => {
    if (socket) {
      socket.on("newMessage", (newMessage) => {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });
  
      return () => {
        socket.off("newMessage");
      };
    }
  }, [socket]);
  useEffect(() => {
    if (socket) {
      socket.on("message", (receivedMessage) => {
        console.log("Message reçu :", receivedMessage);
        setMessages((prevMessages) => [...prevMessages, receivedMessage]);
      });
    }
  
    return () => {
      if (socket) {
        socket.off("message"); 
      }
    };
  }, [socket]);
  
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
     
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 3000)
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token")

      await axios.post(
        "http://localhost:5000/api/auth/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      localStorage.removeItem("token")
      window.location.href = "/login"
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString()
    }
  }

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return "just now"
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      if (days === 1) {
        return "yesterday"
      } else if (days < 7) {
        return `${days} days ago`
      } else {
        return date.toLocaleDateString()
      }
    }
  }

  if (isLoading) {
    return <div className={styles.loading}>Loading chat room...</div>
  }

  return (
    <div className={styles.chatRoom}>
      <div className={styles.sidebar}>
        <div className={styles.userInfo}>
          {currentUser && (
            <>
              <div className={styles.currentUser}>
                <div className={styles.avatar}>{currentUser.username.charAt(0).toUpperCase()}</div>
                <span className={styles.username}>{currentUser.username}</span>
              </div>
              <button className={styles.logoutButton} onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
        <div className={styles.usersList}>
          <h2>All Users</h2>
          <div className={styles.statusLegend}></div>
          {users.length > 0 ? (
            <ul>
              {users.map((user) => (
                <li
                  key={user._id}
                  className={`${styles.userItem} ${selectedUser?._id === user._id ? styles.active : ""}`}
                  onClick={() => handleUserSelect(user)}
                >
                  <div className={styles.userItemContent}>
                    <div className={styles.avatar}>{user.username.charAt(0).toUpperCase()}</div>
                    <div className={styles.userDetails}>
                      <span className={styles.userItemName}>{user.username}</span>
                      <span className={styles.lastActive}>
                        {user.isOnline ? formatTimeAgo(user.lastActive) : `Last seen ${formatTimeAgo(user.lastActive)}`}
                      </span>
                    </div>
                  </div>
                  <div className={styles.userItemRight}>
                    {unreadCounts[user._id] > 0 && <span className={styles.unreadBadge}>{unreadCounts[user._id]}</span>}
                    <span
                      className={`${styles.onlineIndicator} ${!user.isOnline ? styles.offlineIndicator : ""}`}
                    ></span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.noUsers}>No users available</p>
          )}
        </div>
      </div>

      <div className={styles.chatContainer}>
        {selectedUser ? (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderUser}>
                <div className={styles.avatar}>{selectedUser.username.charAt(0).toUpperCase()}</div>
                <div className={styles.userDetails}>
                  <h2>{selectedUser.username}</h2>
                  <span className={styles.lastActive}>
                    {selectedUser.isOnline
                      ? `Online • ${formatTimeAgo(selectedUser.lastActive)}`
                      : `Offline • Last seen ${formatTimeAgo(selectedUser.lastActive)}`}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.messagesContainer}>
  {chatHistory[selectedUser?._id] && chatHistory[selectedUser._id].length > 0 ? (
    chatHistory[selectedUser._id].map((msg) => (
      <p key={msg._id}>{msg.content}</p>
    ))
  ) : (
    <p>Aucun message</p>
  )}

  {messages.length > 0 ? (
    <>
      {messages.reduce((acc, message, index) => {
        const messageDate = formatDate(message.createdAt);

        if (index === 0 || formatDate(messages[index - 1].createdAt) !== messageDate) {
          acc.push(
            <div key={`date-${message._id}`} className={styles.dateSeparator}>
              {messageDate}
            </div>
          );
        }

        // Ajouter le message
        acc.push(
          <div
            key={message._id}
            className={`${styles.message} ${message.sender === selectedUser._id ? styles.sent : styles.received}`}
          >
            <div className={styles.messageContent}>{message.content}</div>
            <div className={styles.messageTime}>
              {formatTime(message.createdAt)}
              {message.sender === selectedUser._id && (
                <span className={styles.readStatus}>{message.read ? " ✓✓" : " ✓"}</span>
              )}
            </div>
          </div>
        );

        return acc;
      }, [])}
      <div ref={messagesEndRef} />
    </>
  ) : (
    <p className={styles.noMessages}>No messages yet. Start the conversation!</p>
  )}
</div>
            <form className={styles.messageForm} onSubmit={handleSendMessage}>
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  handleTyping()
                }}
                placeholder="Type a message..."
                className={styles.messageInput}
              />
              <button type="submit" className={styles.sendButton} disabled={!newMessage.trim()}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div className={styles.selectUserPrompt}>
            <div className={styles.emptyStateIcon}>💬</div>
            <h3>Welcome to the Chat Room</h3>
            <p>Select a user from the list to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}

