const fs = require('fs');

const serverJsPath = './backend/server.js';
let content = fs.readFileSync(serverJsPath, 'utf8');

const anchor = `</script></body></html>\`);
    });
});

// POST: Salvar/atualizar dados do fechamento (upsert por colaborador)`;

const newRoutes = `</script></body></html>\`);
    });
});

// ==========================================
// ETAPA 2 - NOVAS ROTAS DE FECHAMENTO
// ==========================================

app.get('/api/fechamento/multas-prontuario/:ano/:mes', authenticateToken, (req, res) => {
    const { ano, mes } = req.params;
    // Busca multas com desconto em folha e com parcelas
    db.all(\`SELECT m.*, c.cpf FROM multas m
            JOIN colaboradores c ON m.colaborador_id = c.id
            WHERE m.tipo_resolucao = 'desconto_folha'
            AND m.parcelas > 0
            AND m.status IN ('Aceita', 'Assinada', 'Processada', 'aceita', 'assinada')
            AND m.valor_multa IS NOT NULL\`, [],
    (err, multas) => {
        if (err) return res.status(500).json({ error: err.message });
        const mesAtualNum = parseInt(ano) * 100 + parseInt(mes);
        const grupos = {}; // colaborador_id -> { valor_total, detalhes }
        for (const m of multas) {
            const valorTotal = parseFloat(m.valor_multa) || 0;
            const numParcelas = parseInt(m.parcelas) || 1;
            const valorParcela = Math.round((valorTotal / numParcelas) * 100) / 100;
            // Parcela 1 começa no mês seguinte ao created_at
            const dtBase = new Date(m.created_at);
            let mIni = dtBase.getMonth() + 2; // +1 para próximo mês, +1 porque getMonth é 0-indexed
            let aIni = dtBase.getFullYear();
            if (mIni > 12) { mIni -= 12; aIni += 1; }
            const inicioNum = aIni * 100 + mIni;
            // Calcular fim: início + (parcelas - 1) meses
            let mFim = mIni + numParcelas - 1;
            let aFim = aIni + Math.floor((mFim - 1) / 12);
            mFim = ((mFim - 1) % 12) + 1;
            const fimNum = aFim * 100 + mFim;
            if (mesAtualNum >= inicioNum && mesAtualNum <= fimNum) {
                const colId = m.colaborador_id;
                if (!grupos[colId]) grupos[colId] = { colaborador_id: colId, valor_total: 0, detalhes: [] };
                grupos[colId].valor_total = Math.round((grupos[colId].valor_total + valorParcela) * 100) / 100;
                grupos[colId].detalhes.push({ multa_id: m.id, descricao: m.descricao_infracao || 'Multa', valor_parcela: valorParcela, total_parcelas: numParcelas });
            }
        }
        res.json(Object.values(grupos));
    });
});

app.get('/api/fechamento/plr/:ano/:mes', authenticateToken, (req, res) => {
    const mesNum = parseInt(req.params.mes);
    const anoNum = parseInt(req.params.ano);
    // Determinar período PLR
    // Período 1: Mai(5) → Out(10), pago em outubro
    // Período 2: Nov(11) → Abr(4), pago em abril do ano seguinte
    let periodoInicio, periodoFim, periodoAno;
    if (mesNum === 10) { // Outubro: pago Período 1
        periodoInicio = new Date(anoNum, 4, 1); // maio
        periodoFim = new Date(anoNum, 9, 31);   // outubro
    } else if (mesNum === 4) { // Abril: pago Período 2
        periodoInicio = new Date(anoNum - 1, 10, 1); // novembro do ano anterior
        periodoFim = new Date(anoNum, 3, 30);          // abril atual
    } else {
        return res.json([]); // Não é mês de PLR padrão
    }
    db.all(\`SELECT id, nome_completo, folha_plr_valor, folha_plr_meses, data_admissao FROM colaboradores
            WHERE folha_plr = 1 AND status != 'Desligado'\`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const resultado = [];
        for (const c of rows) {
            // Checar se este mês está nos meses configurados de PLR
            let plrMeses = [];
            try { plrMeses = JSON.parse(c.folha_plr_meses || '[]'); } catch(e) {}
            const mesNomes = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
            if (plrMeses.length > 0 && !plrMeses.includes(mesNomes[mesNum - 1])) continue;
            // Calcular proporcional
            const admissao = c.data_admissao ? new Date(c.data_admissao) : null;
            const valorBase = parseFloat(c.folha_plr_valor) || 800;
            let plrValor = valorBase;
            if (admissao && admissao > periodoInicio) {
                // Meses completos no período
                const diffMs = periodoFim - admissao;
                const mesesCompletos = Math.floor(diffMs / (30.44 * 24 * 3600 * 1000));
                if (mesesCompletos <= 0) continue;
                plrValor = Math.round((Math.min(mesesCompletos, 6) / 6) * valorBase * 100) / 100;
            }
            resultado.push({ colaborador_id: c.id, nome: c.nome_completo, plr_valor: plrValor, proporcional: admissao && admissao > periodoInicio });
        }
        res.json(resultado);
    });
});

app.post('/api/fechamento/gerar-xlsx', authenticateToken, async (req, res) => {
    try {
        const { mes, ano } = req.body;
        if (!mes || !ano) return res.status(400).json({ error: 'Mês/ano obrigatórios' });
        const XLSX = require('xlsx');
        const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const mesNome = mesesNomes[parseInt(mes) - 1] || mes;
        // Buscar dados
        const rows = await new Promise((resolve, reject) => {
            db.all(\`SELECT c.nome_completo, c.cpf, c.tipo_contrato, c.meio_transporte,
                           fm.horas_normais, fm.horas_trabalhadas, fm.horas_noturnas,
                           fm.extra_60, fm.extra_100, fm.dias_falta, fm.data_faltas,
                           fm.dsr, fm.horas_atraso, fm.vt, fm.farmacia, fm.mercado,
                           fm.outros, fm.multas, fm.comissao, fm.bonus_comissao, fm.academia,
                           fm.plr, fm.consignado, fm.dias_intermitente,
                           fc_com.valor_comissao, fc_com.valor_bonus,
                           fcons.valor_total as consig_total
                    FROM colaboradores c
                    LEFT JOIN fechamento_mensal fm ON fm.colaborador_id = c.id AND fm.mes = ? AND fm.ano = ?
                    LEFT JOIN fechamento_comissao fc_com ON fc_com.colaborador_id = c.id AND fc_com.mes = ? AND fc_com.ano = ?
                    LEFT JOIN fechamento_consignado fcons ON fcons.cpf = c.cpf AND fcons.mes = ? AND fcons.ano = ?
                    WHERE c.status != 'Desligado'
                    ORDER BY c.nome_completo ASC\`,
                [mes, ano, mes, ano, mes, ano],
                (err, rows) => err ? reject(err) : resolve(rows)
            );
        });
        // Helper para converter HH:MM em decimal
        const horasDec = (str) => {
            if (!str) return '';
            const [h, m] = String(str).split(':').map(Number);
            return Math.round(((h || 0) + (m || 0) / 60) * 1000) / 1000 || '';
        };
        // Montar linhas do XLSX
        const aoa = [];
        aoa.push([\`FOLHA PAGAMENTO - \${mesNome.toUpperCase()}/\${ano}\`]);
        aoa.push([]);
        aoa.push(['AMERICA RENTAL']);
        aoa.push([]);
        // Linha 5: códigos de rubricas
        aoa.push(['', '9435', '256', '264', '200', '8792', '', '8060', '48', '238', '279', '290', '302', '37', '278', '873', '9750']);
        // Linha 6: headers
        aoa.push(['Nome do funcionário', 'Total Trabalhado', 'Total Noturno', 'Extra 60%', 'Extra 100%', 'Dia Falta', 'Data Falta', 'Atrasos', 'VT', 'Farmácia', 'Mercado', 'Outros', 'Multas', 'Comissão', 'Academia', 'PLR', 'Consignado']);
        // Linhas de dados
        for (const r of rows) {
            const comissao = (parseFloat(r.valor_comissao) || parseFloat(r.comissao) || 0) + (parseFloat(r.valor_bonus) || parseFloat(r.bonus_comissao) || 0);
            const consig = parseFloat(r.consig_total) || parseFloat(r.consignado) || 0;
            const isIntermitente = (r.tipo_contrato || '').toLowerCase().includes('intermitente');
            aoa.push([
                (r.nome_completo || '').substring(0, 15),
                isIntermitente ? (r.dias_intermitente || '') : '',
                horasDec(r.horas_noturnas),
                horasDec(r.extra_60),
                horasDec(r.extra_100),
                r.dias_falta || '',
                r.data_faltas || '',
                horasDec(r.horas_atraso),
                r.meio_transporte === 'Vale Transporte' || r.vt ? 'Sim' : '',
                parseFloat(r.farmacia) || '',
                parseFloat(r.mercado) || '',
                parseFloat(r.outros) || '',
                parseFloat(r.multas) || '',
                comissao || '',
                parseFloat(r.academia) || '',
                parseFloat(r.plr) || '',
                consig || ''
            ]);
        }
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        // Estilizar header (linha 6 = índice 5)
        const range = XLSX.utils.decode_range(ws['!ref']);
        ws['!cols'] = [{ wch: 18 }, ...Array(16).fill({ wch: 12 })];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, \`\${mesNome} \${ano}\`);
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', \`attachment; filename="fechamento_\${String(mes).padStart(2,'0')}_\${ano}.xlsx"\`);
        res.send(buffer);
    } catch(e) {
        console.error('[gerar-xlsx]', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/fechamento/enviar-email', authenticateToken, async (req, res) => {
    try {
        const { mes, ano, email_destino } = req.body;
        if (!mes || !ano || !email_destino) return res.status(400).json({ error: 'Parâmetros obrigatórios: mes, ano, email_destino' });
        const XLSX = require('xlsx');
        const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const mesNome = mesesNomes[parseInt(mes) - 1] || mes;
        // Gerar o buffer do XLSX (reutilizar a lógica acima)
        const rows = await new Promise((resolve, reject) => {
            db.all(\`SELECT c.nome_completo, c.cpf, c.tipo_contrato, c.meio_transporte,
                           fm.horas_normais, fm.horas_trabalhadas, fm.horas_noturnas,
                           fm.extra_60, fm.extra_100, fm.dias_falta, fm.data_faltas,
                           fm.dsr, fm.horas_atraso, fm.vt, fm.farmacia, fm.mercado,
                           fm.outros, fm.multas, fm.comissao, fm.bonus_comissao, fm.academia,
                           fm.plr, fm.consignado, fm.dias_intermitente,
                           fc_com.valor_comissao, fc_com.valor_bonus,
                           fcons.valor_total as consig_total
                    FROM colaboradores c
                    LEFT JOIN fechamento_mensal fm ON fm.colaborador_id = c.id AND fm.mes = ? AND fm.ano = ?
                    LEFT JOIN fechamento_comissao fc_com ON fc_com.colaborador_id = c.id AND fc_com.mes = ? AND fc_com.ano = ?
                    LEFT JOIN fechamento_consignado fcons ON fcons.cpf = c.cpf AND fcons.mes = ? AND fcons.ano = ?
                    WHERE c.status != 'Desligado'
                    ORDER BY c.nome_completo ASC\`,
                [mes, ano, mes, ano, mes, ano],
                (err, rows) => err ? reject(err) : resolve(rows)
            );
        });
        const horasDec = (str) => { if (!str) return ''; const [h, m] = String(str).split(':').map(Number); return Math.round(((h||0)+(m||0)/60)*1000)/1000 || ''; };
        const aoa = [];
        aoa.push([\`FOLHA PAGAMENTO - \${mesNome.toUpperCase()}/\${ano}\`]);
        aoa.push([]);
        aoa.push(['AMERICA RENTAL']);
        aoa.push([]);
        aoa.push(['', '9435', '256', '264', '200', '8792', '', '8060', '48', '238', '279', '290', '302', '37', '278', '873', '9750']);
        aoa.push(['Nome do funcionário', 'Total Trabalhado', 'Total Noturno', 'Extra 60%', 'Extra 100%', 'Dia Falta', 'Data Falta', 'Atrasos', 'VT', 'Farmácia', 'Mercado', 'Outros', 'Multas', 'Comissão', 'Academia', 'PLR', 'Consignado']);
        for (const r of rows) {
            const comissao = (parseFloat(r.valor_comissao)||parseFloat(r.comissao)||0)+(parseFloat(r.valor_bonus)||parseFloat(r.bonus_comissao)||0);
            const consig = parseFloat(r.consig_total)||parseFloat(r.consignado)||0;
            const isIntermitente = (r.tipo_contrato||'').toLowerCase().includes('intermitente');
            aoa.push([
                (r.nome_completo||'').substring(0,15),
                isIntermitente?(r.dias_intermitente||''):'',
                horasDec(r.horas_noturnas), horasDec(r.extra_60), horasDec(r.extra_100),
                r.dias_falta||'', r.data_faltas||'', horasDec(r.horas_atraso),
                r.meio_transporte==='Vale Transporte'||r.vt?'Sim':'',
                parseFloat(r.farmacia)||'', parseFloat(r.mercado)||'', parseFloat(r.outros)||'',
                parseFloat(r.multas)||'', comissao||'', parseFloat(r.academia)||'',
                parseFloat(r.plr)||'', consig||''
            ]);
        }
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [{wch:18},...Array(16).fill({wch:12})];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, \`\${mesNome} \${ano}\`);
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        // Enviar email
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT)||587,
            secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email_destino,
            subject: \`Fechamento de Folha — \${mesNome}/\${ano}\`,
            html: \`<p>Prezados,</p><p>Segue em anexo a planilha de fechamento de folha referente a <strong>\${mesNome}/\${ano}</strong>.</p><p>Att,<br>América Rental — RH</p>\`,
            attachments: [{ filename: \`fechamento_\${String(mes).padStart(2,'0')}_\${ano}.xlsx\`, content: buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]
        });
        // Marcar como enviado
        db.run(\`UPDATE fechamento_mensal SET planilha_enviada_em = CURRENT_TIMESTAMP, status = 'enviado' WHERE mes = ? AND ano = ?\`, [mes, ano]);
        res.json({ ok: true, mensagem: \`Email enviado para \${email_destino}\` });
    } catch(e) {
        console.error('[enviar-email-fechamento]', e);
        res.status(500).json({ error: e.message });
    }
});

// POST: Salvar/atualizar dados do fechamento (upsert por colaborador)`;

if (content.includes(anchor)) {
    content = content.replace(anchor, newRoutes);
    fs.writeFileSync(serverJsPath, content);
    console.log("Arquivo atualizado com sucesso.");
} else {
    console.log("ERRO: âncora não encontrada.");
}
