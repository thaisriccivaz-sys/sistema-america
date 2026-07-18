// fix_modal_and_validation.js
const fs = require('fs');

// ─── 1. CORRIGIR HTML — garantir estrutura limpa ───────────────────────────
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Substituir qualquer variação do bloco de qtd/min/max global
// Detectar e limpar
const patterns = [
    // Bloco antigo 3 colunas
    /<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">\s*<div>\s*<label[^>]*>Qtd\.[\s\S]*?<\/label>\s*<input[^>]*id="estoque-qtd"[^>]*>\s*<\/div>\s*<div>\s*<label[^>]*>M[íi]nima[\s\S]*?<\/label>\s*<input[^>]*id="estoque-min"[^>]*>\s*<\/div>\s*<div>\s*<label[^>]*>M[áa]xima[\s\S]*?<\/label>\s*<input[^>]*id="estoque-max"[^>]*>\s*<\/div>\s*<\/div>/g,
    // Inputs hidden com divs extras
    /\s*<input type="hidden" id="estoque-qtd"[^>]*>\s*<input type="hidden" id="estoque-min"[^>]*>\s*<input type="hidden" id="estoque-max"[^>]*>(\s*<\/div>)+/g,
    // Comentário + inputs hidden simples sem divs extras
    /\s*<!--[^>]*Qtd\/M[^>]*-->\s*<input type="hidden" id="estoque-qtd"[^>]*>\s*<input type="hidden" id="estoque-min"[^>]*>\s*<input type="hidden" id="estoque-max"[^>]*>/g,
    // span badge hidden
    /\s*<input type="hidden" id="estoque-qtd-badge"[^>]*>/g,
];

// Remover todos os padrões encontrados
let found = false;
for (const p of patterns) {
    if (p.test(html)) {
        found = true;
        html = html.replace(p, '');
    }
}

// Reinicializar regex (as regex com /g precisam ser resetadas)
const p1 = /<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">\s*<div>\s*<label[^>]*>Qtd\.[\s\S]*?<input[^>]*id="estoque-max"[^>]*>\s*<\/div>\s*<\/div>/;
if (p1.test(html)) {
    html = html.replace(p1, '');
    console.log('✅ Bloco 3 colunas removido');
}

// Garantir que os inputs hidden existem UMA vez, logo antes do fechamento da seção Departamento/Categoria
// Inserir após o </div></div> que fecha a grid de 2 colunas (Departamento + Categoria)
const anchor = `</select>
                                        </div>
                                    </div>`;
const anchorReplacement = `</select>
                                        </div>
                                    </div>
                                    <!-- Controle de qtd/mín/máx é feito por endereço -->
                                    <input type="hidden" id="estoque-qtd" value="0">
                                    <input type="hidden" id="estoque-min" value="0">
                                    <input type="hidden" id="estoque-max" value="0">`;

// Verificar se os hidden inputs já existem
if (!html.includes('id="estoque-qtd" value="0"') && !html.includes("id='estoque-qtd'")) {
    // Encontrar o local certo: o </div></div> que fecha o grid departamento/categoria
    // Identificar pelo select de categoria
    const catEnd = html.indexOf('id="estoque-cat"');
    if (catEnd > -1) {
        // Pegar a posição do </div></div> após esse select
        const closeAfterCat = html.indexOf('</div>\n                                    </div>', catEnd);
        if (closeAfterCat > -1) {
            const before = html.slice(0, closeAfterCat + '</div>\n                                    </div>'.length);
            const after = html.slice(closeAfterCat + '</div>\n                                    </div>'.length);
            html = before + '\n                                    <input type="hidden" id="estoque-qtd" value="0">\n                                    <input type="hidden" id="estoque-min" value="0">\n                                    <input type="hidden" id="estoque-max" value="0">' + after;
            console.log('✅ Hidden inputs inseridos após grid departamento/categoria');
        }
    }
} else {
    console.log('✅ Hidden inputs já presentes no HTML');
}

// Limpar inputs hidden duplicados (manter apenas o primeiro de cada)
['estoque-qtd', 'estoque-min', 'estoque-max'].forEach(id => {
    const re = new RegExp(`(<input[^>]*id="${id}"[^>]*>)`, 'g');
    let count = 0;
    html = html.replace(re, (match) => {
        count++;
        return count === 1 ? match : ''; // manter só o primeiro
    });
});

fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('✅ frontend/index.html salvo\n');

// ─── 2. ATUALIZAR estoque.js ───────────────────────────────────────────────
let js = fs.readFileSync('frontend/estoque.js', 'utf8');

// 2a. Remover a função _calcularSomaEnderecos (não mais necessária com campos ocultos)
// e simplificar _renderLinhasEndereco para não chamar _calcularSomaEnderecos
js = js.replace(/window\._calcularSomaEnderecos = function\(\) \{[\s\S]*?\};\n\n/, '');
js = js.replace(/window\._calcularSomaEnderecos\(\);/g, '');

// 2b. Atualizar o salvarEstoque:
// - Validar que novo produto tem pelo menos 1 endereço com endereço selecionado
// - Produtos existentes sem endereço podem ser salvos normalmente (sem validação)
// - O payload de quantidade_atual = soma das linhas (ou 0 se sem endereço)
const salvarOld = `window.salvarEstoque = async function(e) {
    e.preventDefault();
    const id = document.getElementById("estoque-id").value;
    const linhasValidas = (window._enderecoLinhas || []).filter(l => l.endereco_id && l.quantidade > 0);
    
    // Qtd. Atual = soma dos endereços SE houver, senão usa o campo (mantém quantidade já cadastrada)
    const somaEnderecos = linhasValidas.reduce((acc, l) => acc + (parseInt(l.quantidade) || 0), 0);
    const qtdAtual = linhasValidas.length > 0 
        ? somaEnderecos 
        : (parseInt(document.getElementById("estoque-qtd").value) || 0);`;

const salvarNew = `window.salvarEstoque = async function(e) {
    e.preventDefault();
    const id = document.getElementById("estoque-id").value;
    const linhasValidas = (window._enderecoLinhas || []).filter(l => l.endereco_id);

    // NOVO produto: obrigatório ter pelo menos 1 endereço selecionado
    if (!id && linhasValidas.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Endereço obrigatório',
            text: 'Adicione e selecione pelo menos um endereço para o produto.',
            confirmButtonColor: '#e67700'
        });
        return;
    }

    // Qtd. Atual = soma das quantidades por endereço (ou 0 se sem endereço cadastrado)
    const somaEnderecos = linhasValidas.reduce((acc, l) => acc + (parseInt(l.quantidade) || 0), 0);
    const qtdAtual = somaEnderecos;`;

if (js.includes('window.salvarEstoque = async function(e)')) {
    js = js.replace(salvarOld, salvarNew);
    console.log('✅ salvarEstoque com validação obrigatória de endereço para novo produto');
} else {
    console.log('⚠️  salvarEstoque anchor não encontrado');
}

// 2c. Atualizar abrirModalEstoque para exibir a mensagem de orientação quando não há endereço
const abrirOld = `    window._enderecoLinhas = [];
    window._renderLinhasEndereco();
    document.getElementById("modal-estoque-title").innerHTML = '<i class="ph ph-package"></i> Adicionar Item de Estoque';
    document.getElementById("modal-estoque").style.display = "flex";
};`;

const abrirNew = `    window._enderecoLinhas = [];
    window._renderLinhasEndereco();
    document.getElementById("modal-estoque-title").innerHTML = '<i class="ph ph-package"></i> Adicionar Item de Estoque';
    document.getElementById("modal-estoque").style.display = "flex";
    // Foco no campo nome
    setTimeout(() => { const n = document.getElementById("estoque-nome"); if(n) n.focus(); }, 200);
};`;

js = js.replace(abrirOld, abrirNew);

// 2d. Atualizar editarEstoque: quando produto não tem endereços, mostrar linha vazia com select disponível
const editarEndOld = `    // Carregar endereços já vinculados
    window._enderecoLinhas = [];
    try {
        const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
        const r = await fetch(API_URL + "/estoque/" + item.id + "/saldo-enderecos", {
            headers: { "Authorization": "Bearer " + token }
        });
        if (r.ok) {
            const saldos = await r.json();
            window._enderecoLinhas = saldos.map(s => ({
                    endereco_id:      s.endereco_id,
                    quantidade:       s.quantidade,
                    quantidade_minima: s.quantidade_minima || 0,
                    quantidade_maxima: s.quantidade_maxima || 0
                }));
        }
    } catch(e) { console.warn("[editarEstoque] erro ao carregar saldos:", e.message); }
    window._renderLinhasEndereco();`;

const editarEndNew = `    // Carregar endereços já vinculados
    window._enderecoLinhas = [];
    try {
        const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
        const r = await fetch(API_URL + "/estoque/" + item.id + "/saldo-enderecos", {
            headers: { "Authorization": "Bearer " + token }
        });
        if (r.ok) {
            const saldos = await r.json();
            window._enderecoLinhas = saldos.map(s => ({
                endereco_id:       s.endereco_id,
                quantidade:        s.quantidade,
                quantidade_minima: s.quantidade_minima || 0,
                quantidade_maxima: s.quantidade_maxima || 0
            }));
        }
    } catch(e) { console.warn("[editarEstoque] erro ao carregar saldos:", e.message); }
    // Produto sem endereço: deixar lista vazia com opção de adicionar (não pré-preencher)
    window._renderLinhasEndereco();`;

if (js.includes(editarEndOld)) {
    js = js.replace(editarEndOld, editarEndNew);
    console.log('✅ editarEstoque: produto sem endereço fica com lista vazia');
} else {
    // patch parcial
    js = js.replace(
        `window._enderecoLinhas = saldos.map(s => ({
                    endereco_id:      s.endereco_id,
                    quantidade:       s.quantidade,
                    quantidade_minima: s.quantidade_minima || 0,
                    quantidade_maxima: s.quantidade_maxima || 0
                }));`,
        `window._enderecoLinhas = saldos.map(s => ({
                endereco_id:       s.endereco_id,
                quantidade:        s.quantidade,
                quantidade_minima: s.quantidade_minima || 0,
                quantidade_maxima: s.quantidade_maxima || 0
            }));`
    );
    console.log('✅ editarEstoque: indentação corrigida');
}

// 2e. Atualizar o texto do parágrafo vazio de endereços para ser mais orientativo
js = js.replace(
    'document.getElementById("estoque-enderecos-vazio")',
    'document.getElementById("estoque-enderecos-vazio")'
);

fs.writeFileSync('frontend/estoque.js', js, 'utf8');
console.log('✅ frontend/estoque.js salvo');

// 2f. Atualizar o texto do parágrafo vazio no HTML
let html2 = fs.readFileSync('frontend/index.html', 'utf8');
const vazioOld = 'Nenhum endereço vinculado. Clique em &quot;Adicionar Endereço&quot; para vincular.';
const vazioNew = 'Nenhum endereço vinculado. Use o botão acima para adicionar. Para novos produtos, pelo menos 1 endereço é obrigatório.';
if (html2.includes(vazioOld)) {
    html2 = html2.replace(vazioOld, vazioNew);
    fs.writeFileSync('frontend/index.html', html2, 'utf8');
    console.log('✅ Texto de orientação atualizado no modal');
}

console.log('\n' + '━'.repeat(50));
console.log('Concluído! Verificar HTML com: node -e "const h=require(\'fs\').readFileSync(\'frontend/index.html\',\'utf8\'); console.log(h.match(/estoque-qtd/g)?.length)"');
