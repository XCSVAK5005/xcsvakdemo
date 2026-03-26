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

// TEST DB
pool.connect()
  .then(() => console.log("DATABASE CONNECTED ✅"))
  .catch(err => console.error("DATABASE ERROR ❌", err));

// ROOT
app.get("/", (req, res) => {
  res.send("API RUNNING 🔥");
});

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.send("OK");
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1 AND password=$2",
    [username, password]
  );

  if (result.rows.length > 0) {
    res.json({ success: true, role: result.rows[0].role });
  } else {
    res.json({ success: false });
  }
});

// ADD USER
app.post("/add-user", async (req, res) => {
  const { username, password, role } = req.body;

  await pool.query(
    "INSERT INTO users(username,password,role) VALUES($1,$2,$3)",
    [username, password, role || "user"]
  );

  res.json({ success: true });
});

// GET ALL USERS
app.get("/users", async (req, res) => {
  const result = await pool.query("SELECT * FROM users ORDER BY id DESC");
  res.json(result.rows);
});

// DELETE USER
app.post("/delete-user", async (req, res) => {
  const { id } = req.body;
  await pool.query("DELETE FROM users WHERE id=$1", [id]);
  res.json({ success: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server jalan di port " + PORT);
});
