const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// إنشاء مجلد uploads إذا لم يكن موجوداً
const uploadDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

// إعداد التخزين
const storage = multer.diskStorage({

    destination(req, file, cb) {

        cb(null, uploadDir);

    },

    filename(req, file, cb) {

        const ext = path.extname(file.originalname);

        const name =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            ext;

        cb(null, name);

    }

});

// السماح بالصور فقط
const fileFilter = (req, file, cb) => {

    const allowed = [

        "image/png",

        "image/jpeg",

        "image/jpg",

        "image/webp",

        "image/gif"

    ];

    if (allowed.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(new Error("نوع الملف غير مدعوم"));

    }

};

const upload = multer({

    storage,

    fileFilter,

    limits: {

        fileSize: 5 * 1024 * 1024 // 5MB

    }

});

// ======================================
// رفع صورة
// ======================================

router.post("/", upload.single("image"), (req, res) => {

    if (!req.file) {

        return res.status(400).json({

            success: false,

            message: "لم يتم اختيار صورة"

        });

    }

    res.json({

        success: true,

        filename: req.file.filename,

        url: "/uploads/" + req.file.filename

    });

});

// ======================================
// رفع صورة الملف الشخصي
// ======================================

router.post("/avatar", upload.single("image"), (req, res) => {

    if (!req.file) {

        return res.status(400).json({

            success: false,

            message: "لم يتم اختيار صورة"

        });

    }

    res.json({

        success: true,

        avatar: "/uploads/" + req.file.filename

    });

});

// ======================================
// رفع صورة منشور
// ======================================

router.post("/post", upload.single("image"), (req, res) => {

    if (!req.file) {

        return res.status(400).json({

            success: false,

            message: "لم يتم اختيار صورة"

        });

    }

    res.json({

        success: true,

        image: "/uploads/" + req.file.filename

    });

});

module.exports = router;