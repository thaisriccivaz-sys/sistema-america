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

    // Processar cada página
    const resultado = [];
    for (let i = 0; i < totalPaginas; i++) {
        const texto = pageTexts[i] || '';
        const nomeDetectado = extrairNomeDaPagina(texto);
        const match = nomeDetectado ? buscarColaboradorPorNome(nomeDetectado, colaboradores) : null;

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
 * Extrai uma página específica do PDF e retorna como Buffer
 */
async function extrairPagina(bufferPDF, numeroPagina) {
    const pdfOriginal = await PDFDocument.load(bufferPDF);
    const novoPdf = await PDFDocument.create();
    const [pagina] = await novoPdf.copyPages(pdfOriginal, [numeroPagina - 1]); // 0-indexed
    novoPdf.addPage(pagina);
    const pdfBytes = await novoPdf.save();
    return Buffer.from(pdfBytes);
}

/**
 * Salva o PDF individual no disco e insere no banco de dados
 * Retorna { docId, filePath }
 */
async function salvarDocumentoNoBanco({ colaboradorId, nomeColab, bufferPDF, nomeArquivo, tipoDocumento, ano, mes, basePath }) {
    const colabDir = path.join(basePath, `colab_${colaboradorId}`);
    if (!fs.existsSync(colabDir)) fs.mkdirSync(colabDir, { recursive: true });

    const filePath = path.join(colabDir, nomeArquivo);
    fs.writeFileSync(filePath, bufferPDF);

    const docId = await new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO documentos
             (colaborador_id, tab_name, document_type, file_path, file_name, year, month, assinafy_status, upload_date)
             VALUES (?, 'Pagamentos', ?, ?, ?, ?, ?, 'Pendente', datetime('now'))`,
            [colaboradorId, tipoDocumento, filePath, nomeArquivo, ano, mes || ''],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });

    return { docId, filePath };
}

module.exports = {
    processarPDF,
    extrairPagina,
    salvarDocumentoNoBanco,
    normalizarNome,
};
