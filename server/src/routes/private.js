const express = require("express");
const router = express.Router();

const db = require("../database/database");

// ======================================
// جلب جميع محادثات المستخدم
// ======================================

router.get("/:userId", (req, res) => {

    try {

        const { userId } = req.params;

        const conversations = db.prepare(`
            SELECT DISTINCT
                CASE
                    WHEN sender_id = ?
                    THEN receiver_id
                    ELSE sender_id
                END AS user_id
            FROM private_messages
            WHERE sender_id = ?
               OR receiver_id = ?
        `).all(userId, userId, userId);

        res.json(conversations);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "خطأ في تحميل المحادثات"
        });

    }

});

// ======================================
// جلب رسائل محادثة
// ======================================

router.get("/chat/:user1/:user2", (req, res) => {

    try {

        const { user1, user2 } = req.params;

        const messages = db.prepare(`
            SELECT *
            FROM private_messages
            WHERE
            (sender_id=? AND receiver_id=?)
            OR
            (sender_id=? AND receiver_id=?)
            ORDER BY created_at ASC
        `).all(user1, user2, user2, user1);

        res.json(messages);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: "خطأ في تحميل الرسائل"
        });

    }

});

// ======================================
// إرسال رسالة
// ======================================

router.post("/send", (req, res) => {

    try {

        const {

            sender_id,

            receiver_id,

            message,

            type = "text",

            image = null

        } = req.body;

        const result = db.prepare(`
            INSERT INTO private_messages
            (
                sender_id,
                receiver_id,
                message,
                type,
                image
            )
            VALUES
            (?,?,?,?,?)
        `).run(

            sender_id,

            receiver_id,

            message,

            type,

            image

        );

        res.json({

            success: true,

            id: result.lastInsertRowid

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "فشل إرسال الرسالة"

        });

    }

});

// ======================================
// تعليم الرسائل كمقروءة
// ======================================

router.put("/read/:user/:friend", (req, res) => {

    try {

        const { user, friend } = req.params;

        db.prepare(`
            UPDATE private_messages
            SET seen=1
            WHERE
            sender_id=?
            AND
            receiver_id=?
        `).run(friend, user);

        res.json({

            success: true

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false

        });

    }

});

// ======================================
// حذف رسالة
// ======================================

router.delete("/:id", (req, res) => {

    try {

        db.prepare(`
            DELETE
            FROM private_messages
            WHERE id=?
        `).run(req.params.id);

        res.json({

            success: true

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false

        });

    }

});

module.exports = router;