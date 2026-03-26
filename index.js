import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log("DB CONNECTED ✅"))
  .catch(err => console.error(err));

// ===================
// ROOT
// ===================
app.get("/", (req, res) => res.send("API RUNNING 🔥"));
app.get("/health", (req, res) => res.send("OK"));

// ===================
// LOGIN
// ===================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1 AND password=$2",
    [username, password]
  );

  if (result.rows.length === 0) {
    return res.json({ success: false });
  }

  const user = result.rows[0];

  if (user.used_access >= user.limit_access) {
    return res.json({ success: false, message: "expired" });
  }

  res.json({
    success: true,
    userId: user.id,
    role: user.role,
    remaining: user.limit_access - user.used_access
  });
});

// ===================
// USE (TRACK)
// ===================
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

    if (user.used_access >= user.limit_access) {
      return res.json({ success: false, expired: true });
    }

    await pool.query(
      "UPDATE users SET used_access = used_access + 1 WHERE id=$1",
      [userId]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "server error" });
  }
});

// ===================
// USERS
// ===================
app.get("/users", async (req, res) => {
  const result = await pool.query("SELECT * FROM users ORDER BY id DESC");
  res.json(result.rows);
});

// ===================
// ADD USER
// ===================
app.post("/add-user", async (req, res) => {
  const { username, password, role, limit_access } = req.body;

  await pool.query(
    `INSERT INTO users(username,password,role,limit_access,used_access)
     VALUES($1,$2,$3,$4,0)`,
    [username, password, role || "user", limit_access || 5]
  );

  res.json({ success: true });
});

// ===================
// DELETE USER
// ===================
app.post("/delete-user", async (req, res) => {
  const { id } = req.body;
  await pool.query("DELETE FROM users WHERE id=$1", [id]);
  res.json({ success: true });
});

// ===================
// UPDATE LIMIT
// ===================
app.post("/update-limit", async (req, res) => {
  const { id, limit } = req.body;

  await pool.query(
    "UPDATE users SET limit_access=$1 WHERE id=$2",
    [limit, id]
  );

  res.json({ success: true });
});

// ===================
// RESET USAGE
// ===================
app.post("/reset-usage", async (req, res) => {
  const { id } = req.body;

  await pool.query(
    "UPDATE users SET used_access=0 WHERE id=$1",
    [id]
  );

  res.json({ success: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});
