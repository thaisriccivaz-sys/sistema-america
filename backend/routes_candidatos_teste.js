// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: TESTES DE CANDIDATOS
// Arquivo: backend/routes_candidatos_teste.js
// Importar no server.js:
//   require('./routes_candidatos_teste')(app, db, authenticateToken, r2Module, multerMemory);
// ═══════════════════════════════════════════════════════════════════════════════

"use strict";
const path = require("path");

module.exports = function registerCandidatosTesteRoutes(app, db, authenticateToken, r2Module, multerMemory, sendEmailParaNotificados) {

    // ── MIGRACOES ─────────────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS candidatos_teste (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        nome        TEXT    NOT NULL,
        tipo        TEXT    NOT NULL DEFAULT 'Ajudante',
        status      TEXT    NOT NULL DEFAULT 'Entrevistas',
        foto_base64 TEXT,
        doc_url     TEXT,
        doc_r2_key     TEXT,
        doc_filename TEXT,
        doc_tipo    TEXT,
        data_teste  TEXT,
        data_teste_1 TEXT,
        data_teste_2 TEXT,
        data_teste_extra TEXT,
        rota_motorista TEXT,
        criado_por_id INTEGER,
        created_at  DATETIME DEFAULT (datetime('now','localtime')),
        updated_at  DATETIME DEFAULT (datetime('now','localtime'))
    )`, (err) => {
        if (err && !err.message.includes("already exists")) console.error("[Candidatos] Tabela:", err.message);
    });

    db.run(`CREATE TABLE IF NOT EXISTS candidatos_teste_comentarios (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        candidato_id INTEGER NOT NULL,
        tipo        TEXT    NOT NULL DEFAULT 'movimentacao',
        texto       TEXT    NOT NULL,
        usuario_id  INTEGER,
        usuario_nome TEXT,
        created_at  DATETIME DEFAULT (datetime('now','localtime'))
    )`, (err) => {
        if (err && !err.message.includes("already exists")) console.error("[Candidatos] Tabela log:", err.message);
    });

    // ── HELPERS ───────────────────────────────────────────────────────────────
    
    const newCols = [
        'data_teste_1 TEXT',
        'data_teste_2 TEXT',
        'data_teste_extra TEXT',
        'rota_motorista TEXT',
        'criado_por_id INTEGER',
        'criado_por_nome TEXT',
        'doc_r2_key TEXT',
        'retornou_teste_extra INTEGER DEFAULT 0',
        'resultado_teste TEXT'
    ];
    db.run("UPDATE candidatos_teste SET status = 'Dias de Teste' WHERE status IN ('Teste 1\u00ba Dia', 'Teste 2\u00ba Dia', 'Teste Extra')");
    newCols.forEach(colDef => {
        const colName = colDef.split(' ')[0];
        db.run(`ALTER TABLE candidatos_teste ADD COLUMN ${colDef}`, (err) => {
            // Se der erro de duplicate column, é esperado. Ignora.
        });
    });

    function getUser(req) {
        return req.user || {};
    }

    function notificarTestesCandidatos(mensagem) {
        const tipoNotif = 'testes_candidatos';
        db.all('SELECT usuario_id FROM config_notificacoes WHERE tipo = ?', [tipoNotif], (err, rows) => {
            if (!err && rows && rows.length > 0) {
                rows.forEach(r => {
                    db.run("INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)",
                        [r.usuario_id, tipoNotif, mensagem, '{}']);
                });
            }
        });
        if (typeof sendEmailParaNotificados === 'function') {
            sendEmailParaNotificados(tipoNotif, {
                subject: `[Testes de Candidatos] ${mensagem}`,
                html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                          <div style="background:#fff;padding:0;"><img src="cid:empresa-logo" alt="America Rental" style="width:100%;display:block;max-height:120px;object-fit:cover;"></div>
                          <div style="padding:1.5rem 2rem;"><h2 style="color:#7c3aed;margin-top:0;text-align:center;">Atualizacao - Teste de Candidato</h2><p style="font-size:15px;line-height:1.6;margin:0;">${mensagem}</p></div>
                          <hr style="border:none;border-top:1px solid #eee;margin:0;">
                          <div style="padding:1rem 2rem;background:#f8fafc;"><p style="color:#999;font-size:11px;text-align:center;margin:0;">Este e um e-mail automatico, por favor nao responda.</p></div>
                       </div>`,
                attachments: [{ filename: 'logo-header.png', path: require('path').join(__dirname, '..', 'frontend', 'assets', 'logo-header.png'), cid: 'empresa-logo' }]
            });
        }
    }

    function addLog(candidatoId, tipo, texto, req) {
        const u = getUser(req);
        db.run(
            `INSERT INTO candidatos_teste_comentarios (candidato_id, tipo, texto, usuario_id, usuario_nome) VALUES (?,?,?,?,?)`,
            [candidatoId, tipo, texto, u.id || null, u.nome || u.username || "Sistema"]
        );
    }

    function contarComentarios(candidatoId, cb) {
        db.get(
            `SELECT COUNT(*) as total FROM candidatos_teste_comentarios WHERE candidato_id = ? AND tipo = 'comentario'`,
            [candidatoId],
            (err, row) => cb(err, row ? row.total : 0)
        );
    }

    const ORDEM_VALIDA = [
        "Entrevistas", "Aguardando Data", "Respondido", "Dias de Teste", "Teste 1\u00ba Dia",
        "Teste 2\u00ba Dia", "Teste Extra", "Teste Finalizado",
        "Aprovado", "Reprovado"
    ];

    // ── LIST ──────────────────────────────────────────────────────────────────
    app.get("/api/candidatos-teste", authenticateToken, (req, res) => {
        db.all(`SELECT ct.*,
                       (SELECT COUNT(*) FROM candidatos_teste_comentarios l WHERE l.candidato_id = ct.id AND l.tipo = 'comentario') AS total_comentarios,
                       COALESCE(NULLIF(u.nome, ''), u.username) AS criado_por_nome
                FROM candidatos_teste ct
                LEFT JOIN usuarios u ON u.id = ct.criado_por_id
                WHERE ct.status != 'ARQUIVADO'
                ORDER BY ct.created_at DESC`,
            [], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows || []);
            }
        );
    });

    // ── GET DETAIL ────────────────────────────────────────────────────────────
    app.get("/api/candidatos-teste/:id", authenticateToken, (req, res) => {
        db.get(
            `SELECT ct.*, COALESCE(NULLIF(u.nome, ''), u.username) AS criado_por_nome
             FROM candidatos_teste ct
             LEFT JOIN usuarios u ON u.id = ct.criado_por_id
             WHERE ct.id = ?`,
            [req.params.id],
            (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!row) return res.status(404).json({ error: "Candidato nao encontrado." });

                // Buscar rota associada
                db.get(
                    `SELECT r.data_rota, c2.nome_completo AS motorista_nome, v.placa,
                            (v.modelo || ' - ' || v.placa) AS veiculo_texto, r.etapa_teste
                     FROM rotas r
                     LEFT JOIN colaboradores c2 ON c2.id = r.motorista_id
                     LEFT JOIN veiculos v ON v.id = r.veiculo_id
                     WHERE r.candidato_teste_id = ?
                     ORDER BY r.data_rota DESC LIMIT 1`,
                    [row.id],
                    (err2, rota) => {
                        // Buscar logs (comentarios + historico)
                        db.all(
                            `SELECT * FROM candidatos_teste_comentarios WHERE candidato_id = ? ORDER BY created_at DESC`,
                            [row.id],
                            (err3, logs) => {
                                res.json({ ...row, rota: rota || null, comentarios: logs || [] });
                            }
                        );
                    }
                );
            }
        );
    });

    // ── CREATE ────────────────────────────────────────────────────────────────
    app.post("/api/candidatos-teste", authenticateToken, (req, res) => {
        const { nome, tipo, foto_base64 } = req.body;
        if (!nome || !nome.trim()) return res.status(400).json({ error: "Nome obrigatorio." });
        const tipoValido = ["Motorista", "Motorista B", "Motorista D", "Ajudante"].includes(tipo) ? tipo : "Ajudante";
        const u = getUser(req);

        db.run(
            `INSERT INTO candidatos_teste (nome, tipo, status, foto_base64, criado_por_id) VALUES (?,?,?,?,?)`,
            [nome.trim(), tipoValido, "Entrevistas", foto_base64 || null, u.id || null],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                addLog(this.lastID, "movimentacao", `Candidato criado na coluna Entrevistas por ${u.nome || u.username || "Sistema"}.`, req);
                res.status(201).json({ id: this.lastID, message: "Candidato criado." });
            }
        );
    });

    // ── UPDATE ────────────────────────────────────────────────────────────────
    app.put("/api/candidatos-teste/:id", authenticateToken, (req, res) => {
        const { nome, tipo, foto_base64 } = req.body;
        const sets = [];
        const vals = [];

        if (nome) { sets.push("nome = ?"); vals.push(nome.trim()); }
        if (tipo && ["Motorista", "Motorista B", "Motorista D", "Ajudante"].includes(tipo)) { sets.push("tipo = ?"); vals.push(tipo); }
        if (foto_base64 !== undefined) { sets.push("foto_base64 = ?"); vals.push(foto_base64 || null); }
        if (!sets.length) return res.status(400).json({ error: "Nenhum campo para atualizar." });
        sets.push("updated_at = datetime('now','localtime')");
        vals.push(req.params.id);

        db.run(`UPDATE candidatos_teste SET ${sets.join(",")} WHERE id = ?`, vals, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Atualizado." });
        });
    });

    // ── DELETE ────────────────────────────────────────────────────────────────
    app.delete("/api/candidatos-teste/:id", authenticateToken, async (req, res) => {
        try {
            // Remover documento do R2 se existir
            const row = await new Promise((resolve, reject) =>
                db.get("SELECT doc_r2_key FROM candidatos_teste WHERE id = ?", [req.params.id], (e, r) => e ? reject(e) : resolve(r))
            );
            if (row && row.doc_r2_key && r2Module && typeof r2Module.deleteFromR2 === "function") {
                await r2Module.deleteFromR2(row.doc_r2_key).catch(() => {});
            }

            db.run("DELETE FROM candidatos_teste WHERE id = ?", [req.params.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                db.run("DELETE FROM candidatos_teste_comentarios WHERE candidato_id = ?", [req.params.id]);
                res.json({ message: "Excluido." });
            });
        } catch(e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ── MOVER STATUS ──────────────────────────────────────────────────────────
    app.put("/api/candidatos-teste/:id/status", authenticateToken, (req, res) => {
        const { status, data_teste } = req.body;
        if (!ORDEM_VALIDA.includes(status)) return res.status(400).json({ error: "Status invalido." });
        const u = getUser(req);

        // Buscar status atual
        db.get("SELECT status, data_teste FROM candidatos_teste WHERE id = ?", [req.params.id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: "Candidato nao encontrado." });

            const sets = ["status = ?", "updated_at = datetime('now','localtime')"];
            if (row.status === 'Dias de Teste' && status === 'Aguardando Data') {
                sets.push("retornou_teste_extra = 1");
            }
            const vals = [status];

            // Salvar data conforme a etapa
            if (data_teste) {
                sets.push("data_teste = ?"); vals.push(data_teste);
                if (status === "Teste 1\u00ba Dia") { sets.push("data_teste_1 = ?"); vals.push(data_teste); }
                else if (status === "Teste 2\u00ba Dia") { sets.push("data_teste_2 = ?"); vals.push(data_teste); }
                else if (status === "Teste Extra") { sets.push("data_teste_extra = ?"); vals.push(data_teste); }
            }
            vals.push(req.params.id);

            db.run(`UPDATE candidatos_teste SET ${sets.join(",")} WHERE id = ?`, vals, (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                const dBR2 = data_teste ? (data_teste.split('-').length === 3 ? data_teste.split('-').reverse().join('/') : data_teste) : "";
                const log = `Movido de "${row.status}" para "${status}" por ${u.nome || u.username || "Sistema"}${dBR2 ? ` (data: ${dBR2})` : ""}.`;
                addLog(req.params.id, "movimentacao", log, req);
                res.json({ message: "Status atualizado.", status });
            });
        });
    });

    // Atualizar Data do Teste
        app.put('/api/candidatos-teste/:id/data', authenticateToken, (req, res) => {
        const u = getUser(req);
        const { data_teste, etapa, motivo } = req.body;
        db.get("SELECT nome, status FROM candidatos_teste WHERE id = ?", [req.params.id], (err, row) => {
            if (err || !row) return res.status(404).json({ error: "Nao encontrado" });
            
            let col = "data_teste";
            if (etapa === "Teste 1\u00ba Dia") col = "data_teste_1";
            if (etapa === "Teste 2\u00ba Dia") col = "data_teste_2";
            if (etapa === "Teste Extra") col = "data_teste_extra";

            const dataToSet = data_teste || null;
            db.get(`SELECT status, data_teste_1, data_teste_2, data_teste_extra FROM candidatos_teste WHERE id = ?`, [req.params.id], (errPrev, cPrev) => {
                if (errPrev || !cPrev) return res.status(404).json({ error: "Candidato não encontrado" });
                
                db.run(`UPDATE candidatos_teste SET ${col} = ? WHERE id = ?`, [dataToSet, req.params.id], (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    if (dataToSet) {
                        const p = dataToSet.split('-'); const dBR = p.length === 3 ? p[2]+'/'+p[1]+'/'+p[0] : dataToSet;
                        addLog(req.params.id, "movimentacao", `Data de ${etapa || 'teste'} definida para ${dBR} por ${u.nome || u.username || "Sistema"}`, req);
                        notificarTestesCandidatos(`Candidato ${row.nome} agendado para o dia ${dBR} (${etapa || 'Geral'})`);
                    } else {
                        addLog(req.params.id, "movimentacao", `Data de ${etapa || 'teste'} foi apagada por ${u.nome || u.username || "Sistema"}. Motivo: ${motivo || 'Não informado'}`, req);
                    }
                    
                    if (cPrev.status === 'Aguardando Data' && dataToSet) {
                        let moveToRespondido = false;
                        
                        // We check the new simulated state
                        const new_1 = col === 'data_teste_1' ? dataToSet : cPrev.data_teste_1;
                        const new_2 = col === 'data_teste_2' ? dataToSet : cPrev.data_teste_2;
                        const new_extra = col === 'data_teste_extra' ? dataToSet : cPrev.data_teste_extra;
                        
                        if (col === 'data_teste_1' || col === 'data_teste_2') {
                            // Only move if it was previously NOT both filled (meaning we just completed the pair)
                            if (new_1 && new_2 && !(cPrev.data_teste_1 && cPrev.data_teste_2)) {
                                moveToRespondido = true;
                            }
                        } else if (col === 'data_teste_extra') {
                            // Only move if 1 and 2 are already filled, and extra was just completed
                            if (new_1 && new_2 && new_extra && !cPrev.data_teste_extra) {
                                moveToRespondido = true;
                            }
                        }
                        
                        if (moveToRespondido) {
                            db.run(`UPDATE candidatos_teste SET status = 'Respondido', updated_at = datetime('now','localtime') WHERE id = ?`, [req.params.id]);
                            addLog(req.params.id, "movimentacao", `Movido automaticamente para "Respondido" após preenchimento de datas.`, req);
                        }
                    }
                    res.json({ message: "Data atualizada" });
                });
            });
        });
    });


    // ── UPLOAD DOCUMENTO (PDF) ────────────────────────────────────────────────
    
    app.put('/api/candidatos-teste/:id/resultado', authenticateToken, (req, res) => {
        const { resultado } = req.body;
        const u = getUser(req);
        db.run(`UPDATE candidatos_teste SET resultado_teste = ?, updated_at = datetime('now','localtime') WHERE id = ?`, [resultado, req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            addLog(req.params.id, "movimentacao", `Resultado definido como "${resultado}" por ${u.nome || u.username || "Sistema"}`, req);
            res.json({ message: "Resultado atualizado" });
        });
    });

    const multerDoc = multerMemory.single("file");

    app.post("/api/candidatos-teste/:id/documento", authenticateToken, multerDoc, async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
            if (req.file.mimetype !== "application/pdf") return res.status(400).json({ error: "Apenas PDF e aceito." });

            const docTipo = req.body.doc_tipo || "Documento";
            const id = req.params.id;

            const row = await new Promise((resolve, reject) =>
                db.get("SELECT id, nome, tipo, doc_r2_key FROM candidatos_teste WHERE id = ?", [id], (e, r) => e ? reject(e) : resolve(r))
            );
            if (!row) return res.status(404).json({ error: "Candidato nao encontrado." });

            // Remover documento anterior do R2
            if (row.doc_r2_key && r2Module && typeof r2Module.deleteFromR2 === "function") {
                await r2Module.deleteFromR2(row.doc_r2_key).catch(() => {});
            }

            const ts = Date.now();
            const nomeSafe = (row.nome || "CAND").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
            const r2Key = `CandidatosTeste/${id}_${nomeSafe}_${docTipo}_${ts}.pdf`;

            let docUrl = null;
            if (r2Module && typeof r2Module.uploadToR2 === "function" && r2Module.isReady()) {
                docUrl = await r2Module.uploadToR2(r2Key, req.file.buffer, "application/pdf");
            }

            db.run(
                `UPDATE candidatos_teste SET doc_url = ?, doc_r2_key = ?, doc_filename = ?, doc_tipo = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
                [docUrl || null, r2Key, req.file.originalname || `${docTipo}.pdf`, docTipo, id],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    const u = getUser(req);
                    addLog(id, "movimentacao", `Documento ${docTipo} anexado por ${u.nome || u.username || "Sistema"}.`, req);
                    res.json({ message: "Documento enviado.", doc_url: docUrl, doc_tipo: docTipo });
                }
            );
        } catch(e) {
            console.error("[Candidatos] Upload doc:", e.message);
            res.status(500).json({ error: e.message });
        }
    });

    // ── COMENTARIO ────────────────────────────────────────────────────────────
    app.post("/api/candidatos-teste/:id/comentario", authenticateToken, (req, res) => {
        const { texto } = req.body;
        if (!texto || !texto.trim()) return res.status(400).json({ error: "Comentario vazio." });
        const u = getUser(req);
        db.run(
            `INSERT INTO candidatos_teste_comentarios (candidato_id, tipo, texto, usuario_id, usuario_nome) VALUES (?,?,?,?,?)`,
            [req.params.id, "comentario", texto.trim(), u.id || null, u.nome || u.username || "Sistema"],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: "Comentario adicionado." });
            }
        );
    });

    // ── DESVINCULAR ROTA ──────────────────────────────────────────────────────
    app.delete("/api/candidatos-teste/:id/atribuir-rota", authenticateToken, (req, res) => {
        db.run(
            `UPDATE rotas SET candidato_teste_id = NULL WHERE candidato_teste_id = ?`,
            [req.params.id],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                db.run(`UPDATE candidatos_teste SET rota_motorista = NULL WHERE id = ?`, [req.params.id]);
                const u = getUser(req);
                addLog(req.params.id, "movimentacao", `Desvinculado de rota por ${u.nome || u.username || "Sistema"}.`, req);
                res.json({ message: "Rota desvinculada." });
            }
        );
    });


    // ── GET candidatos em "Dias de Teste" para uma data específica ─────────────
    app.get("/api/candidatos-teste/por-data", authenticateToken, (req, res) => {
        const { data } = req.query; // YYYY-MM-DD
        if (!data) return res.status(400).json({ error: "Parâmetro 'data' obrigatório." });
        db.all(
            `SELECT id, nome, tipo, status, foto_base64, data_teste_1, data_teste_2, data_teste_extra, rota_motorista, retornou_teste_extra
             FROM candidatos_teste
             WHERE status = 'Dias de Teste'
               AND (data_teste_1 = ? OR data_teste_2 = ? OR data_teste_extra = ?)`,
            [data, data, data],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows || []);
            }
        );
    });

    console.log("[Candidatos] Rotas de Testes de Candidatos registradas.");
};