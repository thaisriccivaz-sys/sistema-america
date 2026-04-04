/**
 * sign_pdf_pfx.js
 *
 * Assina PDFs com certificado digital .pfx (PKCS#12) da empresa
 * usando node-forge para extração das chaves e @signpdf/signpdf para
 * inserção da assinatura no padrão adobe/PKCS#7.
 *
 * Fluxo:
 *  1. Lê o .pfx do caminho configurado via env PFX_PATH / PFX_PASSWORD
 *  2. Adiciona um placeholder de assinatura no PDF com pdf-lib
 *  3. Assina com node-forge e insere o resultado
 *  4. Retorna o buffer do PDF assinado
 *
 * Referência de configuração no Render:
 *   PFX_PATH     = /var/lib/data/certificado.pfx
 *   PFX_PASSWORD = senha_do_certificado
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// ─── Verificar disponibilidade dos módulos ────────────────────────────────────
let signpdf, plainAddPlaceholder, P12Signer, forge;

try {
    const signpdfMod = require('@signpdf/signpdf');
    signpdf = signpdfMod.default || signpdfMod.signpdf || signpdfMod;
    const placeholderMod = require('@signpdf/placeholder-plain');
    plainAddPlaceholder = placeholderMod.default || placeholderMod.plainAddPlaceholder || placeholderMod;
    // @signpdf v3: P12Signer foi movido para pacote separado @signpdf/signer-p12
    try {
        const signerMod = require('@signpdf/signer-p12');
        P12Signer = signerMod.P12Signer || signerMod.default?.P12Signer || signerMod.default;
    } catch(e2) {
        console.warn('[SIGN-PDF] @signpdf/signer-p12 não encontrado, tentando @signpdf/signpdf:', e2.message);
        P12Signer = signpdfMod.P12Signer || signpdfMod.default?.P12Signer;
    }
} catch(e) {
    console.warn('[SIGN-PDF] @signpdf não encontrado:', e.message);
}

try {
    forge = require('node-forge');
} catch(e) {
    console.warn('[SIGN-PDF] node-forge não encontrado:', e.message);
}

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────
// As variáveis devem ser lidas dinamicamente, pois são atualizadas em tempo de execução pelo server.js
function getPfxPath() { return process.env.PFX_PATH || null; }
function getPfxPassword() { return process.env.PFX_PASSWORD || ''; }

/**
 * Verifica se a assinatura digital está configurada e disponível.
 * @returns {{ disponivel: boolean, motivo?: string }}
 */
function verificarDisponibilidade() {
    if (!forge)          return { disponivel: false, motivo: 'node-forge não instalado' };
    if (!signpdf)        return { disponivel: false, motivo: '@signpdf/signpdf não instalado' };
    if (!plainAddPlaceholder) return { disponivel: false, motivo: '@signpdf/placeholder-plain não instalado' };
    const currentPfxPath = getPfxPath();
    if (!currentPfxPath)       return { disponivel: false, motivo: 'PFX_PATH não configurado nas variáveis de ambiente' };
    if (!fs.existsSync(currentPfxPath)) return { disponivel: false, motivo: `Arquivo .pfx não encontrado: ${currentPfxPath}` };
    return { disponivel: true };
}

/**
 * Lê e valida o certificado .pfx.
 * @param {string} pfxPath  - caminho do arquivo .pfx
 * @param {string} password - senha do certificado
 * @returns {{ cert: string, key: string, certChain: string[] }}
 */
function lerCertificado(pfxPath, password) {
    const pfxBuffer = fs.readFileSync(pfxPath);
    const pfxB64    = pfxBuffer.toString('base64');
    const pfxAsn1   = forge.asn1.fromDer(forge.util.decode64(pfxB64));
    const p12       = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

    // Extrai chave privada
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag  = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (!keyBag) throw new Error('Chave privada não encontrada no .pfx');

    // Extrai certificado
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag  = certBags[forge.pki.oids.certBag]?.[0];
    if (!certBag) throw new Error('Certificado não encontrado no .pfx');

    const certPem = forge.pki.certificateToPem(certBag.cert);
    const keyPem  = forge.pki.privateKeyToPem(keyBag.key);

    // Cadeia de certificados (intermediários)
    const allCerts = certBags[forge.pki.oids.certBag] || [];
    const certChain = allCerts.map(b => forge.pki.certificateToPem(b.cert));

    return { cert: certPem, key: keyPem, certChain };
}

/**
 * Obtém info básica do certificado sem assinar (para exibir na UI)
 * @param {string} pfxPath
 * @param {string} password
 */
function infosCertificado(pfxPath, password) {
    try {
        const { cert } = lerCertificado(pfxPath, password);
        const certObj  = forge.pki.certificateFromPem(cert);
        const subject  = certObj.subject.attributes.reduce((acc, a) => {
            acc[a.shortName || a.name] = a.value;
            return acc;
        }, {});
        return {
            ok: true,
            cn:         subject.CN || subject.commonName || '',
            org:        subject.O  || subject.organizationName || '',
            validade:   certObj.validity.notAfter.toLocaleDateString('pt-BR'),
            serial:     certObj.serialNumber,
        };
    } catch(e) {
        return { ok: false, erro: e.message };
    }
}

/**
 * Assina um PDF (Buffer) com o certificado .pfx configurado.
 *
 * @param {Buffer} pdfBuffer - PDF sem assinatura
 * @param {object} [opts]
 * @param {string} [opts.pfxPath]     - caminho customizado do .pfx (padrão: PFX_PATH)
 * @param {string} [opts.pfxPassword] - senha do .pfx (padrão: PFX_PASSWORD)
 * @param {string} [opts.motivo]      - motivo da assinatura (visível no PDF)
 * @param {string} [opts.local]       - local da assinatura
 * @param {string} [opts.nome]        - nome do assinante
 * @returns {Promise<Buffer>} PDF com assinatura digital embutida
 */
async function assinarPDF(pdfBuffer, opts = {}) {
    const pfxPath     = opts.pfxPath     || getPfxPath();
    const pfxPassword = opts.pfxPassword || getPfxPassword();
    const motivo      = opts.motivo      || 'Assinado eletronicamente pela empresa';
    const local       = opts.local       || 'Brasil';
    const nome        = opts.nome        || 'America Rental Equipamentos Ltda';

    if (!forge)       throw new Error('node-forge não está instalado (npm install node-forge)');
    if (!signpdf)     throw new Error('@signpdf/signpdf não está instalado');
    if (!plainAddPlaceholder) throw new Error('@signpdf/placeholder-plain não está instalado');
    if (!pfxPath)     throw new Error('PFX_PATH não configurado');
    if (!fs.existsSync(pfxPath)) throw new Error(`Arquivo .pfx não encontrado: ${pfxPath}`);

    console.log(`[SIGN-PDF] Iniciando assinatura com: ${pfxPath}`);

    // 1. Ler e validar certificado
    const { cert, key, certChain } = lerCertificado(pfxPath, pfxPassword);

    // 1b. INSERIR ESTAMPA VISUAL NO PDF (Para evidência no próprio assinador do candidato)
    // IMPORTANTE: salvar com useObjectStreams: false para manter formato xref legado que o @signpdf requer
    let finalBuffer = pdfBuffer;
    try {
        const certObj = forge.pki.certificateFromPem(cert);
        const subject = certObj.subject.attributes.reduce((acc, a) => { acc[a.shortName || a.name] = a.value; return acc; }, {});
        const subjectCN = subject.CN || subject.commonName || nome;
        const cnpjStr = subject.OU && typeof subject.OU === 'string' && subject.OU.match(/\d{14}/) ? `CNPJ: ${subject.OU.match(/\d{14}/)[0]}` : '';

        const pdfDoc = await PDFDocument.load(pdfBuffer, { updateMetadata: false, ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        
        const helvetica = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const helveticNorm = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Caixa no rodapé esquerdo
        lastPage.drawRectangle({
            x: 40, y: 30, width: 340, height: 65,
            borderColor: rgb(0.1, 0.4, 0.1),
            borderWidth: 1.5,
            color: rgb(0.95, 1, 0.95),
            opacity: 0.9
        });
        
        let yPos = 80;
        lastPage.drawText("Assinado Eletronicamente por Certificado Digital A1", { x: 48, y: yPos, size: 9, font: helvetica, color: rgb(0, 0.3, 0) });
        yPos -= 14;
        lastPage.drawText(`Empresa: ${subjectCN}`, { x: 48, y: yPos, size: 8, font: helveticNorm, color: rgb(0,0,0) });
        yPos -= 12;
        lastPage.drawText(`Data/Hora: ${new Date().toLocaleString('pt-BR')} ${cnpjStr ? ' | ' + cnpjStr : ''}`, { x: 48, y: yPos, size: 8, font: helveticNorm, color: rgb(0,0,0) });
        yPos -= 12;
        lastPage.drawText(`Validade Certificado: ${certObj.validity.notAfter.toLocaleDateString('pt-BR')}`, { x: 48, y: yPos, size: 8, font: helveticNorm, color: rgb(0.3, 0.3, 0.3) });

        // useObjectStreams: false → mantém tabela xref legada (PDF 1.4) que o @signpdf consegue parsear
        finalBuffer = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
        console.log('[SIGN-PDF] Estampa visual de assinatura inserida na última página.');
    } catch(e) {
        console.warn(`[SIGN-PDF] Não foi possível inserir estampa visual: ${e.message}. Tentando converter formato xref...`);
        // Mesmo sem a estampa, garantir formato legado para o @signpdf
        try {
            const pdfDoc2 = await PDFDocument.load(pdfBuffer, { updateMetadata: false, ignoreEncryption: true });
            finalBuffer = Buffer.from(await pdfDoc2.save({ useObjectStreams: false }));
        } catch(e2) {
            console.warn(`[SIGN-PDF] Fallback de conversão também falhou: ${e2.message}. Usando buffer original.`);
        }
    }


    // 2. Adicionar placeholder de assinatura ao PDF
    let pdfComPlaceholder;
    try {
        pdfComPlaceholder = plainAddPlaceholder({
            pdfBuffer: finalBuffer,
            reason:   motivo,
            location: local,
            name:     nome,
            contactInfo: 'rh@americarental.com.br',
            signingTime: new Date(),
        });
    } catch(e) {
        throw new Error(`Erro ao adicionar placeholder de assinatura: ${e.message}`);
    }

    // 3. Assinar com PKCS#7 via @signpdf/signer-p12
    let pdfAssinado;
    try {
        // Reconstrói o P12 a partir dos PEMs extraídos (mais confiável que usar o arquivo original)
        const p12buffer = forge.pkcs12.toPkcs12Asn1(
            forge.pki.privateKeyFromPem(key),
            certChain.map(c => forge.pki.certificateFromPem(c)),
            pfxPassword,
            { algorithm: '3des' }
        );
        const p12Der = forge.asn1.toDer(p12buffer).getBytes();
        const p12Buf = Buffer.from(p12Der, 'binary');

        if (!P12Signer) throw new Error('@signpdf/signer-p12 não está instalado. Execute: npm install @signpdf/signer-p12');

        const signer = new P12Signer(p12Buf, { passphrase: pfxPassword });
        pdfAssinado  = await signpdf.sign(pdfComPlaceholder, signer);
    } catch(e) {
        throw new Error(`Erro durante assinatura PKCS#7: ${e.message}`);
    }

    console.log(`[SIGN-PDF] ✅ PDF assinado com sucesso. Tamanho: ${pdfAssinado.length} bytes`);
    return Buffer.from(pdfAssinado);
}

/**
 * Assina um arquivo PDF em disco e salva o resultado.
 * @param {string} inputPath  - caminho do PDF original
 * @param {string} outputPath - caminho para salvar o PDF assinado (padrão: sobrescreve)
 * @param {object} [opts]     - mesmas opções de assinarPDF
 * @returns {Promise<string>} caminho do arquivo assinado
 */
async function assinarArquivoPDF(inputPath, outputPath, opts = {}) {
    if (!fs.existsSync(inputPath)) throw new Error(`PDF não encontrado: ${inputPath}`);
    const pdfBuffer    = fs.readFileSync(inputPath);
    const pdfAssinado  = await assinarPDF(pdfBuffer, opts);
    const destino      = outputPath || inputPath;
    fs.writeFileSync(destino, pdfAssinado);
    console.log(`[SIGN-PDF] Arquivo salvo: ${destino}`);
    return destino;
}

module.exports = {
    verificarDisponibilidade,
    infosCertificado,
    assinarPDF,
    assinarArquivoPDF,
    getPfxPath,
    getPfxPassword,
};
