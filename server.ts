import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("research.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    title TEXT,
    content TEXT,
    type TEXT DEFAULT 'note', -- 'note', 'draft', 'summary'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS citations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    title TEXT,
    authors TEXT,
    year TEXT,
    url TEXT,
    doi TEXT,
    abstract TEXT,
    citation_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/projects", (req, res) => {
    const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
    res.json(projects);
  });

  app.post("/api/projects", (req, res) => {
    const { title, description } = req.body;
    const result = db.prepare("INSERT INTO projects (title, description) VALUES (?, ?)").run(title, description);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/projects/:id/notes", (req, res) => {
    const notes = db.prepare("SELECT * FROM notes WHERE project_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(notes);
  });

  app.post("/api/notes", (req, res) => {
    const { project_id, title, content, type } = req.body;
    const result = db.prepare("INSERT INTO notes (project_id, title, content, type) VALUES (?, ?, ?, ?)").run(project_id, title, content, type);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/projects/:id/citations", (req, res) => {
    const citations = db.prepare("SELECT * FROM citations WHERE project_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(citations);
  });

  app.post("/api/citations", (req, res) => {
    const { project_id, title, authors, year, url, doi, abstract, citation_count } = req.body;
    const result = db.prepare("INSERT INTO citations (project_id, title, authors, year, url, doi, abstract, citation_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(project_id, title, authors, year, url, doi, abstract, citation_count || 0);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/notes/:id", (req, res) => {
    db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/citations/:id", (req, res) => {
    db.prepare("DELETE FROM citations WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/projects/:id", (req, res) => {
    const id = req.params.id;
    db.prepare("DELETE FROM notes WHERE project_id = ?").run(id);
    db.prepare("DELETE FROM citations WHERE project_id = ?").run(id);
    db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
