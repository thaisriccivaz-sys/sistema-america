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
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
// pdf-parse tem bug em produção: tenta ler arquivo de teste na inicialização.
// Usar o caminho interno evita esse problema.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const { PDFDocument } = require('pdf-lib');
const db      = require('./database');

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
// O PDF de adiantamento contém "Nome do Funcionário" seguido do nome em maiúsculas
function extrairNomeDaPagina(texto) {
    if (!texto) return null;

    // Padrão 1: "Nome do Funcionário\nNOME AQUI" (texto extraído pode ter quebras)
    const padroes = [
        /Nome\s+do\s+Funcion[aá]rio\s*[\n\r]+\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ][A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ \-']{2,60})/i,
        /Nome\s+do\s+Funcion[aá]rio\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ][A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ \-']{2,60})/i,
        // Padrão alternativo: texto pode vir colado
        /Funcion[aá]rio\s*([A-Z][A-ZÁÀÂÃÉÊÍÓÔÕÚÙÜÇÑ \-']{2,60})(?:\s*CBO|\s*Código|\s*\d)/i,
    ];

    for (const regex of padroes) {
        const match = texto.match(regex);
        if (match && match[1]) {
            // Limpa espaços extras e valida que parece um nome
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
            // Pega próximas linhas até achar um nome válido
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

    // Match por primeiras palavras (primeiro e último nome)
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
 * Processa o PDF consolidado:
 * - Extrai texto de cada página
 * - Detecta nome do colaborador
 * - Faz match com banco de dados
 * Retorna array de { pagina, nomeDetectado, colaborador, confianca }
 */
async function processarPDF(bufferPDF) {
    // 1. Extrair texto por página
    const pageTexts = [];
    let totalPaginas = 0;

    try {
        // pdf-parse extrai texto de todas as páginas no campo .text
        // Precisamos do texto por página — usamos o render_page callback
        await pdfParse(bufferPDF, {
            pagerender: function(pageData) {
                return pageData.getTextContent().then(function(textContent) {
                    const texto = textContent.items.map(item => item.str).join(' ');
                    pageTexts.push(texto);
                    return texto;
                });
            }
        });
        totalPaginas = pageTexts.length;
    } catch (e) {
        // Fallback: extrai tudo como bloco único e divide por heurística
        const data = await pdfParse(bufferPDF);
        totalPaginas = data.numpages;
        // Divide o texto pelo número de páginas (aproximado)
        const chunkSize = Math.ceil(data.text.length / totalPaginas);
        for (let i = 0; i < totalPaginas; i++) {
            pageTexts.push(data.text.substring(i * chunkSize, (i + 1) * chunkSize));
        }
    }

    // 2. Buscar todos colaboradores ativos do banco
    const colaboradores = await new Promise((resolve, reject) => {
        db.all(
            `SELECT id, nome_completo, email, email_corporativo, departamento, cargo, setor
             FROM colaboradores
             WHERE status != 'Desligado' OR status IS NULL
             ORDER BY nome_completo`,
            [],
            (err, rows) => err ? reject(err) : resolve(rows || [])
        );
    });

    // 3. Processar cada página
    const resultado = [];
    for (let i = 0; i < totalPaginas; i++) {
        const texto = pageTexts[i] || '';
        const nomeDetectado = extrairNomeDaPagina(texto);
        const match = nomeDetectado ? buscarColaboradorPorNome(nomeDetectado, colaboradores) : null;

        resultado.push({
            pagina: i + 1,               // número da página (1-indexed)
            nomeDetectado: nomeDetectado || null,
            colaborador_id: match?.colaborador?.id || null,
            colaborador_nome: match?.colaborador?.nome_completo || null,
            colaborador_email: match?.colaborador?.email || match?.colaborador?.email_corporativo || null,
            departamento: match?.colaborador?.departamento || null,
            cargo: match?.colaborador?.cargo || null,
            setor: match?.colaborador?.setor || null,
            confianca: match?.confianca || null, // 'exato', 'parcial', 'aproximado', null
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
 * Retorna o docId inserido
 */
async function salvarDocumentoNoBanco({ colaboradorId, nomeColab, bufferPDF, nomeArquivo, tipoDocumento, ano, mes, basePath }) {
    // Diretório de destino
    const safeColab = nomeColab.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
    const colabDir = path.join(basePath, `colab_${colaboradorId}`);
    if (!fs.existsSync(colabDir)) fs.mkdirSync(colabDir, { recursive: true });

    const filePath = path.join(colabDir, nomeArquivo);
    fs.writeFileSync(filePath, bufferPDF);

    // Inserir no banco
    const docId = await new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO documentos
             (colaborador_id, tab_name, document_type, file_path, file_name, year, month, assinafy_status, created_at)
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
