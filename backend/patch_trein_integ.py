
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 2.1 Schema (at the end of migrations)
SCHEMA_MIG_OLD = """    db.run("ALTER TABLE integ_template_acoes ADD COLUMN grupo_responsavel_depto_id INTEGER", [], err => {});"""
SCHEMA_MIG_NEW = """    db.run("ALTER TABLE integ_template_acoes ADD COLUMN grupo_responsavel_depto_id INTEGER", [], err => {});
    
    // PATCH: Treinamentos na Integração
    db.run("ALTER TABLE treinamentos ADD COLUMN is_integracao INTEGER DEFAULT 0", [], err => {});
    db.run("ALTER TABLE integ_template_acoes ADD COLUMN treinamento_id INTEGER", [], err => {});
    db.run("ALTER TABLE integracao_passos_status ADD COLUMN treinamento_id INTEGER", [], err => {});"""
content = content.replace(SCHEMA_MIG_OLD, SCHEMA_MIG_NEW)

# 2.3 POST /api/treinamentos
POST_TREIN_OLD = """app.post('/api/treinamentos', authenticateToken, (req, res) => {
  const { nome, descricao, departamento, capa_url, validade_dias, pesquisa_perguntas, tipo = 'treinamento' } = req.body || {};
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome ?? obrigat??rio.' });
  const criado_por = req.user?.nome || req.user?.email || '';
  
  db.run(
    `INSERT INTO treinamentos (nome, descricao, criado_por, departamento, capa_url, validade_dias, tipo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nome.trim(), (descricao || '').trim(), criado_por, (departamento || 'Todos').trim(), (capa_url || '').trim(), parseInt(validade_dias) || 0, tipo.trim()],"""
    
POST_TREIN_NEW = """app.post('/api/treinamentos', authenticateToken, (req, res) => {
  const { nome, descricao, departamento, capa_url, validade_dias, pesquisa_perguntas, tipo = 'treinamento', is_integracao = 0 } = req.body || {};
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome ?? obrigat??rio.' });
  const criado_por = req.user?.nome || req.user?.email || '';
  
  db.run(
    `INSERT INTO treinamentos (nome, descricao, criado_por, departamento, capa_url, validade_dias, tipo, is_integracao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nome.trim(), (descricao || '').trim(), criado_por, (departamento || 'Todos').trim(), (capa_url || '').trim(), parseInt(validade_dias) || 0, tipo.trim(), parseInt(is_integracao) ? 1 : 0],"""
content = content.replace(POST_TREIN_OLD, POST_TREIN_NEW)

# 2.3 PUT /api/treinamentos/:id
PUT_TREIN_OLD = """app.put('/api/treinamentos/:id', authenticateToken, (req, res) => {
  const { nome, descricao, departamento, capa_url, validade_dias, tipo } = req.body || {};
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome ?? obrigat??rio.' });
  db.run(
    `UPDATE treinamentos SET nome = ?, descricao = ?, departamento = ?, capa_url = ?, validade_dias = ?, tipo = ? WHERE id = ?`,
    [nome.trim(), (descricao || '').trim(), (departamento || 'Todos').trim(), (capa_url !== undefined ? capa_url : ''), parseInt(validade_dias) || 0, tipo ? tipo.trim() : 'treinamento', req.params.id],"""

PUT_TREIN_NEW = """app.put('/api/treinamentos/:id', authenticateToken, (req, res) => {
  const { nome, descricao, departamento, capa_url, validade_dias, tipo, is_integracao } = req.body || {};
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome ?? obrigat??rio.' });
  db.run(
    `UPDATE treinamentos SET nome = ?, descricao = ?, departamento = ?, capa_url = ?, validade_dias = ?, tipo = ?, is_integracao = ? WHERE id = ?`,
    [nome.trim(), (descricao || '').trim(), (departamento || 'Todos').trim(), (capa_url !== undefined ? capa_url : ''), parseInt(validade_dias) || 0, tipo ? tipo.trim() : 'treinamento', parseInt(is_integracao) ? 1 : 0, req.params.id],"""
content = content.replace(PUT_TREIN_OLD, PUT_TREIN_NEW)

# 2.5 POST /api/integ/templates - update insert
POST_INTEG_OLD = """db.run(`INSERT INTO integ_template_acoes (template_id, titulo, descricao, responsavel_user_id, departamentos, condicao, ordem, grupo, grupo_responsavel_user_id, responsavel_depto_id, grupo_responsavel_depto_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                    [tid, a.titulo, a.descricao || null, a.responsavel_user_id || null, deptJson, a.condicao || null, a.ordem || 0, a.grupo || null, a.grupo_responsavel_user_id || null, a.responsavel_depto_id || null, a.grupo_responsavel_depto_id || null],"""
                    
POST_INTEG_NEW = """db.run(`INSERT INTO integ_template_acoes (template_id, titulo, descricao, responsavel_user_id, departamentos, condicao, ordem, grupo, grupo_responsavel_user_id, responsavel_depto_id, grupo_responsavel_depto_id, treinamento_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                    [tid, a.titulo, a.descricao || null, a.responsavel_user_id || null, deptJson, a.condicao || null, a.ordem || 0, a.grupo || null, a.grupo_responsavel_user_id || null, a.responsavel_depto_id || null, a.grupo_responsavel_depto_id || null, a.treinamento_id || null],"""
content = content.replace(POST_INTEG_OLD, POST_INTEG_NEW)

# 2.5 GET /api/integ/templates - update JSON gen
GET_INTEG_OLD = """'grupo_responsavel_user_id', grupo_responsavel_user_id, 'responsavel_depto_id', responsavel_depto_id, 'grupo_responsavel_depto_id', grupo_responsavel_depto_id)) FROM (SELECT titulo, grupo, grupo_responsavel_user_id, responsavel_depto_id, grupo_responsavel_depto_id FROM"""
GET_INTEG_NEW = """'grupo_responsavel_user_id', grupo_responsavel_user_id, 'responsavel_depto_id', responsavel_depto_id, 'grupo_responsavel_depto_id', grupo_responsavel_depto_id, 'treinamento_id', treinamento_id)) FROM (SELECT titulo, grupo, grupo_responsavel_user_id, responsavel_depto_id, grupo_responsavel_depto_id, treinamento_id FROM"""
content = content.replace(GET_INTEG_OLD, GET_INTEG_NEW)

# 2.5 Lógica no onboarding - pass treinamento_id
ONBOARD_OLD = """                    await new Promise((resolve, reject) =>
                        db.run(`INSERT INTO integracao_passos_status (processo_id, passo_config_id, status, responsavel_user_id, titulo, descricao_custom, is_custom) VALUES (?, NULL, 'pendente', ?, ?, ?, 1)`,
                            [processoId, respFinalId || null, a.titulo, a.descricao || null],
                            err => err ? reject(err) : resolve()));"""
ONBOARD_NEW = """                    await new Promise((resolve, reject) =>
                        db.run(`INSERT INTO integracao_passos_status (processo_id, passo_config_id, status, responsavel_user_id, titulo, descricao_custom, is_custom, treinamento_id) VALUES (?, NULL, 'pendente', ?, ?, ?, 1, ?)`,
                            [processoId, respFinalId || null, a.titulo, a.descricao || null, a.treinamento_id || null],
                            err => err ? reject(err) : resolve()));"""
content = content.replace(ONBOARD_OLD, ONBOARD_NEW)

# 2.6 POST /api/treinamento-presenca/assinar - Auto-complete
# Let's insert the auto-complete logic after the success insert of presence
# In registrarAuditoria, at the end of colab.email check
PRESENCA_OLD = """                  res.json({ ok: true });
                }
              );"""

PRESENCA_NEW = """                  // AUTO-COMPLETAR INTEGRAÇÃO
                  db.run(`UPDATE integracao_passos_status 
                          SET status = 'concluido', feito_em = ? 
                          WHERE status = 'pendente' 
                            AND treinamento_id = ? 
                            AND processo_id IN (SELECT id FROM integracao_processos WHERE colaborador_id = ?)`, 
                         [now, treinamento_id, colaborador_id], (err) => {
                            if (err) console.error("[Integracao Auto] Erro ao concluir tarefa de treinamento:", err.message);
                            res.json({ ok: true });
                         });
                }
              );"""
content = content.replace(PRESENCA_OLD, PRESENCA_NEW)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Server patch for Treinamentos Integration done!")
