const fs = require('fs');

let credJsPath = 'frontend/credenciamento.js';
let credJs = fs.readFileSync(credJsPath, 'utf8');

const validationRegex = /async function validarVencimentosCredenciamento\(\) \{[\s\S]*?for \(const doc of \(docs \|\| \[\]\)\) \{[\s\S]*?const val = mapDocTypeToValue\(doc\.document_type\);[\s\S]*?if \(val && requiredValues\.includes\(val\)\) \{[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}[\s\S]*?return erros;/;

const newValidation = `async function validarVencimentosCredenciamento() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const erros = [];
    
    let requiredValues = [];
    const containerDocs = document.getElementById('cred-docs-exigidos') || document.getElementById('comerc-docs-exigidos');
    if (containerDocs) {
        requiredValues = Array.from(containerDocs.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    } else {
        if (window._credSolicitacaoId && window._historicoCredDados) {
            const dados = window._historicoCredDados.find(c => String(c.id) === String(window._credSolicitacaoId));
            if (dados && dados.docs_exigidos) {
                try { requiredValues = JSON.parse(dados.docs_exigidos); } catch(e){}
            }
        }
    }

    const mapDocTypeToValue = (docType) => {
        const d = (docType || '').toLowerCase();
        if (d.includes('cnh') || d.includes('habilita')) return 'cnh';
        if (d.includes('cpf')) return 'cpf';
        if (d.includes('aso')) return 'aso';
        if (d.includes('ficha de registro') || d.includes('registro')) return 'ficha_registro';
        if (d.includes('vacina') || d.includes('treinamento')) return 'treinamento';
        if (d.includes('epi')) return 'epi';
        if (d.includes('contrato') || d.includes('social')) return 'contrato_esocial';
        if (d.includes('nr1') || d.includes('ordem de serv')) return 'nr1';
        return null;
    };

    const docNamesReadable = {
        'cnh': 'CNH', 'cpf': 'CPF', 'aso': 'ASO', 'ficha_registro': 'Ficha de Registro',
        'treinamento': 'Carteira de Vacinação', 'epi': 'Ficha de EPI',
        'contrato_esocial': 'Contrato e-social', 'nr1': 'NR1 / Ordem de Serviço'
    };

    // 1. Validar licenças selecionadas
    for (const id of credenciamentoState.selecionadosLicencas) {
        const lic = credenciamentoState.licencas.find(l => String(l.id) === id);
        if (lic && lic.validade) {
            if (new Date(lic.validade + 'T12:00:00') < hoje)
                erros.push(\`A licença "\${lic.nome}" da empresa \${lic.empresa || 'América Rental'} está VENCIDA (\${lic.validade.split('-').reverse().join('/')}).\`);
        }
    }

    // 2. Validar documentos dos colaboradores selecionados
    if (credenciamentoState.selecionadosColabs.length > 0) {
        try {
            const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
            for (const idStr of credenciamentoState.selecionadosColabs) {
                const c = credenciamentoState.colaboradores.find(col => String(col.id) === idStr);
                const res = await fetch(\`/api/colaboradores/\${idStr}/documentos\`, { headers: { 'Authorization': \`Bearer \${token}\` } });
                if (!res.ok) continue;
                const docs = await res.json();
                
                const isMotorista = c && c.cargo && c.cargo.toUpperCase().includes('MOTORISTA');
                const nomeColab = c ? c.nome_completo : \`ID \${idStr}\`;

                for (const reqDoc of requiredValues) {
                    if (reqDoc === 'cnh' && !isMotorista) continue;
                    if (reqDoc === 'cpf' && isMotorista) continue;

                    const docFound = (docs || []).find(d => {
                        const val = mapDocTypeToValue(d.document_type);
                        return val === reqDoc;
                    });

                    const docName = docNamesReadable[reqDoc] || reqDoc;

                    if (!docFound) {
                        erros.push(\`O documento "\${docName}" do colaborador(a) \${nomeColab} é INEXISTENTE. Contacte o setor de RH para atualização.\`);
                    } else if (docFound.vencimento && new Date(docFound.vencimento + 'T12:00:00') < hoje) {
                        erros.push(\`O documento "\${docName}" do colaborador(a) \${nomeColab} está VENCIDO (\${docFound.vencimento.split('-').reverse().join('/')}). Contacte o setor de RH.\`);
                    }
                }
            }
        } catch(e) { console.warn('[Credenciamento] Erro ao validar docs colaboradores:', e); }
    }

    return erros;`;

let replaced = credJs.replace(validationRegex, newValidation);
if (replaced !== credJs) {
    fs.writeFileSync(credJsPath, replaced, 'utf8');
    console.log("Updated validation logic in credenciamento.js!");
} else {
    console.log("Regex didn't match in credenciamento.js.");
}