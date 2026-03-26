import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();

// =======================
// MIDDLEWARE
// =======================
app.use(cors());
app.use(express.json());

// =======================
// PORT
// =======================
const PORT = process.env.PORT || 3000;

// =======================
// DATABASE
// =======================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// CONNECT TEST
pool.connect()
  .then(() => console.log("DATABASE CONNECTED ✅"))
  .catch(err => console.error("DB ERROR ❌", err));

// =======================
// ROOT
// =======================
app.get("/", (req, res) => {
  res.send("API RUNNING 🔥");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

// =======================
// LOGIN (WITH LIMIT)
// =======================
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1 AND password=$2",
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false });
    }

    const user = result.rows[0];

    // 🔥 CHECK LIMIT
    if (user.used_access >= user.limit_access) {
      return res.json({
        success: false,
        message: "expired"
      });
    }

    res.json({
      success: true,
      role: user.role,
      userId: user.id,
      remaining: user.limit_access - user.used_access
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// =======================
// USE (TRACK USAGE)
// =======================
app.post("/use", async (req, res) => {
  try {
    const { userId } = req.body;

    const userRes = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.json({ success: false });
    }

    const user = userRes.rows[0];

    // ❌ expired
    if (user.used_access >= user.limit_access) {
      return res.json({
        success: false,
        expired: true
      });
    }

    // ➕ tambah usage
    await pool.query(
      "UPDATE users SET used_access = used_access + 1 WHERE id=$1",
      [userId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error use" });
  }
});

// =======================
// GET USERS
// =======================
app.get("/users", async (req, res) => {
  const result = await pool.query(
    "SELECT id, username, role, limit_access, used_access FROM users ORDER BY id DESC"
  );

  res.json(result.rows);
});

// =======================
// ADD USER
// =======================
app.post("/add-user", async (req, res) => {
  try {
    const { username, password, role, limit_access } = req.body;

    await pool.query(
      `INSERT INTO users(username,password,role,limit_access,used_access)
       VALUES($1,$2,$3,$4,0)`,
      [username, password, role || "user", limit_access || 5]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal tambah user" });
  }
});

// =======================
// DELETE USER
// =======================
app.post("/delete-user", async (req, res) => {
  const { id } = req.body;

  await pool.query("DELETE FROM users WHERE id=$1", [id]);

  res.json({ success: true });
});

// =======================
// START SERVER
// =======================
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});
