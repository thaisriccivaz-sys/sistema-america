const fs = require('fs');
const code = fs.readFileSync('frontend/estoque.js', 'utf8');

// Modifica salvarEstoque para usar o novo endpoint de sync-enderecos
const oldSalvar = `        // Sincronizar apenas os endereços que foram preenchidos
        // Produtos sem endereço mantêm a quantidade como está no banco
        for (const linha of linhasValidas) {
            try {
                await fetch(API_URL + "/estoque/" + prodId + "/saldo-enderecos", {
                    method: "POST",
                    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        endereco_id:       linha.endereco_id, 
                        quantidade:        linha.quantidade,
                        quantidade_minima: linha.quantidade_minima || 0,
                        quantidade_maxima: linha.quantidade_maxima || 0,
                        motivo: id ? "Ajuste manual" : "Saldo inicial" 
                    })
                });
            } catch(es) { console.warn("[ESTOQUE] saldo endereco:", es.message); }
        }`;

const newSalvar = `        // Sincronizar endereços com o novo endpoint que apaga os removidos
        try {
            await fetch(API_URL + "/estoque/" + prodId + "/sync-enderecos", {
                method: "POST",
                headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    enderecos: linhasValidas.map(l => ({
                        endereco_id:       l.endereco_id,
                        quantidade:        l.quantidade,
                        quantidade_minima: l.quantidade_minima || 0,
                        quantidade_maxima: l.quantidade_maxima || 0
                    }))
                })
            });
        } catch(es) { console.warn("[ESTOQUE] erro ao sincronizar enderecos:", es.message); }`;

let updatedCode = code.replace(oldSalvar, newSalvar);

// Encontrar modal de endereços globais para limpar cache se editou ou excluiu
const oldExcluirEnd = `window.excluirEnderecoEstoque = async function(id) {
    if(!confirm("Tem certeza que deseja excluir este endereço?")) return;
    const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
    try {
        const res = await fetch(API_URL + "/estoque-enderecos/" + id, { method: "DELETE", headers: { "Authorization": "Bearer " + token } });
        if(!res.ok) throw new Error("Erro ao excluir");
        window.abrirModalEnderecosEstoque();
    } catch(e) { Swal.fire("Erro", e.message, "error"); }
};`;

const newExcluirEnd = `window.excluirEnderecoEstoque = async function(id) {
    if(!confirm("Tem certeza que deseja excluir este endereço?")) return;
    const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
    try {
        const res = await fetch(API_URL + "/estoque-enderecos/" + id, { method: "DELETE", headers: { "Authorization": "Bearer " + token } });
        if(!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Erro ao excluir");
        }
        window._estoqueEnderecos = []; // limpar cache
        window.abrirModalEnderecosEstoque();
        window.carregarEstoque(); // atualiza a tabela principal
    } catch(e) { Swal.fire("Erro", e.message, "error"); }
};`;

updatedCode = updatedCode.replace(oldExcluirEnd, newExcluirEnd);

const oldSalvarEnd = `window.salvarEnderecoEstoque = async function(e) {
    e.preventDefault();
    const id = document.getElementById("end-estoque-id").value;
    const nome = document.getElementById("end-estoque-nome").value;
    const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
    const url = id ? API_URL + "/estoque-enderecos/" + id : API_URL + "/estoque-enderecos";
    const method = id ? "PUT" : "POST";
    try {
        const res = await fetch(url, {
            method,
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ nome })
        });
        if(!res.ok) throw new Error("Erro ao salvar endereço");
        document.getElementById("form-endereco-estoque").reset();
        document.getElementById("end-estoque-id").value = "";
        window.abrirModalEnderecosEstoque();
    } catch(err) { Swal.fire("Erro", err.message, "error"); }
};`;

const newSalvarEnd = `window.salvarEnderecoEstoque = async function(e) {
    e.preventDefault();
    const id = document.getElementById("end-estoque-id").value;
    const nome = document.getElementById("end-estoque-nome").value;
    const token = window.currentToken || localStorage.getItem("erp_token") || localStorage.getItem("token");
    const url = id ? API_URL + "/estoque-enderecos/" + id : API_URL + "/estoque-enderecos";
    const method = id ? "PUT" : "POST";
    try {
        const res = await fetch(url, {
            method,
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ nome })
        });
        if(!res.ok) throw new Error("Erro ao salvar endereço");
        document.getElementById("form-endereco-estoque").reset();
        document.getElementById("end-estoque-id").value = "";
        window._estoqueEnderecos = []; // limpar cache
        window.abrirModalEnderecosEstoque();
        window.carregarEstoque(); // atualiza a tabela principal
    } catch(err) { Swal.fire("Erro", err.message, "error"); }
};`;

updatedCode = updatedCode.replace(oldSalvarEnd, newSalvarEnd);

fs.writeFileSync('frontend/estoque.js', updatedCode, 'utf8');
console.log('Frontend changes applied successfully.');
