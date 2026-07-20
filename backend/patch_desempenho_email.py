import re

filepath = r"C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js"

with open(filepath, 'r', encoding='latin-1') as f:
    content = f.read()

# Let's use a regex to find the exact block and replace it
pattern = re.compile(
    r"db\.get\(`SELECT id FROM avaliacoes WHERE colaborador_id = \? AND tipo = 'desempenho' AND ano = \? AND trimestre = \?`, \[colabId, ano, trimestre\], \(err2, exist\) => \{(.*?)\}\);\n    \}\);\n\}\);", 
    re.DOTALL
)

replacement = """db.get(`SELECT id FROM avaliacoes WHERE colaborador_id = ? AND tipo = 'desempenho' AND ano = ? AND trimestre = ?`, [colabId, ano, trimestre], (err2, exist) => {
            if (err2) return res.status(500).json({ error: 'Erro no banco de dados' });

            const finalizarAvaliacao = (idToUpdate, isInsert) => {
                const query = isInsert 
                    ? `INSERT INTO avaliacoes (colaborador_id, tipo, ano, trimestre, respostas_json, situacao, responsavel_nome) VALUES (?, 'desempenho', ?, ?, ?, 'finalizado', ?)`
                    : `UPDATE avaliacoes SET respostas_json = ?, situacao = 'finalizado', responsavel_nome = ? WHERE id = ?`;
                
                const params = isInsert 
                    ? [colabId, ano, trimestre, respostasJson, responsavelNome]
                    : [respostasJson, responsavelNome, idToUpdate];

                db.run(query, params, (err3) => {
                    if (err3) return res.status(500).json({ error: isInsert ? 'Erro ao criar avalia\xe7\xe3o' : 'Erro ao finalizar avalia\xe7\xe3o' });
                    
                    // Disparar email de notifica\xe7\xe3o
                    db.get(`SELECT nome_completo FROM colaboradores WHERE id = ?`, [colabId], (err4, colab) => {
                        if (!err4 && colab) {
                            sendEmailParaNotificados('formulario_desempenho', {
                                subject: `Avalia\xe7\xe3o de Desempenho Preenchida - ${colab.nome_completo}`,
                                html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
                                    <div style="text-align:center;background:#fff;border-bottom:1px solid #eee;">
                                        <h2 style="color:#0f4c81;margin:1rem 0;">Avalia\xe7\xe3o de Desempenho Preenchida</h2>
                                    </div>
                                    <div style="padding:20px;background:#f9fafb;color:#333;">
                                        <p>Ol\xe1,</p>
                                        <p>A avalia\xe7\xe3o de desempenho do colaborador <strong>${colab.nome_completo}</strong> (Ano ${ano} - Trimestre ${trimestre}) foi preenchida e finalizada.</p>
                                        <p>Respons\xe1vel pela avalia\xe7\xe3o: <strong>${responsavelNome || 'N/A'}</strong></p>
                                        <p style="margin-top:20px;text-align:center;">
                                            <a href="https://cadastro-colaboradores.onrender.com" style="background:#0ea5e9;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">Acessar o Sistema</a>
                                        </p>
                                    </div>
                                </div>`
                            });
                        }
                    });

                    res.json({ success: true, message: isInsert ? 'Avalia\xe7\xe3o criada e finalizada' : 'Avalia\xe7\xe3o finalizada' });
                });
            };

            if (exist) {
                finalizarAvaliacao(exist.id, false);
            } else {
                finalizarAvaliacao(null, true);
            }
        });
    });
});"""

if pattern.search(content):
    new_content = pattern.sub(replacement, content)
    with open(filepath, 'w', encoding='latin-1') as f:
        f.write(new_content)
    print("Success: Replaced content.")
else:
    print("Error: Target not found with regex.")
