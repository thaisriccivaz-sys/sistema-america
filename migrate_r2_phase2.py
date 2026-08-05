"""
Fases 5 e 6: Integrar R2 no INSERT/UPDATE de documentos e na cascata de download/view.
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

successes = []
errors = []

# ─── FASE 5a: No UPDATE de documentos existentes, adicionar r2_key ao set e chamar upload R2 ───
# Adicionar r2_key = ? ao UPDATE e chamar uploadDocToR2 junto com uploadDocToOneDrive

# Localizar o SET CLAUSE do UPDATE e adicionar r2_key
old_set_clause = "            let setClause = 'file_name = ?, file_path = ?, upload_date = CURRENT_TIMESTAMP, vencimento = ?, atestado_tipo = ?, atestado_inicio = ?, atestado_fim = ?';\n            const baseParams = [file_name, file_path, vencimento || null, atestado_tipo || null, atestado_inicio || null, atestado_fim || null];"
new_set_clause = "            let setClause = 'file_name = ?, file_path = ?, upload_date = CURRENT_TIMESTAMP, vencimento = ?, atestado_tipo = ?, atestado_inicio = ?, atestado_fim = ?, r2_key = NULL, signed_r2_key = NULL';\n            const baseParams = [file_name, file_path, vencimento || null, atestado_tipo || null, atestado_inicio || null, atestado_fim || null];"

if old_set_clause in content:
    content = content.replace(old_set_clause, new_set_clause, 1)
    successes.append("FASE 5a: SET CLAUSE atualizado para resetar r2_key/signed_r2_key")
else:
    errors.append("FASE 5a: SET CLAUSE nao encontrado")

# ─── FASE 5b: Chamar uploadDocToR2 no callback do UPDATE ───
# Encontrar onde saveAuditLocal é chamado no UPDATE e adicionar upload R2 antes
old_update_save = "                    saveAuditLocal(row.id);\n                    res.json({ message: 'Documento atualizado', id: row.id, file_path });"
new_update_save = """                    // Upload para R2 (duplo backup com OneDrive)
                    setImmediate(() => uploadDocToR2(row.id, processedBuffer || req.file.buffer).catch(e => console.warn('[R2-UPDATE] Erro:', e.message)));
                    saveAuditLocal(row.id);
                    res.json({ message: 'Documento atualizado', id: row.id, file_path });"""

if old_update_save in content:
    content = content.replace(old_update_save, new_update_save, 1)
    successes.append("FASE 5b: uploadDocToR2 adicionado no UPDATE")
else:
    errors.append("FASE 5b: saveAuditLocal no UPDATE nao encontrado")

# ─── FASE 5c: No INSERT, adicionar r2_key ao INSERT e chamar uploadDocToR2 ───
old_insert_sql = """            db.run(`INSERT INTO documentos (colaborador_id, tab_name, document_type, file_name, file_path, year, month, vencimento, atestado_tipo, atestado_inicio, atestado_fim, assinafy_status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [colaborador_id, tab_name, document_type, fileNameToStore, file_path, year || null, month || null, vencimento || null, atestado_tipo || null, atestado_inicio || null, atestado_fim || null, assinafy_status || 'Nenhum'],"""

new_insert_sql = """            db.run(`INSERT INTO documentos (colaborador_id, tab_name, document_type, file_name, file_path, year, month, vencimento, atestado_tipo, atestado_inicio, atestado_fim, assinafy_status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [colaborador_id, tab_name, document_type, fileNameToStore, file_path, year || null, month || null, vencimento || null, atestado_tipo || null, atestado_inicio || null, atestado_fim || null, assinafy_status || 'Nenhum'],"""

# Note: INSERT SQL is the same; we need to add R2 upload AFTER the insert callback
# Find saveAuditLocal for the INSERT case
old_insert_save = "                    saveAuditLocal(newDocId);\n                    res.status(201).json({ message: 'Documento salvo', id: newDocId, file_path });"
new_insert_save = """                    // Upload para R2 (duplo backup com OneDrive)
                    setImmediate(() => uploadDocToR2(newDocId, processedBuffer || req.file.buffer).catch(e => console.warn('[R2-INSERT] Erro:', e.message)));
                    saveAuditLocal(newDocId);
                    res.status(201).json({ message: 'Documento salvo', id: newDocId, file_path });"""

if old_insert_save in content:
    content = content.replace(old_insert_save, new_insert_save, 1)
    successes.append("FASE 5c: uploadDocToR2 adicionado no INSERT")
else:
    errors.append("FASE 5c: saveAuditLocal no INSERT nao encontrado")

# ─── FASE 6: Atualizar cascata de download/view para priorizar R2 ───
# Adicionar verificacao de r2_key no TOPO da cascata do download
# Antes do bloco "let pathLocal = row.signed_file_path; // Tentar assinado local primeiro"

old_download_cascade_start = """app.get('/api/documentos/download/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id], async (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });

        let pathLocal = row.signed_file_path; // Tentar assinado local primeiro"""

new_download_cascade_start = """app.get('/api/documentos/download/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id], async (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });

        // PRIORIDADE 1: PDF assinado no R2
        const r2Utils = require('./utils/r2');
        if (row.signed_r2_key && r2Utils.isReady()) {
            try {
                const fileData = await r2Utils.downloadStreamFromR2(row.signed_r2_key);
                let safeFileName = row.file_name || 'documento_assinado.pdf';
                if (!safeFileName.toLowerCase().endsWith('.pdf')) safeFileName = safeFileName.replace(/\\.[^.]+$/, '') + '.pdf';
                res.setHeader('Content-Type', fileData.contentType || 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent('ASSINADO_' + safeFileName)}"`);
                if (fileData.contentLength) res.setHeader('Content-Length', fileData.contentLength);
                if (fileData.stream && typeof fileData.stream.pipe === 'function') {
                    return fileData.stream.pipe(res);
                } else if (fileData.stream && typeof fileData.stream.transformToByteArray === 'function') {
                    const bytes = await fileData.stream.transformToByteArray();
                    return res.send(Buffer.from(bytes));
                }
            } catch (r2Err) { console.warn('[DOWNLOAD] signed_r2_key falhou, tentando fallback:', r2Err.message); }
        }

        let pathLocal = row.signed_file_path; // Tentar assinado local (fallback para docs antigos)"""

if old_download_cascade_start in content:
    content = content.replace(old_download_cascade_start, new_download_cascade_start, 1)
    successes.append("FASE 6a: Cascata download atualizada com prioridade R2")
else:
    errors.append("FASE 6a: Inicio da cascata download nao encontrado")

# ─── FASE 6b: Adicionar r2_key como fallback na cascata (entre Assinafy e file_path local) ───
# No fallback final do download (antes de "Devolve o arquivo original NÃO ASSINADO")
old_download_fallback = """        // Fallback final: Devolve o arquivo original NÃO ASSINADO
        pathLocal = row.file_path;
        if (pathLocal && fs.existsSync(pathLocal)) {
            let isDocx = false;"""

new_download_fallback = """        // PRIORIDADE 4: Arquivo original no R2
        if (row.r2_key && r2Utils.isReady()) {
            try {
                const fileData = await r2Utils.downloadStreamFromR2(row.r2_key);
                const r2FileName = row.file_name || 'documento.pdf';
                const r2Mime = fileData.contentType || 'application/pdf';
                res.setHeader('Content-Type', r2Mime);
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(r2FileName)}"`);
                if (fileData.contentLength) res.setHeader('Content-Length', fileData.contentLength);
                if (fileData.stream && typeof fileData.stream.pipe === 'function') {
                    return fileData.stream.pipe(res);
                } else if (fileData.stream && typeof fileData.stream.transformToByteArray === 'function') {
                    const bytes = await fileData.stream.transformToByteArray();
                    return res.send(Buffer.from(bytes));
                }
            } catch (r2Err) { console.warn('[DOWNLOAD] r2_key falhou, tentando disco local:', r2Err.message); }
        }

        // Fallback final: Devolve o arquivo original NÃO ASSINADO (docs antigos no disco)
        pathLocal = row.file_path;
        if (pathLocal && fs.existsSync(pathLocal)) {
            let isDocx = false;"""

if old_download_fallback in content:
    content = content.replace(old_download_fallback, new_download_fallback, 1)
    successes.append("FASE 6b: r2_key adicionado como fallback na cascata download")
else:
    errors.append("FASE 6b: Fallback final da cascata download nao encontrado")

# ─── FASE 6c: Mesma lógica para o endpoint /view ───
old_view_cascade_start = """app.get('/api/documentos/view/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id], async (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });

        let pathLocal = row.signed_file_path; // Tentar assinado local primeiro"""

new_view_cascade_start = """app.get('/api/documentos/view/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM documentos WHERE id = ?', [req.params.id], async (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Documento não encontrado' });

        // PRIORIDADE 1: PDF assinado no R2
        const r2Utils = require('./utils/r2');
        if (row.signed_r2_key && r2Utils.isReady()) {
            try {
                const fileData = await r2Utils.downloadStreamFromR2(row.signed_r2_key);
                let safeFileName = row.file_name || 'documento_assinado.pdf';
                if (!safeFileName.toLowerCase().endsWith('.pdf')) safeFileName = safeFileName.replace(/\\.[^.]+$/, '') + '.pdf';
                res.setHeader('Content-Type', fileData.contentType || 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent('ASSINADO_' + safeFileName)}"`);
                if (fileData.contentLength) res.setHeader('Content-Length', fileData.contentLength);
                if (fileData.stream && typeof fileData.stream.pipe === 'function') {
                    return fileData.stream.pipe(res);
                } else if (fileData.stream && typeof fileData.stream.transformToByteArray === 'function') {
                    const bytes = await fileData.stream.transformToByteArray();
                    return res.send(Buffer.from(bytes));
                }
            } catch (r2Err) { console.warn('[VIEW] signed_r2_key falhou, tentando fallback:', r2Err.message); }
        }

        let pathLocal = row.signed_file_path; // Tentar assinado local (fallback para docs antigos)"""

if old_view_cascade_start in content:
    content = content.replace(old_view_cascade_start, new_view_cascade_start, 1)
    successes.append("FASE 6c: Cascata view atualizada com prioridade R2")
else:
    errors.append("FASE 6c: Inicio da cascata view nao encontrado")

# ─── FASE 6d: Adicionar r2_key no fallback do VIEW (há duas ocorrências do "Fallback final") ───
# A segunda ocorrência é do /view
# Contar quantas ocorrências do fallback existem para pegar a segunda
fallback_text = """        // Fallback final: Devolve o arquivo original NÃO ASSINADO (docs antigos no disco)
        pathLocal = row.file_path;
        if (pathLocal && fs.existsSync(pathLocal)) {
            let isDocx = false;"""

view_fallback_old = """        // Fallback final: Devolve o arquivo original NÃO ASSINADO
        pathLocal = row.file_path;
        if (pathLocal && fs.existsSync(pathLocal)) {
            let isDocx = false;"""

view_fallback_new = """        // PRIORIDADE 4: Arquivo original no R2 (para /view)
        if (row.r2_key && r2Utils.isReady()) {
            try {
                const fileData = await r2Utils.downloadStreamFromR2(row.r2_key);
                const r2FileName = row.file_name || 'documento.pdf';
                const r2Mime = fileData.contentType || 'application/pdf';
                // Verificar se é docx para forçar download
                if (r2Mime.includes('word') || r2Mime.includes('officedocument')) {
                    const dlUrl = req.originalUrl.replace('/view/', '/download/');
                    return res.redirect(dlUrl);
                }
                res.setHeader('Content-Type', r2Mime);
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(r2FileName)}"`);
                if (fileData.contentLength) res.setHeader('Content-Length', fileData.contentLength);
                if (fileData.stream && typeof fileData.stream.pipe === 'function') {
                    return fileData.stream.pipe(res);
                } else if (fileData.stream && typeof fileData.stream.transformToByteArray === 'function') {
                    const bytes = await fileData.stream.transformToByteArray();
                    return res.send(Buffer.from(bytes));
                }
            } catch (r2Err) { console.warn('[VIEW] r2_key falhou, tentando disco local:', r2Err.message); }
        }

        // Fallback final: Devolve o arquivo original NÃO ASSINADO (docs antigos no disco)
        pathLocal = row.file_path;
        if (pathLocal && fs.existsSync(pathLocal)) {
            let isDocx = false;"""

if view_fallback_old in content:
    content = content.replace(view_fallback_old, view_fallback_new, 1)
    successes.append("FASE 6d: r2_key adicionado como fallback na cascata view")
else:
    errors.append("FASE 6d: Fallback da cascata view nao encontrado")

# ─── FASE 7: Adicionar upload R2 assinado no poll de assinaturas ───
# Após o upload para OneDrive, adicionar upload para R2 com signed_r2_key
old_poll_after_onedrive = """                // Salvar em disco local como fallback (caso OneDrive falhe)
                let signedPath = null;
                if (finalBuffer) {
                    try {
                        const destPath = path.join(BASE_PATH, `doc_${doc.id}.pdf`);
                        fs.writeFileSync(destPath, finalBuffer);
                        signedPath = destPath;
                    } catch (e) {
                        console.warn(`[POLL-ADMISSAO] Disco local indisponível (normal no Render): ${e.message}`);
                    }
                }

                // PROTEÇÃO: só marca 'Assinado' se o PDF assinado foi efetivamente baixado.
                // Sem PDF, significa que o Assinafy ainda não gerou o certificado (falso positivo).
                if (!finalBuffer) {
                    console.warn(`[POLL-ADMISSAO] ⚠️ Doc ${doc.assinafy_id} retornou status de assinado mas sem PDF disponível. Mantendo como Pendente.`);
                } else {
                    // Atualizar banco em AMBAS as tabelas, pois o mesmo documento pode existir nas duas
                    db.run(
                        `UPDATE admissao_assinaturas SET assinafy_status = 'Assinado', assinado_em = CURRENT_TIMESTAMP, signed_file_path = ? WHERE assinafy_id = ?`,
                        [signedPath, doc.assinafy_id]
                    );
                    db.run(
                        `UPDATE documentos SET assinafy_status = 'Assinado', signed_file_path = ?, assinafy_signed_at = CURRENT_TIMESTAMP WHERE assinafy_id = ?`,
                        [signedPath, doc.assinafy_id]
                    );
                    console.log(`[POLL-ADMISSAO] ✅ Banco atualizado como Assinado para assinafy_id=${doc.assinafy_id}`);
                }"""

new_poll_after_onedrive = """                // Salvar em disco local como fallback (caso OneDrive falhe)
                let signedPath = null;
                if (finalBuffer) {
                    try {
                        const destPath = path.join(BASE_PATH, `doc_${doc.id}.pdf`);
                        fs.writeFileSync(destPath, finalBuffer);
                        signedPath = destPath;
                    } catch (e) {
                        console.warn(`[POLL-ADMISSAO] Disco local indisponível (normal no Render): ${e.message}`);
                    }
                }

                // Upload do assinado para R2 (duplo backup com OneDrive)
                let signedR2Key = null;
                if (finalBuffer && doc.source === 'documento') {
                    try {
                        signedR2Key = await uploadSignedDocToR2(doc.id, finalBuffer);
                    } catch (r2Err) {
                        console.warn(`[POLL-ADMISSAO] R2 signed upload falhou: ${r2Err.message}`);
                    }
                }

                // PROTEÇÃO: só marca 'Assinado' se o PDF assinado foi efetivamente baixado.
                // Sem PDF, significa que o Assinafy ainda não gerou o certificado (falso positivo).
                if (!finalBuffer) {
                    console.warn(`[POLL-ADMISSAO] ⚠️ Doc ${doc.assinafy_id} retornou status de assinado mas sem PDF disponível. Mantendo como Pendente.`);
                } else {
                    // Atualizar banco em AMBAS as tabelas, pois o mesmo documento pode existir nas duas
                    db.run(
                        `UPDATE admissao_assinaturas SET assinafy_status = 'Assinado', assinado_em = CURRENT_TIMESTAMP, signed_file_path = ? WHERE assinafy_id = ?`,
                        [signedPath, doc.assinafy_id]
                    );
                    db.run(
                        `UPDATE documentos SET assinafy_status = 'Assinado', signed_file_path = ?, signed_r2_key = ?, assinafy_signed_at = CURRENT_TIMESTAMP WHERE assinafy_id = ?`,
                        [signedPath, signedR2Key, doc.assinafy_id]
                    );
                    console.log(`[POLL-ADMISSAO] ✅ Banco atualizado como Assinado para assinafy_id=${doc.assinafy_id} | R2: ${signedR2Key || 'N/A'}`);
                }"""

if old_poll_after_onedrive in content:
    content = content.replace(old_poll_after_onedrive, new_poll_after_onedrive, 1)
    successes.append("FASE 7: Upload R2 assinado adicionado no poll de assinaturas")
else:
    errors.append("FASE 7: Bloco do poll de assinaturas nao encontrado")

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("=== RESULTADO DAS FASES 5-7 ===")
for s in successes:
    print(f"  OK   {s}")
for e in errors:
    print(f"  ERRO {e}")
print(f"\n{len(successes)} sucesso(s), {len(errors)} erro(s)")
