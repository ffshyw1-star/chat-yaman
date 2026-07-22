const multer = require("multer");
const path = require("path");
const fs = require("fs");

// إنشاء مجلد uploads إذا لم يكن موجوداً
const uploadPath = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, {
        recursive: true
    });
}

// الامتدادات المسموح بها
const allowedTypes = [

    "image/jpeg",

    "image/jpg",

    "image/png",

    "image/webp",

    "image/gif"

];

// إعداد التخزين
const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, uploadPath);

    },

    filename: (req, file, cb) => {

        const ext = path.extname(file.originalname);

        const fileName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1e9) +
            ext;

        cb(null, fileName);

    }

});

// فلترة الملفات
const fileFilter = (req, file, cb) => {

    if (allowedTypes.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(new Error("نوع الملف غير مسموح"));

    }

};

// إعداد Multer
const upload = multer({

    storage,

    fileFilter,

    limits: {

        fileSize: 5 * 1024 * 1024 // 5MB

    }

});

// وسيط رفع صورة واحدة
exports.singleImage =
upload.single("image");

// وسيط رفع عدة صور
exports.multiImages =
upload.array("images", 10);

// معالج الأخطاء
exports.uploadError =
(err, req, res, next) => {

    if (err instanceof multer.MulterError) {

        return res.status(400).json({

            success: false,

            message: err.message

        });

    }

    if (err) {

        return res.status(400).json({

            success: false,

            message: err.message

        });

    }

    next();

};