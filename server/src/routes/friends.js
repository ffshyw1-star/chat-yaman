const express = require("express");
const router = express.Router();

const db = require("../database/database");
const auth = require("../middleware/auth");

// ==========================================
// جلب قائمة الأصدقاء
// GET /api/friends
// ==========================================

router.get("/", auth, (req, res) => {

    try {

        const friends = db.prepare(`
            SELECT
                u.id,
                u.username,
                u.avatar,
                u.role
            FROM friends f
            JOIN users u
            ON (
                CASE
                    WHEN f.user_id = ?
                    THEN f.friend_id
                    ELSE f.user_id
                END
            ) = u.id
            WHERE
                (f.user_id = ? OR f.friend_id = ?)
            AND
                f.status = 'accepted'
        `).all(

            req.user.id,
            req.user.id,
            req.user.id

        );

        res.json(friends);

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "خطأ أثناء تحميل الأصدقاء"

        });

    }

});

// ==========================================
// إرسال طلب صداقة
// POST /api/friends/request
// ==========================================

router.post("/request", auth, (req, res) => {

    try {

        const { friend_id } = req.body;

        const exists = db.prepare(`
            SELECT id
            FROM friends
            WHERE
            (user_id=? AND friend_id=?)
            OR
            (user_id=? AND friend_id=?)
        `).get(

            req.user.id,
            friend_id,
            friend_id,
            req.user.id

        );

        if (exists) {

            return res.json({

                success: false,

                message: "الطلب موجود مسبقاً"

            });

        }

        db.prepare(`
            INSERT INTO friends
            (
                user_id,
                friend_id,
                status
            )
            VALUES
            (?,?,?)
        `).run(

            req.user.id,
            friend_id,
            "pending"

        );

        res.json({

            success: true,

            message: "تم إرسال طلب الصداقة"

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false

        });

    }

});

// ==========================================
// قبول الطلب
// PUT /api/friends/accept/:id
// ==========================================

router.put("/accept/:id", auth, (req, res) => {

    try {

        db.prepare(`
            UPDATE friends
            SET status='accepted'
            WHERE id=?
        `).run(req.params.id);

        res.json({

            success: true,

            message: "تم قبول طلب الصداقة"

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false

        });

    }

});

// ==========================================
// رفض الطلب
// DELETE /api/friends/reject/:id
// ==========================================

router.delete("/reject/:id", auth, (req, res) => {

    try {

        db.prepare(`
            DELETE FROM friends
            WHERE id=?
        `).run(req.params.id);

        res.json({

            success: true,

            message: "تم رفض الطلب"

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false

        });

    }

});

// ==========================================
// حذف صديق
// DELETE /api/friends/:id
// ==========================================

router.delete("/:id", auth, (req, res) => {

    try {

        db.prepare(`
            DELETE FROM friends
            WHERE
            (user_id=? AND friend_id=?)
            OR
            (user_id=? AND friend_id=?)
        `).run(

            req.user.id,
            req.params.id,

            req.params.id,
            req.user.id

        );

        res.json({

            success: true,

            message: "تم حذف الصديق"

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false

        });

    }

});

module.exports = router;