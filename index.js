import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// =======================
// PORT (WAJIB RAILWAY)
// =======================
const PORT = process.env.PORT || 3000;

// =======================
// DATABASE CONNECT
// =======================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// TEST KONEKSI DB
pool.connect()
  .then(() => console.log("DATABASE CONNECTED ✅"))
  .catch(err => console.error("DATABASE ERROR ❌", err));

// =======================
// ROOT TEST
// =======================
app.get("/", (req, res) => {
  res.send("API RUNNING 🔥");
});

// =======================
// LOGIN
// =======================
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1 AND password=$2",
      [username, password]
    );

    if (result.rows.length > 0) {
      res.json({
        success: true,
        role: result.rows[0].role
      });
    } else {
      res.json({ success: false });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// =======================
// ADD USER
// =======================
app.post("/add-user", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    await pool.query(
      "INSERT INTO users(username,password,role) VALUES($1,$2,$3)",
      [username, password, role || "user"]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal tambah user" });
  }
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log("Server jalan di port " + PORT);
});
