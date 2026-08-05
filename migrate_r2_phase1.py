"""
Migração do armazenamento de documentos para o Cloudflare R2.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []
successes = []

# ─── FASE 1: Safe migration - adicionar colunas r2_key e signed_r2_key ───
old_m = 'db.run("ALTER TABLE documentos ADD COLUMN signed_file_path TEXT", () => {});'
new_m = '''db.run("ALTER TABLE documentos ADD COLUMN signed_file_path TEXT", () => {});
    // Safe migration: R2 columns for colaborador documents
    db.run("ALTER TABLE documentos ADD COLUMN r2_key TEXT", () => {});
    db.run("ALTER TABLE documentos ADD COLUMN signed_r2_key TEXT", () => {});'''

if old_m in content:
    content = content.replace(old_m, new_m, 1)
    successes.append("FASE 1: Colunas r2_key e signed_r2_key adicionadas")
else:
    errors.append("FASE 1: Bloco de migration nao encontrado")

# ─── FASE 2: Adicionar funcao uploadDocToR2 antes de 'const app = express();' ───
r2_function = '''
/**
 * Faz upload de documento de colaborador para Cloudflare R2.
 * Estrutura: Colaboradores/{Nome}/{Tab}/{Ano?}/{Mes?}/{arquivo}
 */
async function uploadDocToR2(docId, bufferOverride) {
    const r2 = require('./utils/r2');
    if (!r2.isReady()) return null;
    try {
        const doc = await new Promise((resolve, reject) => {
            db.get(`SELECT d.*, c.nome_completo FROM documentos d
                    JOIN colaboradores c ON c.id = d.colaborador_id
                    WHERE d.id = ?`, [docId], (err, row) => { if (err) reject(err); else resolve(row); });
        });
        if (!doc) { console.error(`[R2-AUTO] Doc ${docId} nao encontrado`); return null; }

        let fileBuffer = bufferOverride || null;
        if (!fileBuffer) {
            const localPath = (doc.signed_file_path && require('fs').existsSync(doc.signed_file_path))
                ? doc.signed_file_path
                : (doc.file_path && require('fs').existsSync(doc.file_path) ? doc.file_path : null);
            if (!localPath) { console.warn(`[R2-AUTO] Arquivo nao encontrado no disco para doc ${docId}`); return null; }
            fileBuffer = require('fs').readFileSync(localPath);
        }

        const safeColab = (doc.nome_completo || 'DESCONHECIDO')
            .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
            .replace(/[^a-zA-Z0-9 ]/g, '').trim()
            .replace(/\\s+/g, '_').toUpperCase();

        const tabToR2Folder = (tab) => {
            const map = {
                'CONTRATOS': 'Contratos', 'CONTRATOS_AVULSOS': 'Contratos',
                'Atestados': 'Atestados', 'ASO': 'ASO', 'PAGAMENTOS': 'Pagamentos',
                'Advertências': 'Advertencias', 'EPI': 'EPI', 'Fotos': 'Fotos',
                'AVALIACAO': 'Avaliacao', 'FACULDADE': 'Faculdade',
                '01_FICHA_CADASTRAL': 'Ficha_Cadastral', 'Terapia': 'Terapia',
                'Treinamentos': 'Treinamentos', 'Boletim de ocorrência': 'Ocorrencias', 'Multas': 'Multas',
            };
            return map[tab] || (tab || 'Outros').replace(/[^a-zA-Z0-9_]/g, '_');
        };

        const tabFolder = tabToR2Folder(doc.tab_name);
        const isContrato = doc.tab_name === 'CONTRATOS' || doc.tab_name === 'CONTRATOS_AVULSOS';
        const isFicha = doc.tab_name === '01_FICHA_CADASTRAL';
        const docYear = doc.year && doc.year !== 'null' && doc.year !== '' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());

        let r2Dir = `Colaboradores/${safeColab}/${tabFolder}`;
        if (!isContrato && !isFicha) {
            r2Dir += `/${docYear}`;
            if (doc.tab_name === 'PAGAMENTOS' && doc.month && doc.month !== 'null' && doc.month !== '') {
                r2Dir += `/${getMesNome(doc.month)}`;
            }
        }

        const fileName = doc.file_name || `documento_${docId}.pdf`;
        const r2Key = `${r2Dir}/${fileName}`;
        const mimeType = fileName.toLowerCase().endsWith('.docx')
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : (fileName.toLowerCase().endsWith('.doc') ? 'application/msword' : 'application/pdf');

        await r2.uploadToR2(r2Key, fileBuffer, mimeType);
        console.log(`[R2-AUTO] OK: ${r2Key}`);
        await new Promise((resolve) => db.run('UPDATE documentos SET r2_key = ? WHERE id = ?', [r2Key, docId], resolve));
        return r2Key;
    } catch (e) {
        console.error(`[R2-AUTO ERROR] doc=${docId}:`, e.message);
        return null;
    }
}

/**
 * Faz upload do documento ASSINADO para R2 em subpasta Assinados.
 */
async function uploadSignedDocToR2(docId, signedBuffer) {
    const r2 = require('./utils/r2');
    if (!r2.isReady() || !signedBuffer) return null;
    try {
        const doc = await new Promise((resolve, reject) => {
            db.get(`SELECT d.*, c.nome_completo FROM documentos d
                    JOIN colaboradores c ON c.id = d.colaborador_id
                    WHERE d.id = ?`, [docId], (err, row) => { if (err) reject(err); else resolve(row); });
        });
        if (!doc) return null;

        const safeColab = (doc.nome_completo || 'DESCONHECIDO')
            .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
            .replace(/[^a-zA-Z0-9 ]/g, '').trim()
            .replace(/\\s+/g, '_').toUpperCase();

        const tabToR2Folder = (tab) => {
            const map = {
                'CONTRATOS': 'Contratos', 'CONTRATOS_AVULSOS': 'Contratos',
                'Atestados': 'Atestados', 'ASO': 'ASO', 'PAGAMENTOS': 'Pagamentos',
                'Advertências': 'Advertencias', 'EPI': 'EPI', 'Fotos': 'Fotos',
                'AVALIACAO': 'Avaliacao', 'FACULDADE': 'Faculdade',
                '01_FICHA_CADASTRAL': 'Ficha_Cadastral', 'Terapia': 'Terapia',
                'Treinamentos': 'Treinamentos', 'Boletim de ocorrência': 'Ocorrencias', 'Multas': 'Multas',
            };
            return map[tab] || (tab || 'Outros').replace(/[^a-zA-Z0-9_]/g, '_');
        };

        const tabFolder = tabToR2Folder(doc.tab_name);
        const isContrato = doc.tab_name === 'CONTRATOS' || doc.tab_name === 'CONTRATOS_AVULSOS';
        const isFicha = doc.tab_name === '01_FICHA_CADASTRAL';
        const docYear = doc.year && doc.year !== 'null' && doc.year !== '' ? String(doc.year).replace(/[^0-9]/g, '') : String(new Date().getFullYear());

        let r2Dir = `Colaboradores/${safeColab}/${tabFolder}`;
        if (!isContrato && !isFicha) {
            r2Dir += `/${docYear}`;
            if (doc.tab_name === 'PAGAMENTOS' && doc.month && doc.month !== 'null' && doc.month !== '') {
                r2Dir += `/${getMesNome(doc.month)}`;
            }
        }
        r2Dir += '/Assinados';

        const baseName = (doc.file_name || `documento_${docId}.pdf`).replace(/\\.pdf$/i, '');
        const signedKey = `${r2Dir}/ASSINADO_${baseName}.pdf`;

        await r2.uploadToR2(signedKey, signedBuffer, 'application/pdf');
        console.log(`[R2-SIGNED] OK: ${signedKey}`);
        await new Promise((resolve) => db.run('UPDATE documentos SET signed_r2_key = ? WHERE id = ?', [signedKey, docId], resolve));
        return signedKey;
    } catch (e) {
        console.error(`[R2-SIGNED ERROR] doc=${docId}:`, e.message);
        return null;
    }
}

'''

marker = 'const app = express();'
if marker in content:
    content = content.replace(marker, r2_function + marker, 1)
    successes.append("FASE 2: Funcoes uploadDocToR2 e uploadSignedDocToR2 adicionadas")
else:
    errors.append("FASE 2: Marcador 'const app = express();' nao encontrado")

# ─── FASE 3: Adicionar multerMemoriaDoc ───
old_upload = 'const upload = multer({ storage: storage, fileFilter: uploadFileFilter, limits: { fileSize: 30 * 1024 * 1024 } }); // Limite de 30MB por arquivo'
new_upload = '''const upload = multer({ storage: storage, fileFilter: uploadFileFilter, limits: { fileSize: 30 * 1024 * 1024 } }); // Limite de 30MB por arquivo
// Upload em memoria para documentos do prontuario (envia direto para R2)
const uploadMemoriaDoc = multer({ storage: multer.memoryStorage(), fileFilter: uploadFileFilter, limits: { fileSize: 30 * 1024 * 1024 } });'''

if old_upload in content:
    content = content.replace(old_upload, new_upload, 1)
    successes.append("FASE 3: uploadMemoriaDoc criado")
else:
    errors.append("FASE 3: Linha upload nao encontrada")

# ─── FASE 4a: Trocar upload.single para uploadMemoriaDoc.single no POST /api/documentos ───
old_post = "app.post('/api/documentos', authenticateToken, upload.single('file'), async (req, res) => {"
new_post = "app.post('/api/documentos', authenticateToken, uploadMemoriaDoc.single('file'), async (req, res) => {"

if old_post in content:
    content = content.replace(old_post, new_post, 1)
    successes.append("FASE 4a: Handler de upload trocado para uploadMemoriaDoc")
else:
    errors.append("FASE 4a: Handler POST /api/documentos nao encontrado")

# ─── FASE 4b: Atualizar saveAuditLocal para usar buffer ───
old_audit_read = '                const fileBuffer = require(\'fs\').readFileSync(req.file.path);'
new_audit_read = '                const fileBuffer = req.file.buffer || (req.file.path ? require(\'fs\').readFileSync(req.file.path) : Buffer.alloc(0));'

if old_audit_read in content:
    content = content.replace(old_audit_read, new_audit_read, 1)
    successes.append("FASE 4b: saveAuditLocal atualizado para buffer")
else:
    errors.append("FASE 4b: Linha readFileSync no saveAuditLocal nao encontrada")

# ─── FASE 4c: Atualizar bloco inicial de file_path para usar buffer em memoria ───
old_file_path = """    const file_path = req.file.path;
    let file_name = req.file.originalname;
    try { file_name = Buffer.from(file_name, 'latin1').toString('utf8'); } catch (e) { }

    const isBO = ((document_type || '').toUpperCase().includes('BO_') && (tab_name || '').toUpperCase().includes('SINISTRO')) ||
                 ((tab_name || '').toUpperCase().includes('BOLETIM'));
    if (isBO && file_path.toLowerCase().endsWith('.pdf')) {
        try {
            const { censorBOPdf } = require('./censorPDF.js');
            await censorBOPdf(file_path, file_path);
        } catch (e) {
            console.error('[CENSOR] Falha ao tentar censurar BO:', e.message);
        }
    }"""

new_file_path = """    // Arquivo recebido em memoria (buffer) — enviado para R2 e OneDrive sem tocar o disco
    let processedBuffer = req.file.buffer;
    const file_path = req.file.path || '';
    let file_name = req.file.originalname;
    try { file_name = Buffer.from(file_name, 'latin1').toString('utf8'); } catch (e) { }

    const isBO = ((document_type || '').toUpperCase().includes('BO_') && (tab_name || '').toUpperCase().includes('SINISTRO')) ||
                 ((tab_name || '').toUpperCase().includes('BOLETIM'));
    if (isBO && (file_name || '').toLowerCase().endsWith('.pdf')) {
        try {
            const { censorBOPdf } = require('./censorPDF.js');
            const os = require('os');
            const tmpPath = require('path').join(os.tmpdir(), `bo_censor_${Date.now()}.pdf`);
            require('fs').writeFileSync(tmpPath, processedBuffer);
            await censorBOPdf(tmpPath, tmpPath);
            processedBuffer = require('fs').readFileSync(tmpPath);
            try { require('fs').unlinkSync(tmpPath); } catch(e2) {}
        } catch (e) {
            console.error('[CENSOR] Falha ao tentar censurar BO:', e.message);
        }
    }"""

if old_file_path in content:
    content = content.replace(old_file_path, new_file_path, 1)
    successes.append("FASE 4c: Bloco file_path atualizado para buffer em memoria")
else:
    errors.append("FASE 4c: Bloco file_path nao encontrado")

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("=== RESULTADO DA MIGRACAO FASE 1-4 ===")
for s in successes:
    print(f"  OK  {s}")
for e in errors:
    print(f"  ERRO {e}")
print(f"\n{len(successes)} sucesso(s), {len(errors)} erro(s)")
