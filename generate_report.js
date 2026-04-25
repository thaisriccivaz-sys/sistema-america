const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

function isValidDate(dateStr) {
    if (!dateStr) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(dateStr) && !isNaN(new Date(dateStr).getTime());
}

function checkField(value, rules) {
    if (!value || String(value).trim() === '') return { status: '❌ FALTANDO' };
    const str = String(value).trim();
    if (rules) {
        if (rules.type === 'cpf') {
            const clean = str.replace(/[^\d]/g, '');
            if (clean.length !== 11) return { status: '⚠️ DIVERGENTE', detail: 'Formato de CPF inválido' };
        } else if (rules.type === 'date') {
            if (!isValidDate(str)) return { status: '⚠️ DIVERGENTE', detail: 'Formato esperado YYYY-MM-DD' };
        } else if (rules.type === 'email') {
            if (!str.includes('@')) return { status: '⚠️ DIVERGENTE', detail: 'Formato de E-mail inválido' };
        } else if (rules.type === 'phone') {
            const clean = str.replace(/[^\d]/g, '');
            if (clean.length < 10 || clean.length > 11) return { status: '⚠️ DIVERGENTE', detail: 'Falta DDI/DDD ou incompleto' };
        }
    }
    return { status: '✅ OK' };
}

db.all("SELECT * FROM colaboradores WHERE status != 'Desligado' OR status IS NULL ORDER BY nome_completo ASC", [], (err, rows) => {
    if (err) {
        console.error("ERRO:", err.message);
        return db.close();
    }
    
    let md = "# Relatório de Qualidade de Dados Cadastrais\n\n";
    md += "> [!IMPORTANT]\n> Esta lista consolida o status de preenchimento dos dados de todos os colaboradores ativos e afastados (excluindo os desligados).\n\n";

    let resumo = { ok: 0, faltando: 0, divergente: 0, conferir: 0 };
    let pendenciasGerais = [];

    rows.forEach(c => {
        let colabMD = `\n### ${c.nome_completo || 'Sem Nome'} (ID: ${c.id})\n`;
        let pendenciasColab = [];
        
        const checks = [
            { field: 'CPF', val: c.cpf, rules: { type: 'cpf' }},
            { field: 'RG', val: c.rg },
            { field: 'Data de Nascimento', val: c.data_nascimento, rules: { type: 'date' }},
            { field: 'E-mail', val: c.email, rules: { type: 'email' }},
            { field: 'Telefone', val: c.telefone, rules: { type: 'phone' }},
            { field: 'Endereço', val: c.endereco },
            { field: 'Cargo', val: c.cargo },
            { field: 'CBO', val: c.cbo },
            { field: 'Departamento', val: c.departamento },
            { field: 'Data de Admissão', val: c.data_admissao, rules: { type: 'date' }},
            { field: 'Salário', val: c.salario },
            { field: 'PIS', val: c.pis },
            { field: 'CTPS Número/Série', val: (c.ctps_numero && c.ctps_serie) ? `${c.ctps_numero}/${c.ctps_serie}` : '' },
            { field: 'Título Eleitoral', val: c.titulo_eleitoral },
            { field: 'Banco/Agência/Conta', val: (c.banco_nome && c.banco_agencia && c.banco_conta) ? `${c.banco_nome}` : '' },
            { field: 'Nome da Mãe', val: c.nome_mae }
        ];

        checks.forEach(chk => {
            const res = checkField(chk.val, chk.rules);
            colabMD += `- **${chk.field}**: ${res.status} ${res.detail ? '('+res.detail+')' : ''}\n`;
            
            if (res.status.includes('✅')) resumo.ok++;
            else if (res.status.includes('❌')) { resumo.faltando++; pendenciasColab.push(`Falta ${chk.field}`); }
            else if (res.status.includes('⚠️')) { resumo.divergente++; pendenciasColab.push(`${chk.field} Divergente`); }
        });

        // Conferir condicional
        if (c.sexo === 'Masculino' && !c.certificado_militar) {
            colabMD += `- **Certificado Militar**: 🔵 CONFERIR (Obrigatório para sexo Masculino)\n`;
            resumo.conferir++;
            pendenciasColab.push('Verificar Certificado Militar');
        }
        if (c.cargo && c.cargo.toLowerCase().includes('motorista') && !c.cnh_numero) {
            colabMD += `- **CNH**: 🔵 CONFERIR (Obrigatório para Motoristas)\n`;
            resumo.conferir++;
            pendenciasColab.push('Verificar CNH');
        }

        if (pendenciasColab.length > 0) {
            pendenciasGerais.push(`- **${c.nome_completo}**: ${pendenciasColab.join(', ')}`);
        }
        
        md += colabMD;
    });

    let headerMd = `## Resumo Geral\n`;
    headerMd += `- ✅ **OK**: ${resumo.ok}\n`;
    headerMd += `- ❌ **FALTANDO**: ${resumo.faltando}\n`;
    headerMd += `- ⚠️ **DIVERGENTE**: ${resumo.divergente}\n`;
    headerMd += `- 🔵 **CONFERIR**: ${resumo.conferir}\n\n`;

    headerMd += `## Alertas Críticos por Colaborador\n`;
    if (pendenciasGerais.length === 0) headerMd += `Nenhuma pendência crítica!\n`;
    else headerMd += pendenciasGerais.join('\n') + `\n\n`;

    headerMd += `## Detalhamento Completo\n`;

    const finalMd = md.replace("> [!IMPORTANT]\n> Esta lista consolida o status de preenchimento dos dados de todos os colaboradores ativos e afastados (excluindo os desligados).\n\n", "> [!IMPORTANT]\n> Esta lista consolida o status de preenchimento dos dados de todos os colaboradores ativos e afastados (excluindo os desligados).\n\n" + headerMd);

    fs.writeFileSync(path.join(__dirname, 'data_quality_report.md'), finalMd);
    console.log("Relatório gerado em data_quality_report.md");

    db.close();
});
