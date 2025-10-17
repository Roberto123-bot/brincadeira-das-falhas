import express from "express";
import http from "http";
import { Server } from "socket.io";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// --- Configuração base ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// --- Permitir servir o frontend (HTML, CSS, JS) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../frontend"))); // serve os arquivos da pasta frontend

// --- Banco de dados SQLite ---
const db = await open({
  filename: "./db.sqlite",
  driver: sqlite3.Database,
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS combinacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    n1 INTEGER,
    n2 INTEGER,
    n3 INTEGER
  )
`);

// --- Rota: buscar combinações ---
app.get("/combinacoes", async (req, res) => {
  const lista = await db.all("SELECT * FROM combinacoes ORDER BY id DESC");
  res.json(lista);
});

// --- Rota: adicionar combinação ---
app.post("/combinacoes", async (req, res) => {
  const { nome, n1, n2, n3 } = req.body;
  if (!nome || !n1 || !n2 || !n3) {
    return res.status(400).send("Dados inválidos");
  }

  await db.run(
    "INSERT INTO combinacoes (nome, n1, n2, n3) VALUES (?, ?, ?, ?)",
    [nome, n1, n2, n3]
  );

  const lista = await db.all("SELECT * FROM combinacoes ORDER BY id DESC");
  io.emit("update", lista); // atualiza todos os clientes conectados

  res.json({ success: true });
});

// --- Socket.io: conexão em tempo real ---
io.on("connection", async (socket) => {
  console.log("🟢 Usuário conectado:", socket.id);
  const lista = await db.all("SELECT * FROM combinacoes ORDER BY id DESC");
  socket.emit("update", lista);
});

// --- Iniciar o servidor ---
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
