const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Configuração de Armazenamento de Arquivos
const STORAGE_ROOT = path.join(__dirname, 'data', 'colaboradores');
if (!fs.existsSync(STORAGE_ROOT)) {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

// Configuração do Multer para Documentos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const colabId = req.body.colaborador_id || 'unknown';
        const dir = path.join(STORAGE_ROOT, String(colabId));
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
        cb(null, name);
    }
});
const upload = multer({ storage });

// --- API COLABORADORES ---

app.get('/api/colaboradores', (req, res) => {
    db.all("SELECT * FROM colaboradores ORDER BY nome ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/colaboradores', (req, res) => {
    const { nome, cpf, cargo, data_admissao, status } = req.body;
    if (!nome || !cpf) return res.status(400).json({ error: "Nome e CPF são obrigatórios" });

    const sql = `INSERT INTO colaboradores (nome, cpf, cargo, data_admissao, status) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [nome, cpf, cargo, data_admissao, status || 'Ativo'], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, sucesso: true });
    });
});

app.delete('/api/colaboradores/:id', (req, res) => {
    db.run("DELETE FROM colaboradores WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ sucesso: true });
    });
});

// --- API DOCUMENTOS ---

app.get('/api/documentos/:colaborador_id', (req, res) => {
    db.all("SELECT * FROM documentos WHERE colaborador_id = ? ORDER BY data_upload DESC", [req.params.colaborador_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/documentos', upload.single('arquivo'), (req, res) => {
    const { colaborador_id, tipo } = req.body;
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const sql = `INSERT INTO documentos (colaborador_id, tipo, nome_arquivo, caminho, data_upload) VALUES (?, ?, ?, ?, ?)`;
    const params = [
        colaborador_id,
        tipo || 'Documento',
        req.file.originalname,
        req.file.filename,
        new Date().toISOString()
    ];

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, sucesso: true });
    });
});

// Rota para visualizar arquivos
app.get('/api/arquivos/:colaborador_id/:filename', (req, res) => {
    const filePath = path.join(STORAGE_ROOT, req.params.colaborador_id, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('Arquivo não encontrado');
    res.sendFile(filePath);
});

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`SERVIDOR INICIADO NA PORTA ${PORT}`);
    console.log(`ESTADO: LIMPO / RESET COMPLETO`);
    console.log(`========================================`);
});