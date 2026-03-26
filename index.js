import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 koneksi database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🔐 LOGIN
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

// ➕ ADD USER
app.post("/add-user", async (req, res) => {
  const { username, password, role } = req.body;

  await pool.query(
    "INSERT INTO users(username,password,role) VALUES($1,$2,$3)",
    [username, password, role]
  );

  res.json({ success: true });
});

app.get("/", (req, res) => {
  res.send("API RUNNING 🔥");
});

app.listen(3000, () => console.log("Server jalan"));
