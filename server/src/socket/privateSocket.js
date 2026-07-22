module.exports = (io) => {

    // المستخدمون المتصلون
    const onlineUsers = new Map();

    io.on("connection", (socket) => {

        console.log("🔌 User Connected:", socket.id);

        // ==========================
        // تسجيل المستخدم
        // ==========================

        socket.on("register_user", (userId) => {

            if (!userId) return;

            onlineUsers.set(String(userId), socket.id);

            socket.userId = String(userId);

            console.log(`✅ User ${userId} Registered`);

        });

        // ==========================
        // إرسال رسالة خاصة
        // ==========================

        socket.on("private_message", (data) => {

            const receiverSocket = onlineUsers.get(
                String(data.receiver_id)
            );

            if (receiverSocket) {

                io.to(receiverSocket).emit(
                    "private_message",
                    data
                );

            }

            // إرسال نسخة للمرسل
            socket.emit(
                "private_message",
                data
            );

        });

        // ==========================
        // المستخدم يكتب الآن...
        // ==========================

        socket.on("typing", (data) => {

            const receiverSocket = onlineUsers.get(
                String(data.receiver_id)
            );

            if (receiverSocket) {

                io.to(receiverSocket).emit(
                    "typing",
                    {
                        sender_id: data.sender_id,
                        username: data.username
                    }
                );

            }

        });

        // ==========================
        // توقف عن الكتابة
        // ==========================

        socket.on("stop_typing", (data) => {

            const receiverSocket = onlineUsers.get(
                String(data.receiver_id)
            );

            if (receiverSocket) {

                io.to(receiverSocket).emit(
                    "stop_typing",
                    {
                        sender_id: data.sender_id
                    }
                );

            }

        });

        // ==========================
        // تم قراءة الرسائل
        // ==========================

        socket.on("messages_read", (data) => {

            const receiverSocket = onlineUsers.get(
                String(data.receiver_id)
            );

            if (receiverSocket) {

                io.to(receiverSocket).emit(
                    "messages_read",
                    {
                        user_id: data.user_id
                    }
                );

            }

        });

        // ==========================
        // إشعار رسالة جديدة
        // ==========================

        socket.on("new_private_notification", (data) => {

            const receiverSocket = onlineUsers.get(
                String(data.receiver_id)
            );

            if (receiverSocket) {

                io.to(receiverSocket).emit(
                    "notification",
                    {
                        type: "private_message",
                        message:
                            `📩 رسالة جديدة من ${data.username}`
                    }
                );

            }

        });

        // ==========================
        // قطع الاتصال
        // ==========================

        socket.on("disconnect", () => {

            if (socket.userId) {

                onlineUsers.delete(socket.userId);

            }

            console.log("❌ User Disconnected");

        });

    });

    return {

        sendToUser(userId, event, payload) {

            const socketId = onlineUsers.get(
                String(userId)
            );

            if (socketId) {

                io.to(socketId).emit(
                    event,
                    payload
                );

            }

        }

    };

};