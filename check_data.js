const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'data', 'hr_system_v2.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

function isValidDate(dateStr) {
    if (!dateStr) return false;
    // expect YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(dateStr) && !isNaN(new Date(dateStr).getTime());
}

function checkField(value, rules) {
    if (!value || String(value).trim() === '') return '❌ FALTANDO';
    const str = String(value).trim();
    if (rules) {
        if (rules.type === 'cpf') {
            const clean = str.replace(/[^\d]/g, '');
            if (clean.length !== 11) return '⚠️ DIVERGENTE (Formato inválido)';
        } else if (rules.type === 'date') {
            if (!isValidDate(str)) return '⚠️ DIVERGENTE (Formato, esperado YYYY-MM-DD)';
        } else if (rules.type === 'email') {
            if (!str.includes('@')) return '⚠️ DIVERGENTE (Formato inválido)';
        } else if (rules.type === 'phone') {
            const clean = str.replace(/[^\d]/g, '');
            if (clean.length < 10 || clean.length > 11) return '⚠️ DIVERGENTE (Falta DDI/DDD ou incompleto)';
        }
        else if (rules.type === 'cep') {
            const clean = str.replace(/[^\d]/g, '');
            if (clean.length !== 8) return '⚠️ DIVERGENTE (CEP inválido)';
        }
    }
    return '✅ OK';
}

db.all("SELECT * FROM colaboradores WHERE status != 'Desligado' OR status IS NULL", [], (err, rows) => {
    if (err) {
        console.error("ERRO:", err.message);
        return db.close();
    }
    
    rows.forEach(c => {
        console.log(`\n### ${c.nome_completo || 'Sem Nome'} (ID: ${c.id}) - Status: ${c.status}`);
        
        const checks = [
            { field: 'CPF', val: c.cpf, rules: { type: 'cpf' }},
            { field: 'RG', val: c.rg },
            { field: 'Data de Nascimento', val: c.data_nascimento, rules: { type: 'date' }},
            { field: 'Local de Nascimento', val: c.local_nascimento },
            { field: 'E-mail', val: c.email, rules: { type: 'email' }},
            { field: 'Telefone', val: c.telefone, rules: { type: 'phone' }},
            { field: 'Endereço', val: c.endereco },
            { field: 'Cargo', val: c.cargo },
            { field: 'CBO', val: c.cbo },
            { field: 'Departamento', val: c.departamento },
            { field: 'Data de Admissão', val: c.data_admissao, rules: { type: 'date' }},
            { field: 'Salário', val: c.salario },
            { field: 'PIS', val: c.pis },
            { field: 'CTPS Número', val: c.ctps_numero },
            { field: 'Título Eleitoral', val: c.titulo_eleitoral },
            { field: 'Banco', val: c.banco_nome },
            { field: 'Agência', val: c.banco_agencia },
            { field: 'Conta', val: c.banco_conta },
            { field: 'Nome da Mãe', val: c.nome_mae }
        ];

        checks.forEach(chk => {
            const st = checkField(chk.val, chk.rules);
            console.log(`- ${chk.field}: ${chk.val || ''} -> ${st}`);
        });

        // Conferir condicional
        if (c.sexo === 'Masculino') {
            console.log(`- Certificado Militar: ${c.certificado_militar || ''} -> ${!c.certificado_militar ? '🔵 CONFERIR (obrigatório para homens)' : '✅ OK'}`);
        }
        if (c.cargo && c.cargo.toLowerCase().includes('motorista')) {
             console.log(`- CNH: ${c.cnh_numero || ''} -> ${!c.cnh_numero ? '🔵 CONFERIR (obrigatório para motoristas)' : '✅ OK'}`);
        }
    });

    db.close();
});
