/**
 * Utilitário de integração com a API da CreditHub (BIPBOP / Harlan / IRQL)
 * Realiza Consulta Simples de CPF/CNPJ, gerencia token JWT (com auto-renovação via
 * CREDITHUB_USER / CREDITHUB_PASS / CREDITHUB_API_KEY), armazena cache de 90 dias
 * no SQLite e calcula a Nota de Risco de A a F.
 */

const https = require('https');
const IRQL_BASE_URL = 'https://irql.credithub.com.br/';
const DEFAULT_PUBLIC_API_KEY = '6057b71263c21e4ada266c9d4d4da613';
const FALLBACK_INITIAL_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIxNzkuMTc5LjExLjIwMyIsImF1ZCI6Imh0dHBzOi8vcGFpbmVsLmNyZWRpdGh1Yi5jb20uYnIiLCJpYXQiOjE3OTU0NTg2OTguOTQxNzcyLCJleHAiOjE3OTYwNjM0OTguOTQxNzcyLCJ1aWQiOiJmaW5hbmNlaXJvQGFtZXJpY2FyZW50YWwuY29tLmJyIn0.eAIW_5JodYQLTaJHBxbKmEpcoDmmloWO9l3Do9B7LQc';

async function _fetchIrqlText(url, options = {}) {
    try {
        const r = await fetch(url, options);
        return await r.text();
    } catch (err) {
        const causeCode = err && err.cause && err.cause.code ? String(err.cause.code) : '';
        if (!causeCode.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') && !String(err.message || '').includes('fetch failed')) {
            throw err;
        }
        // Fallback HTTPS caso o servidor IRQL não envie certificado intermediário na cadeia TLS do Node
        let bodyBuf = null;
        const headers = {};
        if (options.body) {
            const wrapped = new Response(options.body);
            const ct = wrapped.headers.get('content-type');
            if (ct) headers['Content-Type'] = ct;
            bodyBuf = Buffer.from(await wrapped.arrayBuffer());
            headers['Content-Length'] = bodyBuf.length;
        }
        return await new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: options.method || 'GET',
                headers,
                rejectUnauthorized: false
            }, (res) => {
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            });
            req.on('error', reject);
            if (bodyBuf) req.write(bodyBuf);
            req.end();
        });
    }
}

function _wrapDb(dbOrFn) {
    if (!dbOrFn) throw new Error('Instância do banco de dados não fornecida.');
    if (typeof dbOrFn.all === 'function' && typeof dbOrFn.get === 'function' && typeof dbOrFn.run === 'function') {
        return {
            dbAll: (sql, params = []) => new Promise((resolve, reject) => dbOrFn.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []))),
            dbGet: (sql, params = []) => new Promise((resolve, reject) => dbOrFn.get(sql, params, (err, row) => err ? reject(err) : resolve(row || null))),
            dbRun: (sql, params = []) => new Promise((resolve, reject) => dbOrFn.run(sql, params, function (err) { err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes }); }))
        };
    }
    if (typeof dbOrFn.dbAll === 'function') return dbOrFn;
    throw new Error('Objeto db inválido em credithub.js');
}

async function ensureTables(dbOrFn) {
    const { dbRun } = _wrapDb(dbOrFn);
    await dbRun(`
        CREATE TABLE IF NOT EXISTS credithub_consultas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            documento TEXT NOT NULL,
            razao_social TEXT,
            nome_fantasia TEXT,
            nota_score TEXT,
            pontos_score INTEGER,
            dados_json TEXT NOT NULL,
            consultado_em DATETIME DEFAULT (datetime('now')),
            consultado_por TEXT
        )
    `);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_credithub_doc_data ON credithub_consultas (documento, consultado_em DESC)`);
    await dbRun(`
        CREATE TABLE IF NOT EXISTS credithub_auth_cache (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            api_key TEXT,
            updated_at DATETIME DEFAULT (datetime('now'))
        )
    `);
}

function _isJwtExpired(token) {
    if (!token || typeof token !== 'string') return true;
    const parts = token.split('.');
    if (parts.length !== 3) return false; // chave estática
    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (!payload.exp) return false;
        const nowSec = Math.floor(Date.now() / 1000);
        return (payload.exp - 300) <= nowSec; // 5 min margem
    } catch (_) {
        return false;
    }
}

function _extractXmlTag(xml, tag) {
    if (!xml) return '';
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = String(xml).match(re);
    return m ? m[1].trim() : '';
}

function _extractXmlBlocks(xml, tag) {
    if (!xml) return [];
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    const out = [];
    let m;
    while ((m = re.exec(String(xml))) !== null) {
        out.push(m[1]);
    }
    return out;
}

function _decodeXmlEntities(str) {
    return String(str || '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

async function loginCreditHub(username, password) {
    if (!username || !password) return null;
    const fd = new FormData();
    fd.append('username', username.trim());
    fd.append('password', password);
    const url = `${IRQL_BASE_URL}?q=${encodeURIComponent("SELECT FROM 'HarlanAuthentication'.'Authenticate'")}&apiKey=${encodeURIComponent(DEFAULT_PUBLIC_API_KEY)}`;
    const xml = await _fetchIrqlText(url, { method: 'POST', body: fd });
    const apiKey = _extractXmlTag(xml, 'apiKey');
    if (!apiKey) {
        const exc = _extractXmlTag(xml, 'exception') || 'Falha ao autenticar na CreditHub';
        throw new Error(_decodeXmlEntities(exc));
    }
    return apiKey;
}

async function getValidApiKey(dbOrFn, forceRefresh = false) {
    const { dbGet, dbRun } = _wrapDb(dbOrFn);
    await ensureTables(dbOrFn);

    const envKey = (process.env.CREDITHUB_API_KEY || process.env.CREDITHUB_TOKEN || '').trim();
    const envUser = (process.env.CREDITHUB_USER || process.env.CREDITHUB_EMAIL || '').trim();
    const envPass = (process.env.CREDITHUB_PASS || process.env.CREDITHUB_PASSWORD || '').trim();

    if (!forceRefresh) {
        const row = await dbGet('SELECT api_key FROM credithub_auth_cache WHERE id = 1');
        if (row && row.api_key && !_isJwtExpired(row.api_key)) {
            return row.api_key;
        }
        if (envKey && !_isJwtExpired(envKey)) {
            await dbRun(`INSERT INTO credithub_auth_cache (id, api_key, updated_at) VALUES (1, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET api_key = excluded.api_key, updated_at = datetime('now')`, [envKey]);
            return envKey;
        }
    }

    if (envUser && envPass) {
        const newKey = await loginCreditHub(envUser, envPass);
        if (newKey) {
            await dbRun(`INSERT INTO credithub_auth_cache (id, api_key, updated_at) VALUES (1, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET api_key = excluded.api_key, updated_at = datetime('now')`, [newKey]);
            return newKey;
        }
    }

    if (envKey) return envKey;
    if (FALLBACK_INITIAL_API_KEY && !_isJwtExpired(FALLBACK_INITIAL_API_KEY)) {
        return FALLBACK_INITIAL_API_KEY;
    }
    throw new Error('Credenciais da CreditHub não configuradas no ambiente (CREDITHUB_API_KEY ou CREDITHUB_USER / CREDITHUB_PASS).');
}

async function _execPushJob(apiKey, query, params, labelPrefix, maxWaitMs = 20000) {
    const docClean = String(params.documento || '').replace(/\D/g, '');
    const label = `${labelPrefix}-${docClean}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fdCreate = new FormData();
    for (const [k, v] of Object.entries(params)) fdCreate.append(k, String(v));
    fdCreate.append('pushMaxVersion', '1');
    fdCreate.append('pushWebSocketDeliver', 'false');
    fdCreate.append('pushRecordRequest', 'true');
    fdCreate.append('pushExpireToday', 'true');
    fdCreate.append('pushQuery', query);
    fdCreate.append('pushLabel', label);

    const tCreate = await _fetchIrqlText(`${IRQL_BASE_URL}?apiKey=${encodeURIComponent(apiKey)}&q=${encodeURIComponent("INSERT INTO 'PUSH'.'JOB'")}`, {
        method: 'POST',
        body: fdCreate
    });
    if (tCreate.includes('<exception')) {
        const excMsg = _extractXmlTag(tCreate, 'exception');
        if (/token|autentica|apiKey|sessão|expirad/i.test(excMsg)) {
            const err = new Error(_decodeXmlEntities(excMsg));
            err.isAuthError = true;
            throw err;
        }
    }

    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        await new Promise(r => setTimeout(r, 750));
        const fdDoc = new FormData();
        fdDoc.append('label', label);
        const text = await _fetchIrqlText(`${IRQL_BASE_URL}?apiKey=${encodeURIComponent(apiKey)}&q=${encodeURIComponent("SELECT FROM 'PUSH'.'DOCUMENT'")}`, {
            method: 'POST',
            body: fdDoc
        });
        if (!text.includes('code="33"') && !text.includes('Não há um documento disponível')) {
            const fdDel = new FormData();
            fdDel.append('label', label);
            _fetchIrqlText(`${IRQL_BASE_URL}?apiKey=${encodeURIComponent(apiKey)}&q=${encodeURIComponent("DELETE FROM 'PUSH'.'JOB'")}`, { method: 'POST', body: fdDel }).catch(() => {});
            return text;
        }
    }
    return null;
}

function _parseFinderXml(xml) {
    if (!xml) return null;
    const cadBlock = _extractXmlTag(xml, 'cadastro') || xml;
    const cnpj = _decodeXmlEntities(_extractXmlTag(cadBlock, 'cnpj') || _extractXmlTag(cadBlock, 'cpf') || _extractXmlTag(xml, 'entrada'));
    const razaoSocial = _decodeXmlEntities(_extractXmlTag(cadBlock, 'razaoSocial') || _extractXmlTag(cadBlock, 'nome'));
    const nomeFantasia = _decodeXmlEntities(_extractXmlTag(cadBlock, 'nomeFantasia'));
    const situacao = _decodeXmlEntities(_extractXmlTag(cadBlock, 'receitaStatus') || _extractXmlTag(cadBlock, 'situacao'));
    const dataStatusReceita = _decodeXmlEntities(_extractXmlTag(cadBlock, 'dataReceitaStatus') || _extractXmlTag(cadBlock, 'statusData'));
    const tipoEmpresa = _decodeXmlEntities(_extractXmlTag(cadBlock, 'tipoEmpresa'));
    const naturezaJuridica = _decodeXmlEntities(_extractXmlTag(cadBlock, 'naturezaJuridica'));
    const dataAbertura = _decodeXmlEntities(_extractXmlTag(cadBlock, 'dataAbertura') || _extractXmlTag(cadBlock, 'dataNascimento'));
    const idadeEmpresa = _decodeXmlEntities(_extractXmlTag(cadBlock, 'idadeEmpresa') || _extractXmlTag(cadBlock, 'idade'));
    const porteEmpresa = _decodeXmlEntities(_extractXmlTag(cadBlock, 'porteEmpresa'));
    const cnae = _decodeXmlEntities(_extractXmlTag(cadBlock, 'cnae'));
    const cnaeDescricao = _decodeXmlEntities(_extractXmlTag(cadBlock, 'cnaeDescricao'));
    const capitalSocialRaw = _decodeXmlEntities(_extractXmlTag(cadBlock, 'capitalSocial'));
    const capitalSocial = parseFloat(String(capitalSocialRaw || '0').replace(',', '.')) || 0;

    // Quadro Societário
    const qsaOuter = _extractXmlTag(xml, 'quadroSocietario');
    const sociosBlocks = _extractXmlBlocks(qsaOuter, 'quadroSocietario');
    const socios = sociosBlocks.map(b => ({
        documento: _decodeXmlEntities(_extractXmlTag(b, 'documento')),
        nome: _decodeXmlEntities(_extractXmlTag(b, 'nome')),
        qualificacao: _decodeXmlEntities(_extractXmlTag(b, 'qualificacaoSocio')),
        dataEntrada: _decodeXmlEntities(_extractXmlTag(b, 'dataEntrada')),
        participacao: _decodeXmlEntities(_extractXmlTag(b, 'participacao'))
    })).filter(s => s.nome || s.documento);

    // Endereços
    const endOuter = _extractXmlTag(xml, 'enderecos');
    const endBlocks = _extractXmlBlocks(endOuter, 'enderecos');
    const enderecosSeen = new Set();
    const enderecos = [];
    for (const b of endBlocks) {
        const item = {
            tipo: _decodeXmlEntities(_extractXmlTag(b, 'tipoLogradouro')),
            logradouro: _decodeXmlEntities(_extractXmlTag(b, 'logradouro')),
            numero: _decodeXmlEntities(_extractXmlTag(b, 'numero')),
            complemento: _decodeXmlEntities(_extractXmlTag(b, 'complemento')),
            cep: _decodeXmlEntities(_extractXmlTag(b, 'cep')),
            bairro: _decodeXmlEntities(_extractXmlTag(b, 'bairro')),
            cidade: _decodeXmlEntities(_extractXmlTag(b, 'cidade')),
            uf: _decodeXmlEntities(_extractXmlTag(b, 'uf'))
        };
        const key = `${item.logradouro}|${item.numero}|${item.cep}`.toUpperCase();
        if ((item.logradouro || item.cep) && !enderecosSeen.has(key)) {
            enderecosSeen.add(key);
            enderecos.push(item);
        }
    }

    // Telefones e E-mails
    const telOuter = _extractXmlTag(xml, 'telefones');
    const fixosBlocks = _extractXmlBlocks(_extractXmlTag(telOuter, 'fixos'), 'fixos');
    const moveisBlocks = _extractXmlBlocks(_extractXmlTag(telOuter, 'moveis'), 'moveis');
    const telefonesSeen = new Set();
    const contatos = [];
    for (const b of [...fixosBlocks, ...moveisBlocks]) {
        const rawTel = _decodeXmlEntities(_extractXmlTag(b, 'telefone')).replace(/\D/g, '');
        if (rawTel && !telefonesSeen.has(rawTel)) {
            telefonesSeen.add(rawTel);
            let fmt = rawTel;
            if (rawTel.length === 10) fmt = `(${rawTel.slice(0, 2)}) ${rawTel.slice(2, 6)}-${rawTel.slice(6)}`;
            else if (rawTel.length === 11) fmt = `(${rawTel.slice(0, 2)}) ${rawTel.slice(2, 7)}-${rawTel.slice(7)}`;
            contatos.push({ tipo: 'TELEFONE', valor: fmt });
        }
    }

    const emailOuter = _extractXmlTag(xml, 'emails');
    const emailBlocks = _extractXmlBlocks(emailOuter, 'emails');
    const emailsSeen = new Set();
    for (const b of emailBlocks) {
        const em = _decodeXmlEntities(_extractXmlTag(b, 'email')).trim().toLowerCase();
        if (em && !emailsSeen.has(em)) {
            emailsSeen.add(em);
            contatos.push({ tipo: 'E-MAIL', valor: em });
        }
    }

    // Quem consultou (histórico e histórico mensal)
    const histOuter = _extractXmlTag(xml, 'historico');
    const consultaBlocks = _extractXmlBlocks(histOuter, 'consulta');
    const quemConsultou = consultaBlocks.map(b => ({
        usuario: _decodeXmlEntities(_extractXmlTag(b, 'usuario')),
        data: _decodeXmlEntities(_extractXmlTag(b, 'ultimaConsulta'))
    })).filter(c => c.usuario);

    const histMensalOuter = _extractXmlTag(xml, 'historico-mensal');
    const mesBlocks = _extractXmlBlocks(histMensalOuter, 'mes');
    const volumeMensal = mesBlocks.map(b => ({
        data: _decodeXmlEntities(_extractXmlTag(b, 'data')),
        ano: parseInt(_extractXmlTag(b, 'ano'), 10) || 0,
        mes: parseInt(_extractXmlTag(b, 'mes'), 10) || 0,
        quantidade: parseInt(_extractXmlTag(b, 'quantidade'), 10) || 0
    }));

    // Dívidas públicas embutidas no FINDER
    const divOuter = _extractXmlTag(xml, 'dividas');
    const qtdDividas = parseInt(_extractXmlTag(divOuter, 'quantidade_dividas'), 10) || 0;
    const valorDividas = parseFloat(_extractXmlTag(divOuter, 'valor_total_dividas')) || 0;

    return {
        identificacao: {
            cnpj,
            razaoSocial,
            nomeFantasia,
            situacao,
            dataStatusReceita,
            tipoEmpresa,
            naturezaJuridica,
            dataAbertura,
            idadeEmpresa,
            porteEmpresa,
            cnae,
            cnaeDescricao,
            capitalSocial
        },
        socios,
        enderecos,
        contatos,
        quemConsultou,
        volumeMensal,
        dividasFinder: { quantidade: qtdDividas, valorTotal: valorDividas }
    };
}

function _parseIeptbXml(xml) {
    if (!xml) return { situacao: 'NÃO CONSULTADO', quantidade: 0, valorTotal: 0, cartorios: [] };
    const situacao = _decodeXmlEntities(_extractXmlTag(xml, 'situacao')) || 'NÃO CONSTA';
    const registros = parseInt(_extractXmlTag(xml, 'registros'), 10) || 0;
    const rawStr = _decodeXmlEntities(_extractXmlTag(xml, 'raw'));
    let rawObj = null;
    try { if (rawStr) rawObj = JSON.parse(rawStr); } catch (_) {}

    let valorTotal = 0;
    const cartorios = [];
    const cartBlocks = _extractXmlBlocks(xml, 'cartorio');
    for (const cb of cartBlocks) {
        const nomeCart = _decodeXmlEntities(_extractXmlTag(cb, 'nome') || _extractXmlTag(cb, 'codigo_cartorio'));
        const cidade = _decodeXmlEntities(_extractXmlTag(cb, 'cidade') || _extractXmlTag(cb, 'municipio'));
        const uf = _decodeXmlEntities(_extractXmlTag(cb, 'uf'));
        const qtd = parseInt(_extractXmlTag(cb, 'protestos') || _extractXmlTag(cb, 'quantidade'), 10) || 0;
        const protBlocks = _extractXmlBlocks(cb, 'protesto');
        const protestos = protBlocks.map(pb => {
            const v = parseFloat(String(_extractXmlTag(pb, 'valor') || '0').replace(',', '.')) || 0;
            valorTotal += v;
            return {
                data: _decodeXmlEntities(_extractXmlTag(pb, 'dataProtesto') || _extractXmlTag(pb, 'data')),
                valor: v,
                apresentante: _decodeXmlEntities(_extractXmlTag(pb, 'nomeApresentante')),
                cedente: _decodeXmlEntities(_extractXmlTag(pb, 'nomeCedente'))
            };
        });
        cartorios.push({ cartorio: nomeCart, cidade, uf, quantidade: qtd || protestos.length, protestos });
    }

    const totalQtd = registros || (rawObj && Number(rawObj.qtdTitulos)) || cartorios.reduce((s, c) => s + (c.quantidade || 0), 0);
    return {
        situacao,
        consta: situacao.toUpperCase() === 'CONSTA' || totalQtd > 0,
        quantidade: totalQtd,
        valorTotal,
        cartorios
    };
}

function _parseJusbrJson(text, docConsultado) {
    if (!text) return { total: 0, valorTotalCausas: 0, poloPassivo: 0, poloAtivo: 0, outrosPolos: 0, processos: [] };
    let data = null;
    try { data = JSON.parse(text); } catch (_) {
        try { data = JSON.parse(JSON.parse(text)); } catch (_2) {}
    }
    if (!data || !Array.isArray(data.content)) {
        return { total: 0, valorTotalCausas: 0, poloPassivo: 0, poloAtivo: 0, outrosPolos: 0, processos: [] };
    }
    const docClean = String(docConsultado || '').replace(/\D/g, '');
    let valorTotalCausas = 0;
    let poloPassivo = 0;
    let poloAtivo = 0;
    let outrosPolos = 0;

    const processos = data.content.map(p => {
        const tram = (Array.isArray(p.tramitacoes) && p.tramitacoes[0]) || {};
        const valorAcao = parseFloat(tram.valorAcao) || 0;
        valorTotalCausas += valorAcao;
        const assuntos = Array.isArray(tram.assunto) ? tram.assunto.map(a => a.descricao).filter(Boolean).join(', ') : '';
        const classes = Array.isArray(tram.classe) ? tram.classe.map(c => c.descricao).filter(Boolean).join(', ') : '';
        const siglaTribunal = p.siglaTribunal || (tram.tribunal && tram.tribunal.sigla) || '';
        const ultimoMov = tram.ultimoMovimento ? {
            dataHora: tram.ultimoMovimento.dataHora,
            descricao: tram.ultimoMovimento.descricao
        } : null;

        let poloCliente = 'OUTRO';
        const envolvidos = (Array.isArray(tram.partes) ? tram.partes : []).map(pt => {
            const docsParte = Array.isArray(pt.documentosPrincipais) ? pt.documentosPrincipais.map(d => String(d.numero || '').replace(/\D/g, '')) : [];
            const isCliente = docClean && docsParte.includes(docClean);
            const poloUpper = String(pt.polo || '').toUpperCase();
            if (isCliente) {
                if (poloUpper.includes('PASSIVO')) poloCliente = 'PASSIVO';
                else if (poloUpper.includes('ATIVO')) poloCliente = 'ATIVO';
            }
            const advogados = Array.isArray(pt.representantes)
                ? pt.representantes.map(rep => rep.nome).filter(Boolean)
                : [];
            return {
                nome: pt.nome || '',
                polo: poloUpper === 'ATIVO' ? 'Ativo' : poloUpper === 'PASSIVO' ? 'Passivo' : 'Não Informado',
                tipoParte: pt.tipoParte || '',
                isCliente,
                advogados
            };
        });

        if (poloCliente === 'PASSIVO') poloPassivo++;
        else if (poloCliente === 'ATIVO') poloAtivo++;
        else outrosPolos++;

        let uf = '';
        if (siglaTribunal.endsWith('SP')) uf = 'SP';
        else if (siglaTribunal.length >= 4 && siglaTribunal.startsWith('TJ')) uf = siglaTribunal.slice(2);

        return {
            numeroProcesso: p.numeroProcesso || '',
            situacaoProcessual: tram.situacaoProcessual || 'Situação não confirmada',
            evidenciaSituacao: tram.evidenciaSituacao || (ultimoMov ? `${ultimoMov.dataHora ? new Date(ultimoMov.dataHora).toLocaleDateString('pt-BR') + ' · ' : ''}${ultimoMov.descricao || ''}` : ''),
            assunto: assuntos || 'Não informado',
            classeProcessual: classes || 'Não informado',
            valorCausa: valorAcao,
            siglaDiario: siglaTribunal,
            estado: uf || 'SP',
            dataAjuizamento: tram.dataHoraAjuizamento || '',
            poloCliente,
            envolvidos
        };
    });

    return {
        total: processos.length,
        totalEncontradoBase: data.total || processos.length,
        valorTotalCausas,
        poloPassivo,
        poloAtivo,
        outrosPolos,
        processos
    };
}

function _parseBasicHistory(rawText) {
    if (!rawText) return { ccfs: [], protestos: [], dividas: [], processos: [], serasa: [], boaVista: [] };
    let obj = null;
    try {
        obj = JSON.parse(rawText);
        if (typeof obj === 'string') obj = JSON.parse(obj);
    } catch (_) {
        return { ccfs: [], protestos: [], dividas: [], processos: [], serasa: [], boaVista: [] };
    }
    return {
        ccfs: Array.isArray(obj.ccfs) ? obj.ccfs : [],
        protestos: Array.isArray(obj.protestos) ? obj.protestos : [],
        dividas: Array.isArray(obj.dividas) ? obj.dividas : [],
        processos: Array.isArray(obj.processos) ? obj.processos : [],
        serasa: Array.isArray(obj.serasa) ? obj.serasa : [],
        boaVista: Array.isArray(obj.boaVista) ? obj.boaVista : []
    };
}

/**
 * Calcula a pontuação de A a F (A = melhor nota, F = pior nota) analisando todos os dados da CreditHub.
 */
function calcularNotaScoreCreditHub(dados) {
    let pontos = 100;
    const motivos = [];

    const sit = String(dados?.identificacao?.situacao || 'ATIVA').toUpperCase();
    if (sit && sit !== 'ATIVA' && sit !== 'REGULAR') {
        pontos -= 75;
        motivos.push(`Situação cadastral na Receita Federal: ${sit}`);
    } else {
        motivos.push('Situação cadastral ATIVA na Receita Federal');
    }

    const qtdProtestos = Number(dados?.protestos?.quantidade || 0);
    const valProtestos = Number(dados?.protestos?.valorTotal || 0);
    if (qtdProtestos > 0) {
        const pen = Math.min(45, 18 + qtdProtestos * 5 + (valProtestos > 50000 ? 12 : valProtestos > 10000 ? 6 : 0));
        pontos -= pen;
        motivos.push(`${qtdProtestos} protesto(s) em cartório${valProtestos > 0 ? ' (R$ ' + valProtestos.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ')' : ''}`);
    } else {
        motivos.push('Sem protestos em cartório (CENPROT)');
    }

    const qtdCcf = Number(dados?.ccf?.quantidade || 0);
    if (qtdCcf > 0) {
        const pen = Math.min(35, 15 + qtdCcf * 5);
        pontos -= pen;
        motivos.push(`${qtdCcf} cheque(s) sem fundos (CCF)`);
    } else {
        motivos.push('Sem cheques devolvidos (CCF)');
    }

    const qtdDividas = Number(dados?.dividasPublicas?.quantidade || 0);
    const valDividas = Number(dados?.dividasPublicas?.valorTotal || 0);
    if (qtdDividas > 0) {
        const pen = Math.min(35, 15 + qtdDividas * 5);
        pontos -= pen;
        motivos.push(`${qtdDividas} dívida(s) pública(s) com a União (R$ ${valDividas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
    } else {
        motivos.push('Sem dívidas públicas com a União');
    }

    const procPassivo = Number(dados?.processos?.poloPassivo || 0);
    const procAtivo = Number(dados?.processos?.poloAtivo || 0);
    const temFalenciaRJ = (dados?.processos?.processos || []).some(p =>
        p.poloCliente === 'PASSIVO' && /fal[eê]ncia|recupera[cç][aã]o judicial/i.test(`${p.assunto} ${p.classeProcessual}`)
    );

    if (temFalenciaRJ) {
        pontos -= 45;
        motivos.push('Alerta: Processo de Recuperação Judicial / Falência como polo passivo');
    }

    if (procPassivo > 0) {
        const pen = Math.min(25, Math.ceil(procPassivo * 2.5));
        pontos -= pen;
        motivos.push(`${procPassivo} processo(s) jurídico(s) no polo passivo (réu)`);
    } else {
        motivos.push('Nenhum processo jurídico no polo passivo (réu)');
    }

    if (procAtivo > 0) {
        motivos.push(`${procAtivo} processo(s) jurídico(s) como autor/cobrança (polo ativo — não penaliza)`);
    }

    const idade = parseInt(dados?.identificacao?.idadeEmpresa, 10) || 0;
    if (idade > 0 && idade < 1) {
        pontos -= 5;
        motivos.push('Empresa com menos de 1 ano de abertura');
    } else if (idade >= 5) {
        motivos.push(`${idade} anos de tempo de atividade`);
    }

    pontos = Math.max(0, Math.min(100, Math.round(pontos)));

    let nota = 'A';
    let classificacao = 'Risco Muito Baixo · Excelente';
    let cor = '#16a34a';
    let bg = '#dcfce7';

    if (pontos >= 90) {
        nota = 'A'; classificacao = 'Risco Muito Baixo · Excelente'; cor = '#15803d'; bg = '#dcfce7';
    } else if (pontos >= 75) {
        nota = 'B'; classificacao = 'Risco Baixo · Bom'; cor = '#16a34a'; bg = '#f0fdf4';
    } else if (pontos >= 60) {
        nota = 'C'; classificacao = 'Risco Moderado · Regular'; cor = '#ca8a04'; bg = '#fef9c3';
    } else if (pontos >= 45) {
        nota = 'D'; classificacao = 'Risco Médio-Alto · Atenção'; cor = '#ea580c'; bg = '#ffedd5';
    } else if (pontos >= 25) {
        nota = 'E'; classificacao = 'Risco Alto · Restrições Relevantes'; cor = '#dc2626'; bg = '#fee2e2';
    } else {
        nota = 'F'; classificacao = 'Risco Crítico · Impeditivo'; cor = '#991b1b'; bg = '#fecaca';
    }

    return { nota, pontos, classificacao, cor, bg, motivos };
}

/**
 * Verifica se há consulta válida (< 90 dias) no banco de dados para o CPF/CNPJ.
 */
async function obterConsultaCache90Dias(dbOrFn, documento) {
    const { dbGet } = _wrapDb(dbOrFn);
    await ensureTables(dbOrFn);
    const docClean = String(documento || '').replace(/\D/g, '');
    if (!docClean) return null;

    const row = await dbGet(
        `SELECT * FROM credithub_consultas
         WHERE documento = ?
           AND datetime(consultado_em) >= datetime('now', '-90 days')
         ORDER BY consultado_em DESC LIMIT 1`,
        [docClean]
    );
    if (!row) return null;

    let dados = null;
    try { dados = JSON.parse(row.dados_json); } catch (_) { return null; }

    const consultadoDate = new Date(row.consultado_em.includes('T') ? row.consultado_em : row.consultado_em.replace(' ', 'T') + 'Z');
    const expiraDate = new Date(consultadoDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const diasRestantes = Math.max(0, Math.ceil((expiraDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

    return {
        id: row.id,
        documento: row.documento,
        fromCache: true,
        consultadoEm: row.consultado_em,
        expiraEm: expiraDate.toISOString(),
        diasRestantes,
        notaScore: row.nota_score,
        pontosScore: row.pontos_score,
        dados
    };
}

/**
 * Executa a Consulta Simples completa na CreditHub (ou retorna do cache de 90 dias).
 */
async function consultarDocumentoCreditHub(dbOrFn, documento, usuarioSistema = 'sistema') {
    const { dbRun } = _wrapDb(dbOrFn);
    await ensureTables(dbOrFn);
    const docClean = String(documento || '').replace(/\D/g, '');
    if (docClean.length !== 11 && docClean.length !== 14) {
        throw new Error('Documento inválido. Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).');
    }

    // 1. Verificar cache de 90 dias primeiro
    const cached = await obterConsultaCache90Dias(dbOrFn, docClean);
    if (cached) return cached;

    // 2. Obter token válido (com retry automático caso tenha expirado)
    let apiKey = await getValidApiKey(dbOrFn, false);

    const runAllQueries = async (token) => {
        const basicUrl = `${IRQL_BASE_URL}?q=${encodeURIComponent("SELECT FROM 'DOCUMENTHISTORY'.'BASICHISTORY'")}&apiKey=${encodeURIComponent(token)}&documento=${docClean}`;
        const [finderXml, domText, ieptbXml, jusbrText, basicText] = await Promise.all([
            _execPushJob(token, "SELECT FROM 'FINDER'.'BILLING'", { documento: docClean }, 'cs-finder', 22000),
            _execPushJob(token, "SELECT FROM 'DOMINIOS'.'CONSULTA'", { documento: docClean }, 'cs-dominios', 15000).catch(() => '[]'),
            _execPushJob(token, "SELECT FROM 'IEPTB'.'IEPTBHARLAN'", { documento: docClean }, 'cs-ieptb', 25000).catch(() => null),
            _execPushJob(token, "SELECT FROM 'JUSBR'.'DOCUMENTO'", { documento: docClean }, 'cs-jusbr', 25000).catch(() => null),
            _fetchIrqlText(basicUrl).catch(() => '')
        ]);
        return { finderXml, domText, ieptbXml, jusbrText, basicText };
    };

    let rawResults;
    try {
        rawResults = await runAllQueries(apiKey);
    } catch (err) {
        if (err.isAuthError) {
            apiKey = await getValidApiKey(dbOrFn, true);
            rawResults = await runAllQueries(apiKey);
        } else {
            throw err;
        }
    }

    const finder = _parseFinderXml(rawResults.finderXml) || {
        identificacao: { cnpj: docClean, razaoSocial: '', nomeFantasia: '', situacao: 'ATIVA' },
        socios: [], enderecos: [], contatos: [], quemConsultou: [], volumeMensal: [], dividasFinder: { quantidade: 0, valorTotal: 0 }
    };

    let dominios = [];
    try {
        const parsedDom = JSON.parse(rawResults.domText || '[]');
        if (Array.isArray(parsedDom)) dominios = parsedDom;
    } catch (_) {}

    const protestos = _parseIeptbXml(rawResults.ieptbXml);
    const processos = _parseJusbrJson(rawResults.jusbrText, docClean);
    const basicHistory = _parseBasicHistory(rawResults.basicText);

    const lastCcf = basicHistory.ccfs.length > 0 ? basicHistory.ccfs[basicHistory.ccfs.length - 1] : null;
    const ccf = {
        quantidade: lastCcf ? (Number(lastCcf.quantidade) || 0) : 0,
        valorTotal: lastCcf ? (Number(lastCcf.valorTotal) || 0) : 0,
        ultimaOcorrencia: lastCcf ? lastCcf.data : null,
        historico: basicHistory.ccfs
    };

    const dividasPublicas = {
        quantidade: finder.dividasFinder.quantidade || 0,
        valorTotal: finder.dividasFinder.valorTotal || 0
    };

    const totalOcorrencias = (protestos.quantidade || 0) + (ccf.quantidade || 0) + (dividasPublicas.quantidade || 0) + (processos.total || 0);
    const valorTotalNegativado = (protestos.valorTotal || 0) + (ccf.valorTotal || 0) + (dividasPublicas.valorTotal || 0);

    let categoriaPredominante = 'Nenhuma ocorrência';
    const cats = [
        { nome: 'Protestos', qtd: protestos.quantidade || 0 },
        { nome: 'Cheques Devolvidos', qtd: ccf.quantidade || 0 },
        { nome: 'Dívidas Públicas', qtd: dividasPublicas.quantidade || 0 },
        { nome: 'Processos Jurídicos', qtd: processos.total || 0 }
    ].sort((a, b) => b.qtd - a.qtd);
    if (cats[0].qtd > 0) categoriaPredominante = cats[0].nome;
    const categoriasComOcorrencia = cats.filter(c => c.qtd > 0).length;

    const dadosCompletos = {
        dataHoraConsulta: new Date().toISOString(),
        documento: docClean,
        identificacao: finder.identificacao,
        quemConsultou: finder.quemConsultou,
        volumeMensal: finder.volumeMensal,
        enderecos: finder.enderecos,
        contatos: finder.contatos,
        socios: finder.socios,
        dominios,
        resumoNegativacoes: {
            totalOcorrencias,
            categoriasComOcorrencia,
            valorTotalNegativado,
            categoriaPredominante
        },
        protestos,
        ccf,
        dividasPublicas,
        processos,
        evolucaoHistorico: basicHistory
    };

    const scoreInfo = calcularNotaScoreCreditHub(dadosCompletos);
    dadosCompletos.score = scoreInfo;

    const insertRes = await dbRun(
        `INSERT INTO credithub_consultas (documento, razao_social, nome_fantasia, nota_score, pontos_score, dados_json, consultado_em, consultado_por)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
        [
            docClean,
            finder.identificacao.razaoSocial || '',
            finder.identificacao.nomeFantasia || '',
            scoreInfo.nota,
            scoreInfo.pontos,
            JSON.stringify(dadosCompletos),
            usuarioSistema || 'sistema'
        ]
    );

    const nowIso = new Date().toISOString();
    const expiraIso = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    return {
        id: insertRes.lastID,
        documento: docClean,
        fromCache: false,
        consultadoEm: nowIso,
        expiraEm: expiraIso,
        diasRestantes: 90,
        notaScore: scoreInfo.nota,
        pontosScore: scoreInfo.pontos,
        dados: dadosCompletos
    };
}

module.exports = {
    ensureTables,
    obterConsultaCache90Dias,
    consultarDocumentoCreditHub,
    calcularNotaScoreCreditHub
};
