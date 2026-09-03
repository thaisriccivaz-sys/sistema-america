"""
patch_pagamentos_massa.py
Aplica todas as mudanças no backend/pagamentos_massa.js:
1. Adiciona extrairCpfDaPagina()
2. Adiciona buscarColaboradorPorCpf()
3. Atualiza processarPDF() para match por CPF primeiro
4. Adiciona processarPDFEmprestimos()
5. Atualiza module.exports
"""
import re

with open('backend/pagamentos_massa.js', 'rb') as f:
    content = f.read().decode('utf-8')

# ─────────────────────────────────────────────────────────────────────────────
# 1. Adicionar extrairCpfDaPagina() após extrairNomeDaPagina()
# ─────────────────────────────────────────────────────────────────────────────
new_fn_cpf = r"""
// Extrai CPF do texto de uma página (formato XXX.XXX.XXX-XX)
function extrairCpfDaPagina(texto) {
    if (!texto) return null;
    const match = texto.match(/(\d{3}[.\-]\d{3}[.\-]\d{3}[.\-]\d{2})/);
    if (match) {
        const digits = match[1].replace(/[^\d]/g, '');
        if (digits.length === 11) {
            return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
    }
    return null;
}

"""

# Inserir após a função extrairNomeDaPagina (antes de buscarColaboradorPorNome)
target = '// Busca colaborador pelo nome no banco (match normalizado)'
if target in content:
    content = content.replace(target, new_fn_cpf + target, 1)
    print('OK: extrairCpfDaPagina adicionada')
else:
    print('FALHA: ponto de inserção extrairCpfDaPagina não encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Adicionar buscarColaboradorPorCpf() após buscarColaboradorPorNome()
# ─────────────────────────────────────────────────────────────────────────────
new_fn_cpf_match = r"""
// Busca colaborador pelo CPF (match exato nos dígitos)
function buscarColaboradorPorCpf(cpf, todosColaboradores) {
    if (!cpf) return null;
    const cpfNorm = cpf.replace(/[^\d]/g, '');
    if (cpfNorm.length !== 11) return null;
    const encontrado = todosColaboradores.find(c => {
        const cCpf = (c.cpf || '').replace(/[^\d]/g, '');
        return cCpf && cCpf === cpfNorm;
    });
    return encontrado ? { colaborador: encontrado, confianca: 'exato' } : null;
}

"""

target2 = "/**\n * Extrai texto por página do PDF"
if target2 in content:
    content = content.replace(target2, new_fn_cpf_match + target2, 1)
    print('OK: buscarColaboradorPorCpf adicionada')
else:
    print('FALHA: ponto de inserção buscarColaboradorPorCpf não encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Atualizar SELECT em processarPDF() para incluir c.cpf
# ─────────────────────────────────────────────────────────────────────────────
old_select = 'SELECT c.id, c.nome_completo, c.email, c.email_corporativo, c.departamento, c.cargo,\r\n                    d.tipo AS setor'
new_select = 'SELECT c.id, c.nome_completo, c.email, c.email_corporativo, c.departamento, c.cargo, c.cpf,\r\n                    d.tipo AS setor'
if old_select in content:
    content = content.replace(old_select, new_select, 1)
    print('OK: SELECT atualizado com c.cpf')
else:
    # Tentar com LF apenas
    old_select2 = 'SELECT c.id, c.nome_completo, c.email, c.email_corporativo, c.departamento, c.cargo,\n                    d.tipo AS setor'
    new_select2 = 'SELECT c.id, c.nome_completo, c.email, c.email_corporativo, c.departamento, c.cargo, c.cpf,\n                    d.tipo AS setor'
    if old_select2 in content:
        content = content.replace(old_select2, new_select2, 1)
        print('OK: SELECT atualizado com c.cpf (LF)')
    else:
        print('FALHA: SELECT não encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Atualizar loop de páginas em processarPDF() para tentar CPF primeiro
# ─────────────────────────────────────────────────────────────────────────────
old_loop = (
    "        const texto = pageTexts[i] || '';\r\n"
    "        let nomeDetectado = extrairNomeDaPagina(texto);\r\n"
    "        let match = nomeDetectado ? buscarColaboradorPorNome(nomeDetectado, colaboradores) : null;\r\n"
    "        \r\n"
    "        if (!nomeDetectado && lastNomeDetectado) {\r\n"
    "            nomeDetectado = lastNomeDetectado;\r\n"
    "            match = lastMatch;\r\n"
    "        } else if (nomeDetectado) {\r\n"
    "            lastNomeDetectado = nomeDetectado;\r\n"
    "            lastMatch = match;\r\n"
    "        }"
)
new_loop = (
    "        const texto = pageTexts[i] || '';\r\n"
    "        let nomeDetectado = extrairNomeDaPagina(texto);\r\n"
    "        const cpfDetectado = extrairCpfDaPagina(texto);\r\n"
    "        // 1. Tenta match por CPF (mais confiável — imune a mudança de nome)\r\n"
    "        let match = cpfDetectado ? buscarColaboradorPorCpf(cpfDetectado, colaboradores) : null;\r\n"
    "        // 2. Se não achou por CPF, tenta por nome\r\n"
    "        if (!match) match = nomeDetectado ? buscarColaboradorPorNome(nomeDetectado, colaboradores) : null;\r\n"
    "        \r\n"
    "        if (!nomeDetectado && !cpfDetectado && lastNomeDetectado) {\r\n"
    "            nomeDetectado = lastNomeDetectado;\r\n"
    "            match = lastMatch;\r\n"
    "        } else if (nomeDetectado || cpfDetectado) {\r\n"
    "            lastNomeDetectado = nomeDetectado;\r\n"
    "            lastMatch = match;\r\n"
    "        }"
)
if old_loop in content:
    content = content.replace(old_loop, new_loop, 1)
    print('OK: loop de páginas atualizado com match por CPF')
else:
    # Tentar com LF
    old_loop_lf = old_loop.replace('\r\n', '\n')
    new_loop_lf = new_loop.replace('\r\n', '\n')
    if old_loop_lf in content:
        content = content.replace(old_loop_lf, new_loop_lf, 1)
        print('OK: loop de páginas atualizado com match por CPF (LF)')
    else:
        print('FALHA: loop de páginas não encontrado — tentando regex')
        # Fallback regex
        pattern = r"(const texto = pageTexts\[i\] \|\| '';[\r\n]+\s+let nomeDetectado = extrairNomeDaPagina\(texto\);[\r\n]+\s+let match = nomeDetectado \? buscarColaboradorPorNome\(nomeDetectado, colaboradores\) : null;[\r\n]+\s+\r?\n\s+if \(!nomeDetectado && lastNomeDetectado\) \{[\r\n]+\s+nomeDetectado = lastNomeDetectado;[\r\n]+\s+match = lastMatch;[\r\n]+\s+\} else if \(nomeDetectado\) \{[\r\n]+\s+lastNomeDetectado = nomeDetectado;[\r\n]+\s+lastMatch = match;[\r\n]+\s+\})"
        replacement = (
            "const texto = pageTexts[i] || '';\r\n"
            "        let nomeDetectado = extrairNomeDaPagina(texto);\r\n"
            "        const cpfDetectado = extrairCpfDaPagina(texto);\r\n"
            "        // 1. Tenta match por CPF (mais confiável — imune a mudança de nome)\r\n"
            "        let match = cpfDetectado ? buscarColaboradorPorCpf(cpfDetectado, colaboradores) : null;\r\n"
            "        // 2. Se não achou por CPF, tenta por nome\r\n"
            "        if (!match) match = nomeDetectado ? buscarColaboradorPorNome(nomeDetectado, colaboradores) : null;\r\n"
            "        \r\n"
            "        if (!nomeDetectado && !cpfDetectado && lastNomeDetectado) {\r\n"
            "            nomeDetectado = lastNomeDetectado;\r\n"
            "            match = lastMatch;\r\n"
            "        } else if (nomeDetectado || cpfDetectado) {\r\n"
            "            lastNomeDetectado = nomeDetectado;\r\n"
            "            lastMatch = match;\r\n"
            "        }"
        )
        new_content = re.sub(pattern, replacement, content, count=1)
        if new_content != content:
            content = new_content
            print('OK: loop de páginas atualizado via regex')
        else:
            print('FALHA total: loop de páginas não encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 5. Adicionar cpfDetectado ao resultado.push()
# ─────────────────────────────────────────────────────────────────────────────
old_push = (
    "            nomeDetectado:    nomeDetectado || null,\r\n"
    "            colaborador_id:   match?.colaborador?.id || null,"
)
new_push = (
    "            nomeDetectado:    nomeDetectado || null,\r\n"
    "            cpfDetectado:     cpfDetectado || null,\r\n"
    "            colaborador_id:   match?.colaborador?.id || null,"
)
if old_push in content:
    content = content.replace(old_push, new_push, 1)
    print('OK: cpfDetectado adicionado ao resultado.push()')
else:
    old_push_lf = old_push.replace('\r\n', '\n')
    new_push_lf = new_push.replace('\r\n', '\n')
    if old_push_lf in content:
        content = content.replace(old_push_lf, new_push_lf, 1)
        print('OK: cpfDetectado adicionado ao resultado.push() (LF)')
    else:
        print('FALHA: resultado.push() não encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# 6. Adicionar processarPDFEmprestimos() e atualizar module.exports
# ─────────────────────────────────────────────────────────────────────────────
new_fn_emprestimos = """
/**
 * Processa o PDF de Empréstimos/Comunicados identificando colaboradores por CPF.
 * Retorna array [{colaborador_id, colaborador_nome, pagina, cpf}]
 * apenas para as páginas que tiverem CPF com match no banco.
 */
async function processarPDFEmprestimos(bufferPDF) {
    console.log('[EMPRESTIMOS] Iniciando processamento por CPF...');
    const pageTexts = await extrairTextosPorPagina(bufferPDF);

    const colaboradores = await new Promise((resolve, reject) => {
        db.all(
            `SELECT c.id, c.nome_completo, c.cpf FROM colaboradores c
             WHERE c.status != 'Desligado' OR c.status IS NULL`,
            [],
            (err, rows) => err ? reject(err) : resolve(rows || [])
        );
    });

    const resultado = [];
    for (let i = 0; i < pageTexts.length; i++) {
        const texto = pageTexts[i] || '';
        const cpf = extrairCpfDaPagina(texto);
        if (!cpf) {
            console.log(`[EMPRESTIMOS] Pág ${i + 1}: nenhum CPF encontrado`);
            continue;
        }
        const match = buscarColaboradorPorCpf(cpf, colaboradores);
        if (match) {
            resultado.push({
                colaborador_id:   match.colaborador.id,
                colaborador_nome: match.colaborador.nome_completo,
                pagina:           i + 1,
                cpf,
            });
            console.log(`[EMPRESTIMOS] Pág ${i + 1}: CPF ${cpf} → ${match.colaborador.nome_completo}`);
        } else {
            console.log(`[EMPRESTIMOS] Pág ${i + 1}: CPF ${cpf} → sem match no banco`);
        }
    }
    console.log(`[EMPRESTIMOS] Total encontrado: ${resultado.length} colaborador(es)`);
    return resultado;
}

"""

old_exports = "module.exports = {\n    processarPDF,"
new_exports = "module.exports = {\n    processarPDF,\n    processarPDFEmprestimos,"
if new_fn_emprestimos.replace('\r\n','\n') + old_exports in content.replace('\r\n','\n'):
    print('WARN: processarPDFEmprestimos já existe')
elif old_exports in content:
    content = content.replace(old_exports, new_fn_emprestimos + old_exports, 1)
    # Atualizar exports
    content = content.replace(
        "module.exports = {\n    processarPDF,",
        "module.exports = {\n    processarPDF,\n    processarPDFEmprestimos,",
        1
    )
    print('OK: processarPDFEmprestimos adicionada e exportada')
else:
    print('FALHA: module.exports não encontrado')

# ─────────────────────────────────────────────────────────────────────────────
# Salvar
# ─────────────────────────────────────────────────────────────────────────────
with open('backend/pagamentos_massa.js', 'wb') as f:
    f.write(content.encode('utf-8'))
print('Arquivo pagamentos_massa.js salvo.')
