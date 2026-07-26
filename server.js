const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const db = require("./server/database/database");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

let onlineUsers = {};

io.on("connection", (socket) => {

    console.log("User Connected:", socket.id);

    socket.on("join-user", (user) => {

        onlineUsers[socket.id] = user;

        console.log("New User:", user.username);

        io.emit("users-online", Object.values(onlineUsers));

    });


    socket.on("chat-message", (data) => {

        io.emit("chat-message", data);

    });


    socket.on("disconnect", () => {

        delete onlineUsers[socket.id];

        io.emit("users-online", Object.values(onlineUsers));

        console.log("User Left:", socket.id);

    });

});


server.listen(3000, () => {

    console.log("Server Running on Port 3000");

});