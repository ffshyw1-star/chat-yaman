const express = require("express");
const router = express.Router();

const db = require("../database/database");
const auth = require("../middleware/auth");

// ===============================
// جلب الملف الشخصي
// GET /api/profile/:id
// ===============================

router.get("/:id", auth, (req, res) => {

    try {

        const user = db.prepare(`
            SELECT
                id,
                username,
                role,
                avatar,
                cover,
                bio,
                country,
                age,
                likes,
                friends,
                created_at
            FROM users
            WHERE id = ?
        `).get(req.params.id);

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "المستخدم غير موجود"

            });

        }

        res.json(user);

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "خطأ في تحميل الملف الشخصي"

        });

    }

});

// ===============================
// تعديل النبذة
// ===============================

router.put("/bio", auth, (req, res) => {

    try {

        db.prepare(`
            UPDATE users
            SET bio=?
            WHERE id=?
        `).run(

            req.body.bio,

            req.user.id

        );

        res.json({

            success: true,

            message: "تم تحديث النبذة"

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false

        });

    }

});

// ===============================
// تعديل الدولة
// ===============================

router.put("/country", auth, (req, res) => {

    try {

        db.prepare(`
            UPDATE users
            SET country=?
            WHERE id=?
        `).run(

            req.body.country,

            req.user.id

        );

        res.json({

            success: true

        });

    } catch (err) {

        res.status(500).json({

            success: false

        });

    }

});

// ===============================
// تعديل العمر
// ===============================

router.put("/age", auth, (req, res) => {

    try {

        db.prepare(`
            UPDATE users
            SET age=?
            WHERE id=?
        `).run(

            req.body.age,

            req.user.id

        );

        res.json({

            success: true

        });

    } catch (err) {

        res.status(500).json({

            success: false

        });

    }

});

// ===============================
// تغيير الصورة الشخصية
// ===============================

router.put("/avatar", auth, (req, res) => {

    try {

        db.prepare(`
            UPDATE users
            SET avatar=?
            WHERE id=?
        `).run(

            req.body.avatar,

            req.user.id

        );

        res.json({

            success: true,

            avatar: req.body.avatar

        });

    } catch (err) {

        res.status(500).json({

            success: false

        });

    }

});

// ===============================
// تغيير صورة الغلاف
// ===============================

router.put("/cover", auth, (req, res) => {

    try {

        db.prepare(`
            UPDATE users
            SET cover=?
            WHERE id=?
        `).run(

            req.body.cover,

            req.user.id

        );

        res.json({

            success: true,

            cover: req.body.cover

        });

    } catch (err) {

        res.status(500).json({

            success: false

        });

    }

});

module.exports = router;