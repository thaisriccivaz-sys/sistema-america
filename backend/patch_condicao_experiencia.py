
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. Add new status to INTEG_STATUS
regex_status = r"(nao_aplica:\s*\{[^}]+\},)"
replacement_status = r"\1\n    aguardando_experiencia: { label: 'Aguard. Aprovação (Exp.)', color: '#0f4c81', bg: '#eff6ff', icon: 'ph-lock' },"
content = re.sub(regex_status, replacement_status, content)

# 2. Add "experiencia_aprovado" option to the dropdown condition
regex_cond = r'(<option value="terapia"[^>]*>Somente se usar Terapia</option>)'
replacement_cond = r'''\1
                        <option value="experiencia_aprovado" ${a.condicao==='experiencia_aprovado'?'selected':''}>Somente se Aprovado na Experiência</option>'''
content = re.sub(regex_cond, replacement_cond, content)

# 3. Fix the "Desfazer" button in abrirProcessoIntegracao
regex_btn = r"(p\.status!==\'pendente\'\?`<button onclick=\"window\.marcarPassoInteg)"
replacement_btn = r"(p.status!=='pendente' && p.status!=='aguardando_experiencia')?`<button onclick=\"window.marcarPassoInteg"
content = re.sub(regex_btn, replacement_btn, content)

# Also fix the text color so it's not strike-through or greyed out like nao_aplica
# const stInfo = INTEG_STATUS[p.status]||INTEG_STATUS.pendente; const isPendente = p.status==='pendente';
# It already does `font-weight:${isPendente?'600':'400'}; color:${isPendente?'#0f172a':'#94a3b8'}`
regex_style = r"(color:\$\{isPendente\?'#0f172a':'#94a3b8'\})"
replacement_style = r"color:${(isPendente || p.status==='aguardando_experiencia')?'#0f172a':'#94a3b8'}"
content = re.sub(regex_style, replacement_style, content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patched frontend/integracao.js")

f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 4. In server.js _condicaoAplicavel: Make it return true for 'experiencia_aprovado' 
# so the step is generated initially
regex_cond_backend = r"(if \(condicao === 'terapia'\) return \(colab\.terapia_participa \|\| ''\)\.toLowerCase\(\) === 'sim';)"
replacement_cond_backend = r"\1\n    if (condicao === 'experiencia_aprovado') return true;"
content = re.sub(regex_cond_backend, replacement_cond_backend, content)

# 5. In server.js POST /api/integ/colaboradores, when inserting steps, 
# set status to aguardando_experiencia if condicao is experiencia_aprovado
regex_insert1 = r"(await new Promise\(\(resolve, reject\) =>\s*db\.run\(`INSERT INTO integracao_passos_status \(processo_id, passo_config_id, status, responsavel_user_id, titulo, descricao_custom, is_custom, treinamento_id\) VALUES \(\?, NULL, 'pendente', \?, \?, \?, 1, \?\)`,\s*\[processoId, respFinalId \|\| null, a\.titulo, a\.descricao \|\| null, a\.treinamento_id \|\| null\],)"
replacement_insert1 = r'''let initialStatus = (a.condicao === 'experiencia_aprovado') ? 'aguardando_experiencia' : 'pendente';
                    await new Promise((resolve, reject) =>
                        db.run(`INSERT INTO integracao_passos_status (processo_id, passo_config_id, status, responsavel_user_id, titulo, descricao_custom, is_custom, treinamento_id) VALUES (?, NULL, ?, ?, ?, ?, 1, ?)`,
                            [processoId, initialStatus, respFinalId || null, a.titulo, a.descricao || null, a.treinamento_id || null],'''
content = re.sub(regex_insert1, replacement_insert1, content)

# 6. In server.js POST /api/experiencia/publico/submit, unlock the steps if approved!
regex_experiencia = r"(gerarESalvarPDFExperiencia\(colab, respostas, pontuacao, situacao_avaliacao, comentarios\);)"
replacement_experiencia = r'''\1
                            if (situacao_avaliacao === 'Aprovado') {
                                db.run(`UPDATE integracao_passos_status SET status = 'pendente' WHERE status = 'aguardando_experiencia' AND processo_id IN (SELECT id FROM integracao_processos WHERE colaborador_id = ?)`, [colab.id], (err) => {
                                    if(err) console.error("Erro ao liberar integracao de experiencia:", err);
                                });
                            }'''
content = re.sub(regex_experiencia, replacement_experiencia, content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patched backend/server.js")
