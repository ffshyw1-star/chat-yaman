chat-yemen-pro/
│
├── client/                    # واجهة الموقع
│   ├── public/
│   │   ├── images/
│   │   ├── icons/
│   │   └── sounds/
│   │
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Header/
│   │   │   ├── Footer/
│   │   │   ├── Sidebar/
│   │   │   ├── Chat/
│   │   │   ├── Rooms/
│   │   │   ├── Profile/
│   │   │   ├── Notifications/
│   │   │   ├── Friends/
│   │   │   ├── Store/
│   │   │   ├── Admin/
│   │   │   └── Common/
│   │   │
│   │   ├── pages/
│   │   │   Home.jsx
│   │   │   GuestLogin.jsx
│   │   │   MemberLogin.jsx
│   │   │   Register.jsx
│   │   │   Rooms.jsx
│   │   │   ChatRoom.jsx
│   │   │   Profile.jsx
│   │   │   PrivateChat.jsx
│   │   │   News.jsx
│   │   │   FriendsWall.jsx
│   │   │   Store.jsx
│   │   │   Settings.jsx
│   │   │   AdminPanel.jsx
│   │   │
│   │   ├── router/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/
│   ├── config/
│   ├── database/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── sockets/
│   ├── controllers/
│   ├── services/
│   ├── uploads/
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── database/
│   └── chat.db
│
├── docker-compose.yml
├── README.md
└── .env