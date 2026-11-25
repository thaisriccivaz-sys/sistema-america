/**
 * Utilitário de integração com a API da CreditHub (BIPBOP / Harlan / IRQL)
 * Realiza Consulta Simples de CPF/CNPJ, gerencia token JWT (com auto-renovação via
 * CREDITHUB_USER / CREDITHUB_PASS / CREDITHUB_API_KEY), resolve desafios PoW (Jurischain),
 * consulta NostraCredit IA (LlamaApi.Consulta), Protestos (IEPTB), Cheques sem Fundos (CCF),
 * Processos Jurídicos (JUSBR), Dívidas, Cadastro/QSA/Endereços/Contatos (FINDER),
 * armazena cache de 90 dias no SQLite e calcula a Nota de Risco de A a F.
 */

const https = require('https');
const vm = require('vm');

const IRQL_BASE_URL = 'https://irql.credithub.com.br/';
const WEBSERVICE_CDN_URL = 'https://cdn.credithub.com.br/1.97.5/@credithub/webservice';
const DEFAULT_PUBLIC_API_KEY = '6057b71263c21e4ada266c9d4d4da613';
const FALLBACK_INITIAL_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIxNzkuMTc5LjExLjIwMyIsImF1ZCI6Imh0dHBzOi8vcGFpbmVsLmNyZWRpdGh1Yi5jb20uYnIiLCJpYXQiOjE3OTU0NTg2OTguOTQxNzcyLCJleHAiOjE3OTYwNjM0OTguOTQxNzcyLCJ1aWQiOiJmaW5hbmNlaXJvQGFtZXJpY2FyZW50YWwuY29tLmJyIn0.eAIW_5JodYQLTaJHBxbKmEpcoDmmloWO9l3Do9B7LQc';
const CURRENT_PARSER_VERSION = 4;

async function _fetchIrqlText(url, options = {}) {
    try {
        const r = await fetch(url, options);
        return await r.text();
    } catch (err) {
        const causeCode = err && err.cause && err.cause.code ? String(err.cause.code) : '';
        if (!causeCode.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') && !String(err.message || '').includes('fetch failed')) {
            throw err;
        }
        let bodyBuf = null;
        const headers = Object.assign({}, options.headers || {});
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

let _jurischainSolverPromise = null;
async function _getJurischainSolver() {
    if (_jurischainSolverPromise) return _jurischainSolverPromise;
    _jurischainSolverPromise = (async () => {
        try {
            let tWs = await _fetchIrqlText(WEBSERVICE_CDN_URL);
            tWs = tWs.replace(/\(\'\'\+function\(\)\{return 0x0;\}\)\[\'indexOf\'\]\(\'\\x0a\'\)/g, '0');
            const listeners = {};
            const sandbox = {
                CREDITHUB: { install: (id, deps, factory) => { try { factory({}, {}, {}); } catch (_) {} } },
                window: {}, self: {}, globalThis: {},
                document: {
                    addEventListener: (ev, fn) => { listeners[ev] = fn; },
                    removeEventListener: (ev) => { delete listeners[ev]; },
                    dispatchEvent: (ev) => { if (listeners[ev.type]) listeners[ev.type](ev); },
                    getElementById: () => null,
                    createElement: () => ({})
                },
                CustomEvent: class { constructor(type, opts) { this.type = type; this.detail = opts ? opts.detail : undefined; } },
                requestAnimationFrame: (fn) => setTimeout(fn, 1),
                cancelAnimationFrame: (id) => clearTimeout(id),
                fetch: global.fetch, FormData: global.FormData, Blob: global.Blob, Headers: global.Headers,
                Request: global.Request, Response: global.Response, AbortController: global.AbortController,
                TextEncoder: global.TextEncoder, TextDecoder: global.TextDecoder, crypto: global.crypto,
                performance: global.performance, WebSocket: class {}, console,
                setTimeout, clearTimeout, setInterval, clearInterval, URL, URLSearchParams, Buffer,
                Uint8Array, ArrayBuffer, DataView, Int32Array, Uint32Array, Float64Array, Float32Array,
                Int16Array, Uint16Array, Int8Array, Uint8ClampedArray,
                Promise, Error, TypeError, RangeError, RegExp, Math, Date, JSON, Object, Array, String,
                Number, Boolean, Symbol, Map, Set, WeakMap, WeakSet,
                encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN, isFinite
            };
            sandbox.window = sandbox;
            sandbox.self = sandbox;
            sandbox.globalThis = sandbox;
            vm.createContext(sandbox);
            vm.runInContext(tWs, sandbox);
            if (typeof sandbox.solveJurischain === 'function') {
                return sandbox.solveJurischain;
            }
            return null;
        } catch (err) {
            console.warn('[CREDITHUB] Aviso ao inicializar solver Jurischain:', err.message);
            _jurischainSolverPromise = null;
            return null;
        }
    })();
    return _jurischainSolverPromise;
}

async function _callIrqlWithPoW(apiKey, query, params = {}) {
    const url = `${IRQL_BASE_URL}?apiKey=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}`;
    const buildForm = () => {
        const fd = new FormData();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null) fd.append(k, String(v));
        }
        return fd;
    };

    const text1 = await _fetchIrqlText(url, { method: 'POST', body: buildForm() });
    if (text1 && text1.includes('<exception') && text1.includes('code="402"')) {
        const cid = (text1.match(/challenge_id="([^"]+)"/) || [])[1];
        const seed = (text1.match(/seed="([^"]+)"/) || [])[1];
        const diff = parseInt((text1.match(/difficulty="([^"]+)"/) || [])[1] || '1', 10);
        if (cid && seed) {
            const solver = await _getJurischainSolver();
            if (solver) {
                const solved = await solver({ seed, difficulty: diff, timeout: 10000 });
                if (solved) {
                    return await _fetchIrqlText(url, {
                        method: 'POST',
                        headers: {
                            'X-Jurischain-Id': cid,
                            'X-Jurischain-Response': solved
                        },
                        body: buildForm()
                    });
                }
            }
        }
    }
    return text1;
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
    if (parts.length !== 3) return false;
    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (!payload.exp) return false;
        const nowSec = Math.floor(Date.now() / 1000);
        return (payload.exp - 300) <= nowSec;
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

function _extractInnerXmlBlocks(xml, tag) {
    if (!xml) return [];
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?>((?:(?!<${tag}(?:\\s|>))[\\s\\S])*?)<\\/${tag}>`, 'gi');
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

async function _execQueryOrPush(apiKey, query, params, labelPrefix, maxWaitMs = 38000) {
    // 1. Tenta chamada direta com resolução automática de PoW (X-Jurischain)
    try {
        const directText = await _callIrqlWithPoW(apiKey, query, params);
        if (directText && !directText.includes('<exception')) {
            return directText;
        }
        if (directText && directText.includes('<exception')) {
            const excMsg = _extractXmlTag(directText, 'exception');
            if (/token|autentica|apiKey|sessão|expirad/i.test(excMsg)) {
                const err = new Error(_decodeXmlEntities(excMsg));
                err.isAuthError = true;
                throw err;
            }
        }
    } catch (e) {
        if (e.isAuthError) throw e;
    }

    // 2. Fallback via PUSH.JOB / PUSH.DOCUMENT (para consultas assíncronas que exigem fila)
    const docClean = String(params.documento || '').replace(/\D/g, '');
    const dayTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const label = `${labelPrefix}-${docClean}-${dayTag}`;

    try {
        const existingText = await _callIrqlWithPoW(apiKey, "SELECT FROM 'PUSH'.'DOCUMENT'", { label });
        if (existingText && !existingText.includes('<exception')) {
            return existingText;
        }
    } catch (_) {}

    const createParams = Object.assign({}, params, {
        pushMaxVersion: '1',
        pushWebSocketDeliver: 'false',
        pushRecordRequest: 'true',
        pushExpireToday: 'true',
        pushQuery: query,
        pushLabel: label
    });

    const tCreate = await _callIrqlWithPoW(apiKey, "INSERT INTO 'PUSH'.'JOB'", createParams);
    if (tCreate && tCreate.includes('<exception')) {
        const excMsg = _extractXmlTag(tCreate, 'exception');
        if (/token|autentica|apiKey|sessão|expirad/i.test(excMsg)) {
            const err = new Error(_decodeXmlEntities(excMsg));
            err.isAuthError = true;
            throw err;
        }
    }

    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        await new Promise(r => setTimeout(r, 900));
        const text = await _callIrqlWithPoW(apiKey, "SELECT FROM 'PUSH'.'DOCUMENT'", { label });
        if (text && !text.includes('<exception')) {
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
    const nomeFantasia = _decodeXmlEntities(_extractXmlTag(cadBlock, 'nomeFantasia')) || razaoSocial;
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

    // Atividades Econômicas Secundárias
    const cnaesSecBlocks = _extractInnerXmlBlocks(xml, 'cadastroCnpjCnaesSecundarias');
    const atividadesSecundarias = cnaesSecBlocks.map(b => _decodeXmlEntities(_extractXmlTag(b, 'descricao'))).filter(Boolean);

    // Quadro Societário
    const sociosBlocks = _extractInnerXmlBlocks(xml, 'quadroSocietario');
    const socios = sociosBlocks.map(b => ({
        documento: _decodeXmlEntities(_extractXmlTag(b, 'documento')),
        nome: _decodeXmlEntities(_extractXmlTag(b, 'nome')),
        qualificacao: _decodeXmlEntities(_extractXmlTag(b, 'qualificacaoSocio')),
        dataEntrada: _decodeXmlEntities(_extractXmlTag(b, 'dataEntrada')),
        participacao: _decodeXmlEntities(_extractXmlTag(b, 'participacao'))
    })).filter(s => s.nome || s.documento);

    // Endereços
    const endBlocks = _extractInnerXmlBlocks(xml, 'enderecos');
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
        const key = `${item.logradouro}|${item.cep}`.toUpperCase();
        if ((item.logradouro || item.cep) && !enderecosSeen.has(key)) {
            enderecosSeen.add(key);
            enderecos.push(item);
        }
    }

    // Telefones e E-mails
    const fixosBlocks = _extractInnerXmlBlocks(xml, 'fixos');
    const moveisBlocks = _extractInnerXmlBlocks(xml, 'moveis');
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

    const emailBlocks = _extractInnerXmlBlocks(xml, 'emails');
    const emailsSeen = new Set();
    for (const b of emailBlocks) {
        const em = _decodeXmlEntities(_extractXmlTag(b, 'email')).trim().toLowerCase();
        if (em && !emailsSeen.has(em)) {
            emailsSeen.add(em);
            contatos.push({ tipo: 'E-MAIL', valor: em });
        }
    }

    // Quem consultou (histórico e histórico mensal)
    const consultaBlocks = _extractInnerXmlBlocks(xml, 'consulta');
    const quemConsultou = consultaBlocks.map(b => ({
        usuario: _decodeXmlEntities(_extractXmlTag(b, 'usuario')),
        data: _decodeXmlEntities(_extractXmlTag(b, 'ultimaConsulta'))
    })).filter(c => c.usuario);

    const histMensalOuter = _extractXmlTag(xml, 'historico-mensal');
    const volumeMensal = [];
    if (histMensalOuter) {
        const reMes = /<mes[^>]*>\s*<data>([\s\S]*?)<\/data>\s*<ano>([\s\S]*?)<\/ano>\s*<mes>([\s\S]*?)<\/mes>\s*<quantidade>([\s\S]*?)<\/quantidade>\s*<\/mes>/gi;
        let mMes;
        while ((mMes = reMes.exec(histMensalOuter)) !== null) {
            const dataStr = _decodeXmlEntities(mMes[1].trim());
            const anoNum = parseInt(mMes[2].trim(), 10) || parseInt(dataStr.split('-')[0], 10) || 0;
            const mesNum = parseInt(mMes[3].trim(), 10) || parseInt(dataStr.split('-')[1], 10) || 0;
            const qtdNum = parseInt(mMes[4].trim(), 10) || 0;
            volumeMensal.push({ data: dataStr, ano: anoNum, mes: mesNum, quantidade: qtdNum });
        }
    }

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
            atividadesSecundarias,
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
    if (!xml || xml.includes('<exception')) {
        return { situacao: 'NÃO CONSULTADO', consta: false, quantidade: 0, titulosDetalhados: 0, detalhamentoIncompleto: false, valorTotal: 0, cartorios: [], todosProtestos: [] };
    }
    const situacao = _decodeXmlEntities(_extractXmlTag(xml, 'situacao')) || 'NÃO CONSTA';
    const registros = parseInt(_extractXmlTag(xml, 'registros'), 10) || 0;
    const rawStr = _decodeXmlEntities(_extractXmlTag(xml, 'raw'));
    let rawObj = null;
    try { if (rawStr) rawObj = JSON.parse(rawStr); } catch (_) {}

    let valorTotal = 0;
    let titulosDetalhados = 0;
    const cartorios = [];
    const todosProtestos = [];
    const cartBlocks = _extractInnerXmlBlocks(xml, 'cartorio');

    for (const cb of cartBlocks) {
        const nomeCart = _decodeXmlEntities(_extractXmlTag(cb, 'nome') || _extractXmlTag(cb, 'codigo_cartorio'));
        const enderecoCart = _decodeXmlEntities(_extractXmlTag(cb, 'endereco'));
        const cidade = _decodeXmlEntities(_extractXmlTag(cb, 'cidade') || _extractXmlTag(cb, 'municipio'));
        const uf = _decodeXmlEntities(_extractXmlTag(cb, 'uf'));
        const telefone = _decodeXmlEntities(_extractXmlTag(cb, 'telefone'));
        const qtd = parseInt(_extractXmlTag(cb, 'protestos') || _extractXmlTag(cb, 'quantidade'), 10) || 0;
        const protBlocks = _extractInnerXmlBlocks(cb, 'protesto');

        const protestos = protBlocks.map(pb => {
            const vRaw = _extractXmlTag(pb, 'valor') || _extractXmlTag(pb, 'valorProtestado') || '0';
            const vClean = vRaw.includes(',') && vRaw.includes('.') ? vRaw.replace(/\./g, '').replace(',', '.') : vRaw.replace(',', '.');
            const v = parseFloat(vClean) || 0;
            valorTotal += v;
            titulosDetalhados++;
            const temAnuencia = /true|sim|1/i.test(_extractXmlTag(pb, 'temAnuencia'));
            const item = {
                data: _decodeXmlEntities(_extractXmlTag(pb, 'dataProtesto') || _extractXmlTag(pb, 'data')),
                valor: v,
                anuenciaPago: temAnuencia ? 'Sim' : 'Não',
                temAnuencia,
                apresentante: _decodeXmlEntities(_extractXmlTag(pb, 'nomeApresentante')),
                cedente: _decodeXmlEntities(_extractXmlTag(pb, 'nomeCedente')),
                cartorio: nomeCart,
                cidade,
                uf
            };
            todosProtestos.push(item);
            return item;
        });

        cartorios.push({
            cartorio: nomeCart,
            endereco: enderecoCart,
            cidade,
            uf,
            telefone,
            quantidade: qtd || protestos.length,
            titulosDetalhados: protestos.length,
            protestos
        });
    }

    // Ordenar todosProtestos da data mais recente para a mais antiga
    todosProtestos.sort((a, b) => {
        const pa = String(a.data || '').split('/');
        const pb = String(b.data || '').split('/');
        const ta = pa.length === 3 ? new Date(`${pa[2]}-${pa[1]}-${pa[0]}`).getTime() : 0;
        const tb = pb.length === 3 ? new Date(`${pb[2]}-${pb[1]}-${pb[0]}`).getTime() : 0;
        return tb - ta;
    });

    const somaCartorios = cartorios.reduce((s, c) => s + (c.quantidade || 0), 0);
    const totalQtd = Math.max(registros, (rawObj && Number(rawObj.qtdTitulos)) || 0, somaCartorios, titulosDetalhados);
    const detalhamentoIncompleto = totalQtd > 0 && titulosDetalhados < totalQtd;

    return {
        situacao,
        consta: situacao.toUpperCase() === 'CONSTA' || totalQtd > 0,
        quantidade: totalQtd,
        titulosDetalhados,
        detalhamentoIncompleto,
        valorTotal,
        cartorios,
        todosProtestos
    };
}

function _parseCcfXml(xml, basicHistoryCcfs = []) {
    const lastHist = Array.isArray(basicHistoryCcfs) && basicHistoryCcfs.length > 0 ? basicHistoryCcfs[basicHistoryCcfs.length - 1] : null;
    if (!xml || xml.includes('<exception')) {
        return {
            quantidade: lastHist ? (Number(lastHist.quantidade) || 0) : 0,
            valorTotal: lastHist ? (Number(lastHist.valorTotal) || 0) : 0,
            ultimaOcorrencia: lastHist ? lastHist.data : null,
            detalhes: [],
            historico: basicHistoryCcfs || []
        };
    }

    const sumQte = parseInt(_extractXmlTag(xml, 'sumQteOcorrencias') || _extractXmlTag(xml, 'totalRegistro') || _extractXmlTag(xml, 'registros'), 10) || 0;
    const ultimaOcorrencia = _decodeXmlEntities(_extractXmlTag(xml, 'ultimaOcorrencia') || _extractXmlTag(xml, 'ultimo')) || (lastHist ? lastHist.data : null);

    const detalhes = [];
    const listBlock = _extractXmlTag(xml, 'list') || xml;
    const itemRe = /<item\d+[^>]*>([\s\S]*?)<\/item\d+>/gi;
    let m;
    while ((m = itemRe.exec(listBlock)) !== null) {
        const b = m[1];
        detalhes.push({
            banco: _decodeXmlEntities(_extractXmlTag(b, 'banco')),
            agencia: _decodeXmlEntities(_extractXmlTag(b, 'agencia')),
            quantidade: parseInt(_extractXmlTag(b, 'qteOcorrencias'), 10) || 1,
            ultimaOcorrencia: _decodeXmlEntities(_extractXmlTag(b, 'ultimo')) || ultimaOcorrencia,
            alineaMotivo: _decodeXmlEntities(_extractXmlTag(b, 'motivo'))
        });
    }

    const totalQtd = Math.max(sumQte, detalhes.reduce((s, d) => s + (d.quantidade || 0), 0), lastHist ? (Number(lastHist.quantidade) || 0) : 0);

    return {
        quantidade: totalQtd,
        valorTotal: 0,
        ultimaOcorrencia,
        detalhes,
        historico: basicHistoryCcfs || []
    };
}

function _normNameForMatch(s) {
    return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, ' ')
        .replace(/\b(LTDA|EIRELI|EIRELLI|ME|EPP|SA|S\s+A)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function _parseJusbrJson(text, docConsultado, razaoSocialCliente = '') {
    if (!text || text.includes('<exception')) {
        return { total: 0, totalGeral: 0, valorTotalCausas: 0, poloPassivo: 0, poloAtivo: 0, outrosPolos: 0, processos: [], arquivados: [] };
    }
    let data = null;
    try { data = JSON.parse(text); } catch (_) {
        try { data = JSON.parse(JSON.parse(text)); } catch (_2) {}
    }
    if (!data || !Array.isArray(data.content)) {
        return { total: 0, totalGeral: 0, valorTotalCausas: 0, poloPassivo: 0, poloAtivo: 0, outrosPolos: 0, processos: [], arquivados: [] };
    }

    const docClean = String(docConsultado || '').replace(/\D/g, '');
    const normRazao = _normNameForMatch(razaoSocialCliente);
    const razaoTokens = normRazao.split(' ').filter(w => w.length >= 3);
    const prefixMatch = razaoTokens.slice(0, 2).join(' ');

    let valorTotalCausas = 0;
    let poloPassivo = 0;
    let poloAtivo = 0;
    let outrosPolos = 0;
    const processos = [];
    const arquivados = [];

    for (const p of data.content) {
        const tram = (Array.isArray(p.tramitacoes) && p.tramitacoes[0]) || {};
        const valorAcao = parseFloat(tram.valorAcao) || 0;
        const assuntos = Array.isArray(tram.assunto) ? tram.assunto.map(a => a.descricao).filter(Boolean).join(', ') : '';
        const classes = Array.isArray(tram.classe) ? tram.classe.map(c => c.descricao).filter(Boolean).join(', ') : '';
        const siglaTribunal = p.siglaTribunal || (tram.tribunal && tram.tribunal.sigla) || '';
        const ultimoMov = tram.ultimoMovimento ? {
            codigo: tram.ultimoMovimento.codigo,
            dataHora: tram.ultimoMovimento.dataHora,
            descricao: tram.ultimoMovimento.descricao || ''
        } : null;

        const movDesc = String((ultimoMov && ultimoMov.descricao) || '');
        const movCod = Number(ultimoMov && ultimoMov.codigo) || 0;
        const isArquivadoDef = movCod === 246 || /arquivado definitivamente|baixa definitiva.*arquiv/i.test(movDesc);
        const isArquivadoProv = movCod === 245 || /arquivado provisoriamente|suspenso|sobrestado/i.test(movDesc);
        const isArquivado = isArquivadoDef || isArquivadoProv || tram.ativo === false;

        let situacaoProcessual = tram.situacaoProcessual || 'Situação não confirmada';
        if (isArquivadoDef) situacaoProcessual = 'Arquivado definitivamente';
        else if (isArquivadoProv) situacaoProcessual = 'Arquivado provisoriamente';

        let evidenciaSituacao = tram.evidenciaSituacao || '';
        if (!evidenciaSituacao && ultimoMov && (isArquivado || /baixa definitiva|arquivado/i.test(movDesc))) {
            const dtFmt = ultimoMov.dataHora ? new Date(ultimoMov.dataHora).toLocaleDateString('pt-BR') : '';
            evidenciaSituacao = `${dtFmt ? dtFmt + ' · ' : ''}${movDesc} · JUSBR`;
        }

        let poloCliente = 'OUTRO';
        const envolvidos = (Array.isArray(tram.partes) ? tram.partes : []).map(pt => {
            const docsParte = Array.isArray(pt.documentosPrincipais) ? pt.documentosPrincipais.map(d => String(d.numero || '').replace(/\D/g, '')) : [];
            const normPtNome = _normNameForMatch(pt.nome);
            const matchByDoc = Boolean(docClean && docsParte.includes(docClean));
            const matchByName = Boolean(!matchByDoc && normRazao && normPtNome && (normPtNome === normRazao || (prefixMatch.length >= 7 && normPtNome.startsWith(prefixMatch))));
            const isCliente = matchByDoc || matchByName;
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

        let uf = '';
        if (siglaTribunal.endsWith('SP')) uf = 'SP';
        else if (siglaTribunal.endsWith('RJ')) uf = 'RJ';
        else if (siglaTribunal.endsWith('MG')) uf = 'MG';
        else if (siglaTribunal.endsWith('PR')) uf = 'PR';
        else if (siglaTribunal.endsWith('RS')) uf = 'RS';
        else if (siglaTribunal.endsWith('SC')) uf = 'SC';
        else if (siglaTribunal.length >= 4 && siglaTribunal.startsWith('TJ')) uf = siglaTribunal.slice(2);

        const itemProc = {
            numeroProcesso: p.numeroProcesso || '',
            situacaoProcessual,
            evidenciaSituacao,
            assunto: assuntos || 'Não informado',
            classeProcessual: classes || 'Não informado',
            valorCausa: valorAcao,
            siglaDiario: siglaTribunal,
            estado: uf || 'SP',
            dataAjuizamento: tram.dataHoraAjuizamento || '',
            poloCliente,
            isArquivado,
            envolvidos
        };

        if (isArquivado) {
            arquivados.push(itemProc);
        } else {
            valorTotalCausas += valorAcao;
            if (poloCliente === 'PASSIVO') poloPassivo++;
            else if (poloCliente === 'ATIVO') poloAtivo++;
            else outrosPolos++;
            processos.push(itemProc);
        }
    }

    return {
        total: processos.length,
        totalArquivados: arquivados.length,
        totalGeral: processos.length + arquivados.length,
        valorTotalCausas,
        poloPassivo,
        poloAtivo,
        outrosPolos,
        processos,
        arquivados
    };
}

function _parseBasicHistory(rawText) {
    if (!rawText || rawText.includes('<exception')) {
        return { ccfs: [], protestos: [], dividas: [], processos: [], serasa: [], boaVista: [] };
    }
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
        dividas: Array.isArray(obj.dividasPublicasGrafico) ? obj.dividasPublicasGrafico : (Array.isArray(obj.dividas) ? obj.dividas : []),
        processos: Array.isArray(obj.processosJuridicos) ? obj.processosJuridicos : (Array.isArray(obj.processos) ? obj.processos : []),
        serasa: Array.isArray(obj.serasa) ? obj.serasa : [],
        boaVista: Array.isArray(obj.boaVista) ? obj.boaVista : []
    };
}

/**
 * Consulta a IA NostraCredit oficial da CreditHub (SELECT FROM 'LlamaApi'.'Consulta')
 */
async function _consultarNostraCreditIA(apiKey, dados) {
    try {
        const idf = dados.identificacao || {};
        const prot = dados.protestos || {};
        const ccf = dados.ccf || {};
        const div = dados.dividasPublicas || {};
        const proc = dados.processos || {};

        const textoProtestos = prot.detalhamentoIncompleto
            ? `${prot.quantidade} protestos informados pela CENPROT, com detalhamento incompleto (${prot.titulosDetalhados} de ${prot.quantidade} detalhados). Valores e classificação completa indisponíveis. A falta de detalhes não indica pagamento ou baixa.`
            : `${prot.quantidade || 0} protesto(s) registrado(s) na CENPROT, somando R$ ${Number(prot.valorTotal || 0).toFixed(2)}.`;

        const classesAtivas = [...new Set((proc.processos || []).map(p => `${p.classeProcessual} (${p.assunto}) — Polo: ${p.poloCliente}`))].slice(0, 12);

        const promptContent = `Analisar o dossiê da seguinte empresa:
- Foco em identificar protestos, processos judiciais e problemas financeiros que possam impactar a empresa.

Esta análise é para uma pessoa jurídica.

\`\`\`yaml
dadosFiltrados:
  resumoDaEmpresa:
    razaoSocial: ${JSON.stringify(idf.razaoSocial || '')}
    cnpj: ${JSON.stringify(idf.cnpj || dados.documento || '')}
    situacao: ${JSON.stringify(idf.situacao || 'ATIVA')}
    idadeEmpresa: ${JSON.stringify(String(idf.idadeEmpresa || ''))}
    capitalSocial: ${Number(idf.capitalSocial || 0)}
  quantidadeProtestos: ${Number(prot.quantidade || 0)}
  consultaProtestos:
    parcial: ${Boolean(prot.detalhamentoIncompleto)}
    quantidadeConhecida: ${Number(prot.quantidade || 0)}
    valorTotalConhecido: ${Number(prot.valorTotal || 0)}
    textoObrigatorio: ${JSON.stringify(textoProtestos)}
  ccf: ${Number(ccf.quantidade || 0)}
  ccfData:
    totalOcorrencias: ${Number(ccf.quantidade || 0)}
    ultimoRegistro: ${JSON.stringify(ccf.ultimaOcorrencia || '')}
  dividasPublicas:
    quantidade: ${Number(div.quantidade || 0)}
    valorTotal: ${Number(div.valorTotal || 0)}
  ProcessosJuridicos:
    totalAtivos: ${Number(proc.total || 0)}
    poloPassivoReu: ${Number(proc.poloPassivo || 0)}
    poloAtivoAutor: ${Number(proc.poloAtivo || 0)}
    valorTotalCausas: ${Number(proc.valorTotalCausas || 0)}
    principaisAcoes: ${JSON.stringify(classesAtivas)}
\`\`\`

## LIMINAR — SEM SINAL
Não há indício potencial nem confirmado no dossiê.
Neste caso (e só neste caso) use: **Liminares: Nenhuma.**

Na seção final de Recomendação, indique obrigatoriamente de forma explícita **Recomendação: APROVADO.** ou **Recomendação: REPROVADO.** conforme sua análise.
**Responda sempre em português claro.**`;

        const rawStreamText = await _callIrqlWithPoW(apiKey, "SELECT FROM 'LlamaApi'.'Consulta'", {
            model: 'credithub-ql',
            messages: JSON.stringify([{ role: 'user', content: promptContent }])
        });

        if (rawStreamText && !rawStreamText.includes('<exception')) {
            let fullResponse = '';
            const lines = rawStreamText.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                    const parsed = JSON.parse(trimmed);
                    const chunk = (parsed.message && parsed.message.content) || parsed.response || '';
                    fullResponse += chunk;
                } catch (_) {}
            }
            if (fullResponse.trim()) {
                return fullResponse.trim();
            }
        }
    } catch (err) {
        console.warn('[CREDITHUB] Aviso ao consultar NostraCredit IA:', err.message);
    }
    return null;
}

/**
 * Identifica se o parecer da IA NostraCredit considerou o crédito APROVADO ou REPROVADO.
 * Retorna 'APROVADO', 'REPROVADO' ou null (caso não haja texto de análise IA disponível).
 */
function _extrairParecerNostraCreditIA(analiseIA) {
    const txt = String(analiseIA || '').trim();
    if (!txt) return null;

    const norm = txt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

    // 1. Verificar linha explícita de Recomendação / Decisão / Parecer Final
    const recMatches = [...norm.matchAll(/(?:RECOMENDACAO(?:\s+FINAL)?|DECISAO(?:\s+DE\s+CREDITO|\s+FINAL)?|PARECER(?:\s+FINAL)?)\s*[:\-]\s*\**([^\n]+)/g)];
    for (let i = recMatches.length - 1; i >= 0; i--) {
        const linhaRec = String(recMatches[i][1] || '').trim();
        if (/\b(REPROVAD[OA]|NEGAD[OA]|RECUSAD[OA]|NAO\s+APROVAD[OA]|NAO\s+RECOMENDAD[OA]|DESFAVORAVEL|CREDITO\s+NAO\s+RECOMENDADO|BLOQUEAD[OA]|INAPTO)\b/.test(linhaRec)) {
            return 'REPROVADO';
        }
        if (/\b(APROVAD[OA]|RECOMENDAD[OA]|FAVORAVEL|LIBERAD[OA]|APTO)\b/.test(linhaRec)) {
            return 'APROVADO';
        }
    }

    // 2. Verificar no trecho final ("Recomendação Final") caso a decisão esteja na linha seguinte
    const idxSecRec = norm.lastIndexOf('RECOMENDACAO FINAL');
    const trechoFinal = idxSecRec >= 0 ? norm.slice(idxSecRec) : norm.slice(-700);

    if (/\b(CREDITO\s+REPROVADO|RECOMENDACAO\s*[:\-]?\s*\**REPROVAD|NAO\s+RECOMEND(?:O|AMOS|ADA)\s+A\s+CONCESSAO|CREDITO\s+NAO\s+RECOMENDADO|CREDITO\s+NEGADO|IMPEDE\s+A\s+CONCESSAO\s+DE\s+CREDITO)\b/.test(trechoFinal)) {
        return 'REPROVADO';
    }
    if (/\b(RECOMENDACAO\s*[:\-]?\s*\**APROVAD|CREDITO\s+APROVADO|TOMADOR\s+DE\s+CREDITO\s+RESPONSAVEL|NAO\s+IMPEDE\s+A\s+CONCESSAO\s+DE\s+CREDITO|BOM\s+PERFIL\s+DE\s+RISCO|BAIXO\s+RISCO\s+DE\s+INADIMPLENCIA|RISCO\s+DE\s+INADIMPLENCIA[^.\n]{0,40}\bBAIXO\b)\b/.test(trechoFinal)) {
        return 'APROVADO';
    }

    // 3. Busca geral no texto inteiro
    if (/\b(CREDITO\s+REPROVADO|NAO\s+RECOMEND(?:O|AMOS)\s+A\s+CONCESSAO\s+DE\s+CREDITO|CREDITO\s+NEGADO)\b/.test(norm)) {
        return 'REPROVADO';
    }
    if (/\b(CREDITO\s+APROVADO|NAO\s+IMPEDE\s+A\s+CONCESSAO\s+DE\s+CREDITO|BOM\s+PERFIL\s+DE\s+RISCO)\b/.test(norm)) {
        return 'APROVADO';
    }

    return null;
}

/**
 * Calcula a pontuação de A a F (A = melhor nota, F = pior nota) analisando todos os dados da CreditHub
 * em conjunto com o parecer da IA NostraCredit:
 * - Apenas considera nota C para baixo (C, D, E, F) quando a IA NostraCredit considerar o crédito REPROVADO (ou CNPJ inapto/baixado).
 * - Quando a IA NostraCredit considerar o crédito APROVADO, garante no mínimo nota B (ou A se pontuação >= 90).
 */
function calcularNotaScoreCreditHub(dados, analiseIAOverride) {
    let pontos = 100;
    const motivos = [];

    const sit = String(dados?.identificacao?.situacao || 'ATIVA').toUpperCase();
    const situacaoRegular = !sit || sit === 'ATIVA' || sit === 'REGULAR';
    if (!situacaoRegular) {
        pontos -= 75;
        motivos.push(`Situação cadastral na Receita Federal: ${sit}`);
    } else {
        motivos.push('Situação cadastral ATIVA na Receita Federal');
    }

    const qtdProt = Number(dados?.protestos?.quantidade) || 0;
    const valProt = Number(dados?.protestos?.valorTotal) || 0;
    const protIncompleto = Boolean(dados?.protestos?.detalhamentoIncompleto);
    if (qtdProt > 0) {
        const descProt = Math.min(55, 18 + (qtdProt - 1) * 4 + (valProt > 50000 ? 12 : valProt > 10000 ? 6 : 0));
        pontos -= descProt;
        motivos.push(`${qtdProt} protesto(s) em cartório (CENPROT)${protIncompleto ? ' — detalhamento incompleto' : ''}`);
    } else {
        motivos.push('Sem protestos em cartório (CENPROT)');
    }

    const qtdCcf = Number(dados?.ccf?.quantidade) || 0;
    if (qtdCcf > 0) {
        const descCcf = Math.min(40, 25 + (qtdCcf - 1) * 5);
        pontos -= descCcf;
        motivos.push(`${qtdCcf} cheque(s) sem fundo (CCF)${dados?.ccf?.ultimaOcorrencia ? ' · últ. ' + dados.ccf.ultimaOcorrencia : ''}`);
    } else {
        motivos.push('Sem cheques devolvidos (CCF)');
    }

    const qtdDiv = Number(dados?.dividasPublicas?.quantidade) || 0;
    const valDiv = Number(dados?.dividasPublicas?.valorTotal) || 0;
    if (qtdDiv > 0) {
        const descDiv = Math.min(45, 20 + (qtdDiv - 1) * 5 + (valDiv > 100000 ? 15 : 5));
        pontos -= descDiv;
        motivos.push(`${qtdDiv} dívida(s) pública(s) ativa(s) com a União/FGTS`);
    } else {
        motivos.push('Sem dívidas públicas com a União');
    }

    const procPassivo = Number(dados?.processos?.poloPassivo) || 0;
    const procAtivo = Number(dados?.processos?.poloAtivo) || 0;
    const procTotal = Number(dados?.processos?.total) || 0;
    const listaAtivos = Array.isArray(dados?.processos?.processos) ? dados.processos.processos : [];
    const valCausasPassivo = listaAtivos
        .filter(p => p.poloCliente === 'PASSIVO')
        .reduce((acc, p) => acc + (Number(p.valorCausa) || 0), 0);
    const temExecucaoPassiva = listaAtivos.some(p => p.poloCliente === 'PASSIVO' && /execu[cç][aã]o|cumprimento de senten[cç]a|fal[eê]ncia|recupera[cç][aã]o/i.test(`${p.classeProcessual} ${p.assunto}`));

    if (procPassivo > 0) {
        let descProc = Math.min(40, procPassivo * 3 + (valCausasPassivo > 500000 ? 12 : valCausasPassivo > 100000 ? 7 : 0) + (temExecucaoPassiva ? 10 : 0));
        pontos -= descProc;
        motivos.push(`${procPassivo} processo(s) ativo(s) no polo passivo (réu)${temExecucaoPassiva ? ' incluindo Execuções/Cumprimento de Sentença' : ''}`);
    } else if (procTotal > 0 && procAtivo === 0) {
        const descProc = Math.min(20, procTotal * 2);
        pontos -= descProc;
        motivos.push(`${procTotal} processo(s) jurídico(s) ativo(s) registrado(s)`);
    } else {
        motivos.push('Nenhum processo jurídico ativo no polo passivo (réu)');
    }

    if (procAtivo > 0) {
        motivos.push(`${procAtivo} processo(s) ativo(s) como autor (polo ativo)`);
    }

    const idade = parseInt(dados?.identificacao?.idadeEmpresa, 10) || 0;
    if (idade > 0 && idade < 1) {
        pontos -= 5;
        motivos.push('Empresa com menos de 1 ano de abertura');
    } else if (idade >= 5) {
        motivos.push(`${idade} anos de tempo de atividade`);
    }

    pontos = Math.max(0, Math.min(100, Math.round(pontos)));

    // ── Regra NostraCredit IA:
    // Apenas considerar nota C para baixo (C, D, E, F) quando a IA da NostraCredit considerar o crédito REPROVADO.
    // Quando a IA NostraCredit considerar como crédito APROVADO, considerar no mínimo como nota B (realizando as análises).
    const textoIA = analiseIAOverride !== undefined ? analiseIAOverride : dados?.analiseIA;
    const parecerIA = _extrairParecerNostraCreditIA(textoIA);

    if (parecerIA === 'REPROVADO') {
        if (pontos >= 75) {
            pontos = 74; // Garante classificação de C para baixo quando reprovado pela IA
        }
        motivos.push('Parecer NostraCredit IA: Crédito Reprovado');
    } else if (parecerIA === 'APROVADO' || (situacaoRegular && parecerIA !== 'REPROVADO')) {
        if (pontos < 75) {
            // Eleva proporcionalmente para a faixa da Nota B (75 a 88 pts), preservando a análise dos indicadores
            pontos = Math.max(75, Math.min(88, Math.round(75 + (pontos / 75) * 12)));
        }
        if (parecerIA === 'APROVADO') {
            motivos.push('Parecer NostraCredit IA: Crédito Aprovado');
        }
    }

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
    } else if (pontos >= 40) {
        nota = 'D'; classificacao = 'Risco Médio-Alto · Atenção'; cor = '#ea580c'; bg = '#ffedd5';
    } else if (pontos >= 20) {
        nota = 'E'; classificacao = 'Risco Alto · Restrições Relevantes'; cor = '#dc2626'; bg = '#fee2e2';
    } else {
        nota = 'F'; classificacao = 'Risco Muito Elevado · Crédito Não Recomendado'; cor = '#991b1b'; bg = '#fecaca';
    }

    return { nota, pontos, classificacao, cor, bg, pareciaIA: parecerIA, motivos };
}

/**
 * Verifica se há consulta válida (< 90 dias) no banco de dados para o CPF/CNPJ.
 */
async function obterConsultaCache90Dias(dbOrFn, documento) {
    const { dbGet, dbRun } = _wrapDb(dbOrFn);
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

    // Invalida cache legado (versões anteriores do parser)
    if (!dados || dados.parserVersion !== CURRENT_PARSER_VERSION) {
        await dbRun('DELETE FROM credithub_consultas WHERE id = ?', [row.id]).catch(() => {});
        return null;
    }

    // Recalcula o score aplicando a regra vigente da IA NostraCredit sobre os dados em cache
    const scoreAtualizado = calcularNotaScoreCreditHub(dados, dados.analiseIA);
    const notaMudou = scoreAtualizado.nota !== row.nota_score ||
        scoreAtualizado.pontos !== row.pontos_score ||
        JSON.stringify(dados.score?.motivos || []) !== JSON.stringify(scoreAtualizado.motivos || []);
    dados.score = scoreAtualizado;
    if (notaMudou) {
        row.nota_score = scoreAtualizado.nota;
        row.pontos_score = scoreAtualizado.pontos;
        await dbRun(
            'UPDATE credithub_consultas SET nota_score = ?, pontos_score = ?, dados_json = ? WHERE id = ?',
            [scoreAtualizado.nota, scoreAtualizado.pontos, JSON.stringify(dados), row.id]
        ).catch(() => {});
    }

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
async function consultarDocumentoCreditHub(dbOrFn, documento, usuarioSistema = 'sistema', forcarNova = false) {
    const { dbRun } = _wrapDb(dbOrFn);
    await ensureTables(dbOrFn);
    const docClean = String(documento || '').replace(/\D/g, '');
    if (docClean.length !== 11 && docClean.length !== 14) {
        throw new Error('Documento inválido. Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).');
    }

    if (!forcarNova) {
        const cached = await obterConsultaCache90Dias(dbOrFn, docClean);
        if (cached) return cached;
    }

    let apiKey = await getValidApiKey(dbOrFn, false);

    const runAllQueries = async (token) => {
        const [finderXml, domText, ieptbXml, ccfXml, jusbrText, basicText] = await Promise.all([
            _execQueryOrPush(token, "SELECT FROM 'FINDER'.'BILLING'", { documento: docClean }, 'cs-finder', 35000),
            _execQueryOrPush(token, "SELECT FROM 'DOMINIOS'.'CONSULTA'", { documento: docClean }, 'cs-dominios', 20000).catch(() => '[]'),
            _execQueryOrPush(token, "SELECT FROM 'IEPTB'.'IEPTBHARLAN'", { documento: docClean }, 'cs-ieptb', 38000).catch(() => null),
            _execQueryOrPush(token, "SELECT FROM 'CCF'.'CONSULTA'", { documento: docClean }, 'cs-ccf', 25000).catch(() => null),
            _execQueryOrPush(token, "SELECT FROM 'JUSBR'.'DOCUMENTO'", { documento: docClean }, 'cs-jusbr', 45000).catch(() => null),
            _callIrqlWithPoW(token, "SELECT FROM 'DOCUMENTHISTORY'.'BASICHISTORY'", { documento: docClean }).catch(() => '')
        ]);
        return { finderXml, domText, ieptbXml, ccfXml, jusbrText, basicText };
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
        identificacao: { cnpj: docClean, razaoSocial: '', nomeFantasia: '', situacao: 'ATIVA', atividadesSecundarias: [] },
        socios: [], enderecos: [], contatos: [], quemConsultou: [], volumeMensal: [], dividasFinder: { quantidade: 0, valorTotal: 0 }
    };

    let dominios = [];
    try {
        const parsedDom = JSON.parse(rawResults.domText || '[]');
        if (Array.isArray(parsedDom)) dominios = parsedDom;
    } catch (_) {}

    const basicHistory = _parseBasicHistory(rawResults.basicText);
    const protestos = _parseIeptbXml(rawResults.ieptbXml);
    const ccf = _parseCcfXml(rawResults.ccfXml, basicHistory.ccfs);
    const processos = _parseJusbrJson(rawResults.jusbrText, docClean, finder.identificacao.razaoSocial);

    const dividasPublicas = {
        quantidade: finder.dividasFinder.quantidade || 0,
        valorTotal: finder.dividasFinder.valorTotal || 0
    };

    const totalOcorrencias = (protestos.quantidade || 0) + (ccf.quantidade || 0) + (dividasPublicas.quantidade || 0) + (processos.total || 0);
    const valorTotalNegativado = (protestos.detalhamentoIncompleto ? 0 : (protestos.valorTotal || 0)) + (ccf.valorTotal || 0) + (dividasPublicas.valorTotal || 0);

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
        parserVersion: CURRENT_PARSER_VERSION,
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

    const analiseIaNostraCredit = await _consultarNostraCreditIA(apiKey, dadosCompletos);
    dadosCompletos.analiseIA = analiseIaNostraCredit;
    const scoreInfo = calcularNotaScoreCreditHub(dadosCompletos, analiseIaNostraCredit);
    dadosCompletos.score = scoreInfo;

    await dbRun('DELETE FROM credithub_consultas WHERE documento = ?', [docClean]).catch(() => {});
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
