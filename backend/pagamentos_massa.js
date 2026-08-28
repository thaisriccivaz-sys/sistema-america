/**
 * pagamentos_massa.js
 *
 * Módulo para processamento e envio em massa de documentos de pagamento.
 * Funcionalidade:
 *  1. Recebe um PDF consolidado (ex: holerite adiantamento com N colaboradores)
 *  2. Extrai 1 página por colaborador e identifica o nome automaticamente
 *  3. Faz o match com os colaboradores cadastrados no banco
 *  4. Gera PDFs individuais por colaborador
 *  5. Envia para assinatura via Assinafy (mesmo fluxo de documentos existente)
 *
 * IMPORTANTE: usa o pacote "pdfreader" (CJS puro) em vez de pdf-parse / pdfjs-dist,
 * pois esses últimos travam indefinidamente no servidor Linux (Render) com certos PDFs.
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const { PdfReader } = require('pdfreader');
const { PDFDocument } = require('pdf-lib');
const db            = require('./database');

// Normaliza string para comparação: remove acentos, caixa alta, espaços extras
function normalizarNome(str) {
    if (!str) return '';
    return str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
}

// Extrai nome do colaborador do texto de uma página do PDF
// O PDF de adiantamento contém "Código NOME Nome do Funcionário" na mesma linha
function extrairNomeDaPagina(texto) {
    if (!texto) return null;

    const padroes = [
        // "Código ABNER ABRAHÃO Nome do Funcionário" — padrão principal dos holerites
        /C[óo]digo\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ][A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ \-']{2,60})\s+Nome\s+do\s+Funcion[aá]rio/i,
        // "Nome do Funcionário\nNOME AQUI"
        /Nome\s+do\s+Funcion[aá]rio\s*[\n\r]+\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ][A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ \-']{2,60})/i,
        // "Nome do Funcionário NOME AQUI" (sem quebra)
        /Nome\s+do\s+Funcion[aá]rio\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ][A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ \-']{2,60})/i,
        // Fallback: texto colado antes de CBO ou Código
        /Funcion[aá]rio\s*([A-Z][A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ \-']{2,60})(?:\s*CBO|\s*C[óo]digo|\s*\d)/i,
    ];

    for (const regex of padroes) {
        const match = texto.match(regex);
        if (match && match[1]) {
            const nome = match[1].trim().replace(/\s+/g, ' ');
            if (nome.length >= 4 && nome.includes(' ')) {
                return nome;
            }
        }
    }

    // Fallback: procura linha em maiúsculas após "Funcionário"
    const linhas = texto.split('\n');
    for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (/Funcion[aá]rio/i.test(linha)) {
            for (let j = i + 1; j <= i + 5 && j < linhas.length; j++) {
                const candidato = linhas[j].trim();
                if (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ][A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ \-']{3,}$/.test(candidato) && candidato.includes(' ')) {
                    return candidato;
                }
            }
        }
    }
    return null;
}


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

// Busca colaborador pelo nome no banco (match normalizado)
function buscarColaboradorPorNome(nomeExtraido, todosColaboradores) {
    if (!nomeExtraido) return null;
    const nomeNorm = normalizarNome(nomeExtraido);

    // Match exato
    let encontrado = todosColaboradores.find(c =>
        normalizarNome(c.nome_completo) === nomeNorm
    );
    if (encontrado) return { colaborador: encontrado, confianca: 'exato' };

    // Match parcial: nome normalizado contém ou está contido no cadastrado
    encontrado = todosColaboradores.find(c => {
        const nc = normalizarNome(c.nome_completo);
        return nc.includes(nomeNorm) || nomeNorm.includes(nc);
    });
    if (encontrado) return { colaborador: encontrado, confianca: 'parcial' };

    // Match por primeiro e último nome
    const partes = nomeNorm.split(' ').filter(Boolean);
    if (partes.length >= 2) {
        const primeiro = partes[0];
        const ultimo = partes[partes.length - 1];
        encontrado = todosColaboradores.find(c => {
            const nc = normalizarNome(c.nome_completo);
            return nc.startsWith(primeiro) && nc.endsWith(ultimo);
        });
        if (encontrado) return { colaborador: encontrado, confianca: 'aproximado' };
    }

    return null;
}

// Busca colaborador pelo CPF (match exato nos digitos)
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

/**
 * Extrai texto por página do PDF usando o pacote pdfreader (CJS puro, sem bugs no Linux).
 * Retorna um array onde pageTexts[0] = texto da página 1, etc.
 */
function extrairTextosPorPagina(bufferPDF) {
    return new Promise((resolve, reject) => {
        const pageTexts = [];
        let currentPage = 0;

        new PdfReader().parseBuffer(bufferPDF, (err, item) => {
            if (err) {
                return reject(new Error('Falha na leitura do PDF: ' + err.message));
            }
            if (!item) {
                // Fim do arquivo
                return resolve(pageTexts);
            }
            if (item.page) {
                currentPage = item.page;
                pageTexts[currentPage - 1] = ''; // inicializa página (índice 0-based)
            } else if (item.text && currentPage > 0) {
                pageTexts[currentPage - 1] += item.text + ' ';
            }
        });
    });
}

/**
 * Processa o PDF consolidado:
 * - Extrai texto de cada página
 * - Detecta nome do colaborador
 * - Faz match com banco de dados
 * Retorna { totalPaginas, resultado[], totalColaboradores }
 */
async function processarPDF(bufferPDF, tipoDocumento) {
    console.log('[PAGAMENTOS-MASSA] Iniciando extração de texto via pdfreader...');
    const t0 = Date.now();

    let pageTexts;
    try {
        pageTexts = await extrairTextosPorPagina(bufferPDF);
    } catch (e) {
        console.error('[PAGAMENTOS-MASSA] Falha ao extrair texto:', e.message);
        throw e;
    }

    const totalPaginas = pageTexts.length;
    console.log(`[PAGAMENTOS-MASSA] Extração concluída em ${Date.now() - t0}ms. Total de páginas: ${totalPaginas}`);

    if (totalPaginas === 0) {
        throw new Error('O PDF não contém páginas legíveis. Verifique se o arquivo está correto.');
    }

    // Buscar todos colaboradores ativos do banco
    console.log('[PAGAMENTOS-MASSA] Buscando colaboradores no banco...');
    const colaboradores = await new Promise((resolve, reject) => {
        db.all(
            `SELECT c.id, c.nome_completo, c.email, c.email_corporativo, c.departamento, c.cargo,
                    d.tipo AS setor
             FROM colaboradores c
             LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento))
             WHERE c.status != 'Desligado' OR c.status IS NULL
             ORDER BY c.nome_completo`,
            [],
            (err, rows) => err ? reject(err) : resolve(rows || [])
        );
    });

    // Processar cada página — match por NOME (holerites não contêm CPF)
    let lastMatch = null;
    let lastNomeDetectado = null;
    const resultado = [];
    for (let i = 0; i < totalPaginas; i++) {
        const texto = pageTexts[i] || '';
        let nomeDetectado = extrairNomeDaPagina(texto);
        let match = nomeDetectado ? buscarColaboradorPorNome(nomeDetectado, colaboradores) : null;
        
        if (!nomeDetectado && lastNomeDetectado) {
            nomeDetectado = lastNomeDetectado;
            match = lastMatch;
        } else if (nomeDetectado) {
            lastNomeDetectado = nomeDetectado;
            lastMatch = match;
        }

        resultado.push({
            pagina:           i + 1,
            nomeDetectado:    nomeDetectado || null,
            colaborador_id:   match?.colaborador?.id || null,
            colaborador_nome: match?.colaborador?.nome_completo || null,
            colaborador_email: match?.colaborador?.email || match?.colaborador?.email_corporativo || null,
            departamento:     match?.colaborador?.departamento || null,
            cargo:            match?.colaborador?.cargo || null,
            setor:            match?.colaborador?.setor || null, // 'Administrativo' ou 'Operacional'
            confianca:        match?.confianca || null, // 'exato', 'parcial', 'aproximado', null
        });
    }

    return { totalPaginas, resultado, totalColaboradores: colaboradores.length };
}

/**
 * Extrai uma página específica do PDF e retorna como Buffer.
 * Se tipoRecorte = 'holerite' ou true, desenha um retângulo branco sobre a metade inferior.
 * Se tipoRecorte = 'vale', gera um PDF de 2 páginas (Página 1: recibo do topo, Página 2: recibo da base movido pro topo).
 */
async function extrairPagina(bufferPDF, numeroPaginaOuArray, tipoRecorte = false) {
    const { rgb } = require('pdf-lib');
    const pdfOriginal = await PDFDocument.load(bufferPDF);
    const novoPdf = await PDFDocument.create();

    let paginas = [];
    if (Array.isArray(numeroPaginaOuArray)) {
        paginas = numeroPaginaOuArray;
    } else if (typeof numeroPaginaOuArray === 'string') {
        paginas = numeroPaginaOuArray.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    } else {
        paginas = [parseInt(numeroPaginaOuArray, 10)];
    }

    for (const numeroPagina of paginas) {
        if (!numeroPagina) continue;
        const [paginaOriginal] = await novoPdf.copyPages(pdfOriginal, [numeroPagina - 1]); // 0-indexed
        const { width, height } = paginaOriginal.getSize();
        const metade = height / 2;

        if (tipoRecorte === 'vale') {
            const page1 = novoPdf.addPage([width, height]);
            const page2 = novoPdf.addPage([width, height]);
            
            const embeddedPage = await novoPdf.embedPage(paginaOriginal);
            
            // Page 1: Topo da página original
            page1.drawPage(embeddedPage, { x: 0, y: 0 });
            // Cobre a metade inferior
            page1.drawRectangle({ x: 0, y: 0, width, height: Math.floor(metade) + 12, color: rgb(1, 1, 1) });
            
            // Page 2: Base da página original movida para o topo
            page2.drawPage(embeddedPage, { x: 0, y: metade });
            // Cobre a nova metade inferior
            page2.drawRectangle({ x: 0, y: 0, width, height: Math.floor(metade) + 12, color: rgb(1, 1, 1) });
        } else {
            novoPdf.addPage(paginaOriginal);
            if (tipoRecorte === true || tipoRecorte === 'holerite') {
                const ultimaPagina = novoPdf.getPages()[novoPdf.getPages().length - 1];
                ultimaPagina.drawRectangle({
                    x: 0,
                    y: 0,
                    width: width,
                    height: Math.floor(metade) + 12, // +12 para cobrir a linha tracejada divisória
                    color: rgb(1, 1, 1),
                });
            }
        }
    }

    const pdfBytes = await novoPdf.save();
    return Buffer.from(pdfBytes);
}

/**
 * Salva o PDF individual no disco e insere no banco de dados
 * Retorna { docId, filePath }
 */
async function salvarDocumentoNoBanco({ colaboradorId, nomeColab, bufferPDF, nomeArquivo, tipoDocumento, ano, mes, basePath, temAdiantamento, temPagamento, temEmprestimo }) {
    const colabDir = path.join(basePath, `colab_${colaboradorId}`);
    if (!fs.existsSync(colabDir)) fs.mkdirSync(colabDir, { recursive: true });

    // ── UPSERT: remove documentos de Pagamentos existentes para o mesmo colaborador/mês/ano ──
    // Isso evita duplicatas quando o usuário clica em "Anexar em Massa" mais de uma vez.
    const mesPad    = String(mes || '').padStart(2, '0');
    const mesSemPad = String(parseInt(mes, 10) || '');
    const docsExistentes = await new Promise((resolve, reject) => {
        db.all(
            `SELECT id, file_path FROM documentos
             WHERE colaborador_id = ? AND tab_name = 'Pagamentos'
               AND (month = ? OR month = ?)
               AND year = ?`,
            [colaboradorId, mesPad, mesSemPad, ano],
            (err, rows) => err ? reject(err) : resolve(rows || [])
        );
    });

    for (const docAntigo of docsExistentes) {
        // Remove arquivo físico antigo (silenciosamente)
        try { if (docAntigo.file_path && fs.existsSync(docAntigo.file_path)) fs.unlinkSync(docAntigo.file_path); } catch(_) {}
        // Remove registro do banco
        await new Promise((resolve) => db.run('DELETE FROM documentos WHERE id = ?', [docAntigo.id], () => resolve()));
    }
    if (docsExistentes.length > 0) {
        console.log(`[PAGAMENTOS-MASSA] Substituindo ${docsExistentes.length} doc(s) existente(s) para colaborador ${colaboradorId} (${mes}/${ano})`);
    }
    // ────────────────────────────────────────────────────────────────────────────────────────────

    const filePath = path.join(colabDir, nomeArquivo);
    fs.writeFileSync(filePath, bufferPDF);

    const docId = await new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO documentos
             (colaborador_id, tab_name, document_type, file_path, file_name, year, month, assinafy_status, upload_date, tem_adiantamento, tem_pagamento, tem_emprestimo)
             VALUES (?, 'Pagamentos', ?, ?, ?, ?, ?, 'Pendente', datetime('now'), ?, ?, ?)`,
            [colaboradorId, tipoDocumento, filePath, nomeArquivo, ano, mes || '', temAdiantamento ? 1 : 0, temPagamento ? 1 : 0, temEmprestimo ? 1 : 0],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });

    return { docId, filePath };
}

/**
 * Processa o PDF de Empréstimos/Comunicados identificando colaboradores por CPF.
 * Cada página do PDF deve conter o CPF do colaborador (formato XXX.XXX.XXX-XX).
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

module.exports = {
    processarPDF,
    processarPDFEmprestimos,
    extrairPagina,
    salvarDocumentoNoBanco,
    normalizarNome,
};
