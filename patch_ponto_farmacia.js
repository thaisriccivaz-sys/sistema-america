/**
 * patch_ponto_farmacia.js
 * 1. Fix farmácia: fallback nome + fix cell.querySelector + debug info
 * 2. Botão Buscar Ponto (RHID) na toolbar do fechamento
 * 3. Funções buscarPontoTodos + aplicarPontoNaTabela
 */
const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');
const orig = code.length;

function replaceOnce(str, find, replace, label) {
    const idx = str.indexOf(find);
    if (idx === -1) { console.log('  ❌ NÃO encontrou:', label || find.substring(0, 70)); return str; }
    console.log('  ✅', label || find.substring(0, 70));
    return str.substring(0, idx) + replace + str.substring(idx + find.length);
}

// ===========================================================================
// 1. FIX FARMÁCIA: cell.querySelector + fallback nome + debug
// ===========================================================================
// Problema: cell.querySelector('input') pode retornar null se o input está
// dentro de um <div style="display:flex..."><span>R$</span><input>
// Fix: cell.querySelector('input') já deve funcionar, mas vamos garantir
// e adicionar fallback por nome.

const oldFarmaciaBlock = `            let atualizados = 0;
            _dados.forEach((row, idx) => {
                const cpf = (row.cpf || '').replace(/[.\\-]/g, '');
                if (json.farmacia[cpf]) {
                    const val = json.farmacia[cpf].valor;
                    _dados[idx].farmacia = val;
                    // Atualizar input na tela
                    const cell = document.getElementById(\`fech-cell-farmacia-\${idx}\`);
                    if (cell) cell.querySelector('input').value = val;
                    atualizar(idx, 'farmacia', val);
                    atualizados++;
                }
            });
            Swal.fire({ icon: 'success', title: \`Farmácia processada!\`, text: \`\${atualizados} colaboradores com desconto. Total de entradas: \${Object.keys(json.farmacia).length}.\`, timer: 3000, showConfirmButton: false });`;

// Normalizar nome: sem acento, uppercase, só letras e espaço
const newFarmaciaBlock = `            let atualizados = 0;
            // Índice de nomes normalizados do PDF para fallback
            var normPdf = {};
            Object.keys(json.farmacia).forEach(function(cpfKey) {
                var nomePdf = (json.farmacia[cpfKey].nome || '').toUpperCase()
                    .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
                normPdf[nomePdf] = cpfKey;
            });
            _dados.forEach((row, idx) => {
                var cpf = (row.cpf || '').replace(/[.\\-]/g, '');
                var matchKey = null;
                // 1. Match por CPF
                if (json.farmacia[cpf]) {
                    matchKey = cpf;
                } else {
                    // 2. Fallback: match por nome normalizado
                    var nomeColab = (row.nome_completo || '').toUpperCase()
                        .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
                    // Tentar match direto
                    if (normPdf[nomeColab]) {
                        matchKey = normPdf[nomeColab];
                    } else {
                        // Tentar match parcial (todas as palavras do nome do PDF existem no nome do colaborador)
                        Object.keys(normPdf).forEach(function(nomePdfKey) {
                            if (!matchKey) {
                                var palavrasPdf = nomePdfKey.split(' ').filter(Boolean);
                                var palavrasColab = nomeColab.split(' ').filter(Boolean);
                                // Match se >=3 palavras do PDF estão no nome do colaborador
                                var matches = palavrasPdf.filter(function(p) { return palavrasColab.includes(p); });
                                if (matches.length >= Math.min(3, palavrasPdf.length)) {
                                    matchKey = normPdf[nomePdfKey];
                                }
                            }
                        });
                    }
                }
                if (matchKey !== null) {
                    var val = json.farmacia[matchKey].valor;
                    _dados[idx].farmacia = val;
                    // Atualizar input na tela
                    var cell = document.getElementById('fech-cell-farmacia-' + idx);
                    if (cell) {
                        var inp = cell.querySelector('input');
                        if (inp) inp.value = parseFloat(val).toFixed(2);
                    }
                    atualizar(idx, 'farmacia', val);
                    atualizados++;
                }
            });
            // Mostrar resultado com debug
            var naoEncontrados = _dados.filter(function(r) {
                var c = (r.cpf||'').replace(/[.\\-]/g,'');
                return !json.farmacia[c];
            }).length;
            var debugInfo = json.debug_cpfs && json.debug_cpfs.length
                ? '\\n\\nCPFs no PDF: ' + json.debug_cpfs.slice(0,5).join(', ') + (json.debug_cpfs.length>5 ? '...' : '')
                : '';
            Swal.fire({ icon: 'success', title: 'Farmácia processada!', text: atualizados + ' colaboradores com desconto de ' + Object.keys(json.farmacia).length + ' no PDF.' + debugInfo, timer: 4000, showConfirmButton: false });`;

code = replaceOnce(code, oldFarmaciaBlock, newFarmaciaBlock, 'Fix farmácia match + fallback nome');

// ===========================================================================
// 2. BOTÃO BUSCAR PONTO na toolbar
// ===========================================================================
// Adicionar logo antes do separador flex:1
const oldToolbarSep = '    <div style="flex:1;min-width:20px;"></div>';
const newToolbarSep = `    <!-- Buscar Ponto RHID -->
    <button id="fech-btn-buscar-ponto" onclick="window._fechamento.buscarPontoTodos()" style="background:#0f172a;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;">
      <i class="ph ph-fingerprint"></i> Buscar Ponto (RHID)
    </button>
    <span id="fech-badge-ponto" style="font-size:.75rem;color:#374151;display:none;"></span>

    <div style="flex:1;min-width:20px;"></div>`;

code = replaceOnce(code, oldToolbarSep, newToolbarSep, 'Botão Buscar Ponto na toolbar');

// ===========================================================================
// 3. Variável _dadosPonto e funções buscarPontoTodos + aplicarPontoNaTabela
// ===========================================================================
// Adicionar _dadosPonto logo após _stateArquivos
code = replaceOnce(code,
    'var _stateArquivos = { farmacia: false, mercado_texto: null, consignado: false };',
    'var _stateArquivos = { farmacia: false, mercado_texto: null, consignado: false };\n    var _dadosPonto = {}; // { colaborador_id: dadosRHID } — persiste entre filtros',
    '_dadosPonto declaration'
);

// Funções novas — inserir antes do return final
const anchorReturn = '    return {\r\n        init, buscar,';
const idxReturn = code.indexOf(anchorReturn);
if (idxReturn === -1) { console.log('❌ return não encontrado'); process.exit(1); }

// Converter horas decimais ou minutos para HH:MM
const funcoes = [
    '    // Converte minutos em HH:MM',
    '    function minToHH(min) {',
    '        if (!min && min !== 0) return "";',
    '        var h = Math.floor(Math.abs(min) / 60);',
    '        var m = Math.abs(min) % 60;',
    '        return (min < 0 ? "-" : "") + String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0");',
    '    }',
    '',
    '    // Aplica dados do RHID na linha do colaborador',
    '    function aplicarPontoNaTabela(idx, dados) {',
    '        if (!_dados[idx]) return;',
    '        // H.Trab. = dias trabalhados × 8h em HH:MM (ou usar totalHorasMinutos se disponível)',
    '        var diasTrab = dados.diasTrabalhados || 0;',
    '        var htrab = minToHH(diasTrab * 8 * 60);',
    '        // Extras: diasComHoraExtra como referência — não temos breakdown 60%/100% da API',
    '        // Faltas',
    '        var faltas = dados.faltas || 0;',
    '        // Atualizar _dados',
    '        if (htrab) { _dados[idx].horas_trabalhadas = htrab; }',
    '        _dados[idx].dias_falta = faltas;',
    '        // Atualizar tela',
    '        var trEls = document.querySelectorAll("#fech-tbody tr");',
    '        trEls.forEach(function(tr) {',
    '            if (parseInt(tr.dataset.idx) !== idx) return;',
    '            // H.Trab input',
    '            var inputs = tr.querySelectorAll("input");',
    '            inputs.forEach(function(inp) {',
    '                var oi = inp.getAttribute("oninput") || "";',
    '                if (oi.includes("horas_trabalhadas") && htrab) inp.value = htrab;',
    '                if (oi.includes("dias_falta") && faltas !== undefined) inp.value = faltas;',
    '            });',
    '        });',
    '        atualizar(idx, "dias_falta", faltas);',
    '    }',
    '',
    '    async function buscarPontoTodos() {',
    '        if (!_mes || !_ano) { Swal.fire({ icon: "warning", text: "Busque um mês antes de carregar o ponto." }); return; }',
    '        var btn = document.getElementById("fech-btn-buscar-ponto");',
    '        var badge = document.getElementById("fech-badge-ponto");',
    '        if (btn) { btn.disabled = true; btn.innerHTML = "<i class=\\"ph ph-spinner\\"></i> Buscando..."; }',
    '        if (badge) badge.style.display = "none";',
    '',
    '        var colabsComCpf = _dados.filter(function(r) { return r.cpf || r.colaborador_id; });',
    '        var ok = 0, semCadastro = 0, erros = 0;',
    '        var nomesOk = [], nomesSem = [];',
    '',
    '        Swal.fire({ title: "Buscando ponto...", html: "0 / " + colabsComCpf.length + " colaboradores", allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });',
    '',
    '        var total = colabsComCpf.length;',
    '        var concluidos = 0;',
    '',
    '        await Promise.allSettled(colabsComCpf.map(async function(row) {',
    '            var cpf = (row.cpf || "").replace(/[.\\-]/g, "");',
    '            var idx = _dados.indexOf(row);',
    '            if (!cpf) { semCadastro++; nomesSem.push(row.nome_completo); concluidos++; return; }',
    '            try {',
    '                var resp = await fetch("/api/diretoria/controlid/ponto-colaborador?cpf=" + encodeURIComponent(cpf) + "&mes=" + _mes + "&ano=" + _ano,',
    '                    { headers: { "Authorization": "Bearer " + getToken() } });',
    '                var dados = await resp.json();',
    '                if (dados.success && dados.encontrado) {',
    '                    _dadosPonto[row.colaborador_id || row.id] = dados;',
    '                    aplicarPontoNaTabela(idx, dados);',
    '                    ok++;',
    '                    nomesOk.push(row.nome_completo);',
    '                } else {',
    '                    semCadastro++;',
    '                    nomesSem.push(row.nome_completo);',
    '                }',
    '            } catch(e) {',
    '                erros++;',
    '            }',
    '            concluidos++;',
    '            Swal.update({ html: concluidos + " / " + total + " colaboradores" });',
    '        }));',
    '',
    '        Swal.close();',
    '        if (btn) { btn.disabled = false; btn.innerHTML = "<i class=\\"ph ph-fingerprint\\"></i> Buscar Ponto (RHID)"; }',
    '',
    '        var mesFmt = String(_mes).padStart(2,"0") + "/" + _ano;',
    '        if (badge) {',
    '            badge.style.display = "inline";',
    '            badge.innerHTML = ok + " encontrados" + (semCadastro > 0 ? " / " + semCadastro + " sem cadastro" : "") + (erros > 0 ? " / " + erros + " erros" : "");',
    '        }',
    '',
    '        var msgTipo = ok > 0 ? "success" : "warning";',
    '        var msgTxt = ok + " colaborador(es) com ponto carregado.";',
    '        if (semCadastro > 0) msgTxt += "\\n" + semCadastro + " sem cadastro no RHID: " + nomesSem.slice(0,3).join(", ") + (nomesSem.length > 3 ? "..." : "");',
    '        if (erros > 0) msgTxt += "\\n" + erros + " erros de conexão.";',
    '        Swal.fire({ icon: msgTipo, title: "Ponto " + mesFmt, text: msgTxt, timer: 5000, showConfirmButton: ok === 0 });',
    '    }',
    '',
].join('\r\n');

code = code.substring(0, idxReturn) + funcoes + '\r\n' + anchorReturn + code.substring(idxReturn + anchorReturn.length);
console.log('  ✅ buscarPontoTodos + aplicarPontoNaTabela inseridos');

// Exportar as novas funções
code = replaceOnce(code,
    '        uploadFarmacia, uploadConsignado, verFarmacia, verConsignado, verMercado,',
    '        uploadFarmacia, uploadConsignado, verFarmacia, verConsignado, verMercado, buscarPontoTodos,',
    'Exportar buscarPontoTodos'
);

// ===========================================================================
// SALVAR
// ===========================================================================
fs.writeFileSync('frontend/fechamento.js', code, 'utf8');
console.log('✅ Salvo, tamanho:', code.length, '(era:', orig, ')');
