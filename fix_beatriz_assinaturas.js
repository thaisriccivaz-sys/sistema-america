/**
 * SCRIPT: Reverter documentos da Beatriz marcados erroneamente como "Assinado"
 * 
 * Problema: O polling do backend interpretava 'completed' do Assinafy como "assinado",
 * mas 'completed' significa apenas que o envelope foi criado com sucesso (aguardando assinatura).
 * 
 * Este script:
 * 1. Lista todos os documentos da Beatriz marcados como 'Assinado'
 * 2. Identifica quais NÃO têm signed_file_path real (falsos positivos)
 * 3. Reseta esses documentos para 'Aguardando' (permite reenvio)
 * 
 * Uso: node fix_beatriz_assinaturas.js
 * (Executar na pasta raiz do projeto)
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'backend', 'data', 'erp.db');

console.log('📂 Abrindo banco de dados:', DB_PATH);
const db = new Database(DB_PATH, { readonly: false });

// ─── 1. BUSCAR a colaboradora ────────────────────────────────────────────────

const colab = db.prepare(
    `SELECT id, nome_completo FROM colaboradores WHERE nome_completo LIKE '%Beatriz%Batista%' LIMIT 1`
).get();

if (!colab) {
    console.error('❌ Colaboradora "Beatriz Batista" não encontrada no banco.');
    process.exit(1);
}

console.log(`\n✅ Colaboradora encontrada: ${colab.nome_completo} (ID: ${colab.id})`);

// ─── 2. LISTAR documentos na tabela "documentos" ─────────────────────────────

const docsAssinados = db.prepare(`
    SELECT id, document_type, tab_name, assinafy_id, assinafy_status, signed_file_path, assinafy_signed_at
    FROM documentos
    WHERE colaborador_id = ? AND assinafy_status = 'Assinado'
    ORDER BY id DESC
`).all(colab.id);

console.log(`\n📋 Documentos marcados como "Assinado" em [documentos]: ${docsAssinados.length}`);

const docsFalsoPositivo = docsAssinados.filter(d => !d.signed_file_path);
const docsReaisAssinados = docsAssinados.filter(d => d.signed_file_path);

console.log(`   → Com PDF assinado real (manter como Assinado): ${docsReaisAssinados.length}`);
console.log(`   → SEM PDF assinado (FALSO POSITIVO - serão revertidos): ${docsFalsoPositivo.length}`);

if (docsFalsoPositivo.length > 0) {
    console.log('\n📄 Documentos que serão revertidos [tabela documentos]:');
    docsFalsoPositivo.forEach(d => {
        console.log(`   ID ${d.id} | ${d.document_type} | tab: ${d.tab_name} | assinafy_id: ${d.assinafy_id}`);
    });
}

// ─── 3. LISTAR documentos na tabela "admissao_assinaturas" ───────────────────

const admAssAssinados = db.prepare(`
    SELECT id, nome_documento, assinafy_id, assinafy_status, signed_file_path, assinado_em, enviado_em
    FROM admissao_assinaturas
    WHERE colaborador_id = ? AND assinafy_status = 'Assinado'
    ORDER BY id DESC
`).all(colab.id);

console.log(`\n📋 Documentos marcados como "Assinado" em [admissao_assinaturas]: ${admAssAssinados.length}`);

const admFalsoPositivo = admAssAssinados.filter(d => !d.signed_file_path);
const admReaisAssinados = admAssAssinados.filter(d => d.signed_file_path);

console.log(`   → Com PDF assinado real (manter como Assinado): ${admReaisAssinados.length}`);
console.log(`   → SEM PDF assinado (FALSO POSITIVO - serão revertidos): ${admFalsoPositivo.length}`);

if (admFalsoPositivo.length > 0) {
    console.log('\n📄 Documentos que serão revertidos [tabela admissao_assinaturas]:');
    admFalsoPositivo.forEach(d => {
        console.log(`   ID ${d.id} | ${d.nome_documento} | assinafy_id: ${d.assinafy_id}`);
    });
}

// ─── 4. CONFIRMAR e EXECUTAR ─────────────────────────────────────────────────

const totalParaReverter = docsFalsoPositivo.length + admFalsoPositivo.length;
if (totalParaReverter === 0) {
    console.log('\n✅ Nenhum documento para reverter. Tudo parece correto.');
    db.close();
    process.exit(0);
}

console.log(`\n⚠️  Total de registros a serem revertidos: ${totalParaReverter}`);
console.log('   Status novo: "Aguardando"');
console.log('   assinafy_id: mantido (para referência)');
console.log('   assinado_em: limpo');
console.log('   signed_file_path: limpo');
console.log('\n🚀 Executando reset...\n');

// Reset na tabela "documentos"
if (docsFalsoPositivo.length > 0) {
    const stmtDocs = db.prepare(`
        UPDATE documentos
        SET assinafy_status = 'Aguardando',
            signed_file_path = NULL,
            assinafy_signed_at = NULL
        WHERE id = ?
    `);
    
    const resetDocs = db.transaction(() => {
        docsFalsoPositivo.forEach(d => {
            const changes = stmtDocs.run(d.id);
            console.log(`   ✅ [documentos] ID ${d.id} | "${d.document_type}" → Aguardando (rows: ${changes.changes})`);
        });
    });
    resetDocs();
}

// Reset na tabela "admissao_assinaturas"
if (admFalsoPositivo.length > 0) {
    const stmtAdm = db.prepare(`
        UPDATE admissao_assinaturas
        SET assinafy_status = 'Aguardando',
            signed_file_path = NULL,
            assinado_em = NULL
        WHERE id = ?
    `);
    
    const resetAdm = db.transaction(() => {
        admFalsoPositivo.forEach(d => {
            const changes = stmtAdm.run(d.id);
            console.log(`   ✅ [admissao_assinaturas] ID ${d.id} | "${d.nome_documento}" → Aguardando (rows: ${changes.changes})`);
        });
    });
    resetAdm();
}

// ─── 5. VERIFICAÇÃO FINAL ────────────────────────────────────────────────────

console.log('\n🔍 Verificação final — documentos da Beatriz após reset:\n');

const docsVerify = db.prepare(`
    SELECT id, document_type, assinafy_status, signed_file_path
    FROM documentos WHERE colaborador_id = ? AND assinafy_id IS NOT NULL
`).all(colab.id);

const admVerify = db.prepare(`
    SELECT id, nome_documento, assinafy_status, signed_file_path
    FROM admissao_assinaturas WHERE colaborador_id = ?
`).all(colab.id);

console.log('   [documentos]');
docsVerify.forEach(d => {
    const icon = d.assinafy_status === 'Assinado' && d.signed_file_path ? '✅' :
                 d.assinafy_status === 'Aguardando' ? '🔄' :
                 d.assinafy_status === 'Assinado' && !d.signed_file_path ? '⚠️' : '📋';
    console.log(`   ${icon} ID ${d.id} | ${d.document_type} | Status: ${d.assinafy_status} | PDF: ${d.signed_file_path ? 'SIM' : 'NÃO'}`);
});

console.log('\n   [admissao_assinaturas]');
admVerify.forEach(d => {
    const icon = d.assinafy_status === 'Assinado' && d.signed_file_path ? '✅' :
                 d.assinafy_status === 'Aguardando' ? '🔄' : '📋';
    console.log(`   ${icon} ID ${d.id} | ${d.nome_documento} | Status: ${d.assinafy_status} | PDF: ${d.signed_file_path ? 'SIM' : 'NÃO'}`);
});

db.close();
console.log('\n✅ Script concluído! Os documentos revertidos podem agora ser reenviados para assinatura.');
console.log('   → Acesse o prontuário da Beatriz → aba Contratos → botão "Reenviar Ass." em cada documento.');
