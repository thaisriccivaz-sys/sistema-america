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

// ─── Verificar disponibilidade dos módulos ────────────────────────────────────
let signpdf, plainAddPlaceholder, forge;

try {
    const signpdfMod = require('@signpdf/signpdf');
    signpdf = signpdfMod.default || signpdfMod.signpdf || signpdfMod;
    const placeholderMod = require('@signpdf/placeholder-plain');
    plainAddPlaceholder = placeholderMod.default || placeholderMod.plainAddPlaceholder || placeholderMod;
} catch(e) {
    console.warn('[SIGN-PDF] @signpdf não encontrado:', e.message);
}

try {
    forge = require('node-forge');
} catch(e) {
    console.warn('[SIGN-PDF] node-forge não encontrado:', e.message);
}

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────
const PFX_PATH     = process.env.PFX_PATH     || null;
const PFX_PASSWORD = process.env.PFX_PASSWORD || '';

/**
 * Verifica se a assinatura digital está configurada e disponível.
 * @returns {{ disponivel: boolean, motivo?: string }}
 */
function verificarDisponibilidade() {
    if (!forge)          return { disponivel: false, motivo: 'node-forge não instalado' };
    if (!signpdf)        return { disponivel: false, motivo: '@signpdf/signpdf não instalado' };
    if (!plainAddPlaceholder) return { disponivel: false, motivo: '@signpdf/placeholder-plain não instalado' };
    if (!PFX_PATH)       return { disponivel: false, motivo: 'PFX_PATH não configurado nas variáveis de ambiente' };
    if (!fs.existsSync(PFX_PATH)) return { disponivel: false, motivo: `Arquivo .pfx não encontrado: ${PFX_PATH}` };
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
    const pfxPath     = opts.pfxPath     || PFX_PATH;
    const pfxPassword = opts.pfxPassword || PFX_PASSWORD;
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

    // 2. Adicionar placeholder de assinatura ao PDF
    let pdfComPlaceholder;
    try {
        pdfComPlaceholder = plainAddPlaceholder({
            pdfBuffer,
            reason:   motivo,
            location: local,
            name:     nome,
            contactInfo: 'rh@americarental.com.br',
            signingTime: new Date(),
        });
    } catch(e) {
        throw new Error(`Erro ao adicionar placeholder de assinatura: ${e.message}`);
    }

    // 3. Assinar com PKCS#7 (node-forge)
    let pdfAssinado;
    try {
        // Construir P12Buffer a partir dos PEMs para o @signpdf
        const p12buffer = forge.pkcs12.toPkcs12Asn1(
            forge.pki.privateKeyFromPem(key),
            certChain.map(c => forge.pki.certificateFromPem(c)),
            pfxPassword,
            { algorithm: '3des' }
        );
        const p12Der    = forge.asn1.toDer(p12buffer).getBytes();
        const p12Buf    = Buffer.from(p12Der, 'binary');

        const P12Signer = require('@signpdf/signpdf').P12Signer ||
                          require('@signpdf/signpdf').default?.P12Signer;

        if (P12Signer) {
            const signer = new P12Signer(p12Buf, { passphrase: pfxPassword });
            pdfAssinado  = await signpdf.sign(pdfComPlaceholder, signer);
        } else {
            // Fallback: assinar direto com o buffer P12
            const signpdfFn = typeof signpdf === 'function' ? signpdf : signpdf.sign;
            pdfAssinado = await signpdfFn(pdfComPlaceholder, p12Buf, { passphrase: pfxPassword });
        }
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
    PFX_PATH,
    PFX_PASSWORD,
};
