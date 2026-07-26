const Database = require("better-sqlite3");

const db = new Database("chat.db");

db.pragma("journal_mode = WAL");

module.exports = db;