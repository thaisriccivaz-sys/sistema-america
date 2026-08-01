
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

OLD = """// ── GET /api/integ/templates ──────────────────────────────────────────────────
app.get('/api/integ/templates', authenticateToken, (req, res) => {"""

NEW = """// ── POST /api/integ/templates/seed ──────────────────────────────────────────
app.post('/api/integ/templates/seed', async (req, res) => {
    try {
        const seedData = {
            administrativo: [
                { titulo: 'Cartão de Vale Transporte', descricao: 'Providenciar e entregar cartão VT ao colaborador', condicao: 'vt', ordem: 1 },
                { titulo: 'Cartão de VR (Vale Refeição)', descricao: 'Providenciar e entregar cartão de Vale Refeição', condicao: null, ordem: 2 },
                { titulo: 'Cartão VC (Vale Combustível)', descricao: 'Providenciar e entregar cartão de Vale Combustível', condicao: 'vc', ordem: 3 },
                { titulo: 'Montagem de kit de boas-vindas', descricao: 'Preparar e entregar kit de boas-vindas ao colaborador', condicao: null, ordem: 4 },
                { titulo: 'Configurar ponto eletrônico', descricao: 'Cadastrar colaborador no sistema de ponto eletrônico', condicao: null, ordem: 5 },
                { titulo: 'Acesso aos sistemas (TI)', descricao: 'Configurar e-mail, acessos e sistemas necessários ao cargo', condicao: null, ordem: 6 },
                { titulo: 'Apresentação da empresa', descricao: 'Apresentar história, valores e cultura da América Rental', condicao: null, ordem: 7 },
                { titulo: 'Apresentação do time', descricao: 'Apresentar o colaborador à equipe e ao gestor direto', condicao: null, ordem: 8 },
                { titulo: 'Treinamentos específicos do cargo', descricao: 'Realizar treinamentos obrigatórios e específicos da função', condicao: null, ordem: 9 },
                { titulo: 'Entrega de crachá', descricao: 'Providenciar e entregar crachá de identificação', condicao: null, ordem: 10 },
                { titulo: 'Assinatura de documentos admissionais', descricao: 'Garantir assinatura de todos os documentos necessários', condicao: null, ordem: 11 },
                { titulo: 'Acompanhamento 30 dias', descricao: 'Realizar check-in após 30 dias de trabalho', condicao: null, ordem: 12 },
            ],
            operacional: [
                { titulo: 'Cartão de Vale Transporte', descricao: 'Providenciar e entregar cartão VT ao colaborador', condicao: 'vt', ordem: 1 },
                { titulo: 'Cartão de VR (Vale Refeição)', descricao: 'Providenciar e entregar cartão de Vale Refeição', condicao: null, ordem: 2 },
                { titulo: 'Montagem de kit de boas-vindas', descricao: 'Preparar e entregar kit de boas-vindas ao colaborador', condicao: null, ordem: 3 },
                { titulo: 'Configurar ponto eletrônico', descricao: 'Cadastrar colaborador no sistema de ponto eletrônico', condicao: null, ordem: 4 },
                { titulo: 'Entrega de EPIs', descricao: 'Entregar equipamentos de proteção individual obrigatórios', condicao: null, ordem: 5 },
                { titulo: 'Treinamentos de NR', descricao: 'Realizar treinamentos obrigatórios (NR10, NR35, etc.)', condicao: null, ordem: 6 },
                { titulo: 'Apresentação da empresa', descricao: 'Apresentar história, valores e cultura da América Rental', condicao: null, ordem: 7 },
                { titulo: 'Apresentação do time', descricao: 'Apresentar o colaborador à equipe e ao gestor direto', condicao: null, ordem: 8 },
                { titulo: 'Entrega de crachá', descricao: 'Providenciar e entregar crachá de identificação', condicao: null, ordem: 9 },
                { titulo: 'Assinatura de documentos admissionais', descricao: 'Garantir assinatura de todos os documentos necessários', condicao: null, ordem: 10 },
                { titulo: 'Acompanhamento 30 dias', descricao: 'Realizar check-in após 30 dias de trabalho', condicao: null, ordem: 11 },
            ],
        };

        const templateNames = {
            administrativo: 'Integração Administrativo',
            operacional:    'Integração Operacional',
        };

        for (const [tipo, acoes] of Object.entries(seedData)) {
            const tid = await new Promise((resolve, reject) => {
                db.run(`INSERT INTO integ_templates (nome, tipo_key) VALUES (?, ?)`, [templateNames[tipo], tipo], function(err) {
                    if (err) reject(err); else resolve(this.lastID);
                });
            });
            for (const a of acoes) {
                await new Promise((resolve, reject) => {
                    db.run(`INSERT INTO integ_template_acoes (template_id, titulo, descricao, condicao, ordem) VALUES (?, ?, ?, ?, ?)`,
                        [tid, a.titulo, a.descricao, a.condicao, a.ordem], function(err) {
                        if (err) reject(err); else resolve();
                    });
                });
            }
        }
        res.json({ ok: true, msg: 'Seed executado com sucesso' });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// ── GET /api/integ/templates ──────────────────────────────────────────────────
app.get('/api/integ/templates', authenticateToken, (req, res) => {"""

content = content.replace(OLD, NEW)
with open(f, 'w', encoding='utf-8') as fh: fh.write(content)
print("Endpoint de seed adicionado")
