const fs = require('fs');
let js = fs.readFileSync('frontend/credenciamento.js', 'utf8');

const matchStr = 'const dtFormatada = d.toLocaleDateString(\'pt-BR\') + \' às \' + d.toLocaleTimeString(\'pt-BR\', {hour: \'2-digit\', minute:\'2-digit\'});\n        }\n\n        const colabs = cred.colaboradores_ids ? JSON.parse(cred.colaboradores_ids) : [];';

let replaceStartIdx = js.indexOf('let statusBadge = \'\';');
let replaceEndIdx = js.indexOf('}).join(\'\');', replaceStartIdx);

let newLogic = `
        let acoes = '';
        if (cred.status === 'solicitado') {
            acoes = \`<button class="btn btn-primary" style="padding:4px 12px; font-size:12px;" onclick="window.abrirModalCumprirSolicitacao('\${cred.id}')"><i class="ph ph-plus"></i> Adicionar</button>\`;
        } else {
            acoes = \`<a href="/credenciamento-publico.html?token=\${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">
                <i class="ph ph-link"></i> Link
            </a>\`;
        }

        // Alterar badge se solicitado
        let statusBadge = '';
        const expirado = cred.valid_until && (new Date() > new Date(cred.valid_until));
        
        if (cred.status === 'solicitado') {
            const dtLim = cred.data_limite_envio ? new Date(cred.data_limite_envio).toLocaleDateString('pt-BR') : '-';
            statusBadge = \`<span style="color:#eab308; font-weight:600;"><i class="ph ph-clock"></i> Solicitado (Limite: \${dtLim})</span>\`;
        } else if (expirado) {
            statusBadge = \`<span style="color:#dc2626; font-weight:600;"><i class="ph ph-x-circle"></i> Expirado</span>\`;
        } else if (cred.acessado_em) {
            const acessDt = new Date(cred.acessado_em);
            const acessStr = acessDt.toLocaleDateString('pt-BR') + ' às ' + acessDt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            statusBadge = \`<span style="color:#16a34a; font-weight:600;"><i class="ph ph-check-circle"></i> Acessado em \${acessStr}</span>\`;
        } else {
            statusBadge = \`<span style="color:#4f46e5; font-weight:600;"><i class="ph ph-paper-plane-right"></i> Enviado em \${dtFormatada}</span>\`;
        }

        return \`
        <tr>
            <td>
                <b>\${cred.cliente_nome}</b><br>
                <span style="font-size:0.8rem; color:#64748b;">\${cred.cliente_email}</span>
                \${cred.endereco_instalacao ? \`<br><span style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-map-pin"></i> \${cred.endereco_instalacao}</span>\` : ''}
            </td>
            <td style="font-size:0.8rem; line-height:1.6;">\${colabsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\${veicsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\${licencasText}</td>
            <td style="font-size:0.85rem;">\${statusBadge}</td>
            <td style="text-align:right; white-space:nowrap;">\${acoes}</td>
        </tr>\`;
        `;

if (replaceStartIdx !== -1 && replaceEndIdx !== -1) {
    js = js.substring(0, replaceStartIdx) + newLogic + '\n    ' + js.substring(replaceEndIdx);
} else {
    console.log('could not patch table row generation');
}

if (!js.includes('abrirModalCumprirSolicitacao')) {
    js += `
// ── Cumprir Solicitação do Comercial ──────────────────────────────────────────
window.abrirModalCumprirSolicitacao = function(id) {
    const cred = window._historicoCredDados.find(c => c.id == id);
    if (!cred) return;

    window.abrirModalNovoCredenciamento();
    
    // Configura os campos
    document.getElementById('cred-cliente-nome').value = cred.cliente_nome || '';
    document.getElementById('cred-cliente-nome').disabled = true;
    
    document.getElementById('cred-cliente-email').value = cred.cliente_email || '';
    document.getElementById('cred-cliente-email').disabled = true;
    
    document.getElementById('cred-endereco-instalacao').value = cred.endereco_instalacao || '';
    document.getElementById('cred-endereco-instalacao').disabled = true;
    
    // Docs
    const docs = cred.docs_exigidos ? JSON.parse(cred.docs_exigidos) : [];
    document.querySelectorAll('#cred-docs-exigidos input[type="checkbox"]').forEach(c => {
        c.checked = docs.includes(c.value);
        c.disabled = true;
    });

    // Licenças
    const lics = cred.licencas_ids ? JSON.parse(cred.licencas_ids) : [];
    credenciamentoState.licencas = lics;
    if (typeof renderListaLicencasCred === 'function') renderListaLicencasCred();
    const llist = document.getElementById('cred-licencas-list');
    if (llist) llist.style.pointerEvents = 'none';
    
    // Limpar Colabs e Veiculos caso tenha sujeira
    credenciamentoState.colabsSelecionados = [];
    credenciamentoState.veicsSelecionados = [];
    if (typeof renderListaColabsCred === 'function') renderListaColabsCred();
    if (typeof renderListaVeicCred === 'function') renderListaVeicCred();
    
    // Atualizar botão enviar para usar o ID
    const btn = document.getElementById('btn-enviar-cred');
    if (btn) {
        btn.setAttribute('onclick', \`window.cumprirSolicitacaoCredenciamento('\${id}')\`);
        btn.innerHTML = '<i class="ph ph-paper-plane-right"></i> Finalizar Credenciamento e Enviar';
    }
};

window.cumprirSolicitacaoCredenciamento = async function(id) {
    if (credenciamentoState.colabsSelecionados.length === 0) {
        alert("Selecione pelo menos um colaborador.");
        return;
    }

    const btn = document.getElementById('btn-enviar-cred');
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando Link...';
    btn.disabled = true;

    try {
        const payload = {
            colaboradores: credenciamentoState.colabsSelecionados.map(c => ({id: c.id, nome: c.nome || c.nome_completo})),
            veiculos: credenciamentoState.veicsSelecionados.map(v => ({id: v.id, placa: v.placa, marca_modelo_versao: v.marca_modelo_versao}))
        };

        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(\`/api/logistica/credenciamento/\${id}/enviar\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar credenciamento.');

        alert("Credenciamento finalizado e e-mail enviado ao cliente com sucesso!");
        if (typeof window.fecharModalNovoCredenciamento === 'function') window.fecharModalNovoCredenciamento();
        if (typeof window.carregarHistoricoCredenciamento === 'function') window.carregarHistoricoCredenciamento();
    } catch(e) {
        alert(e.message);
    } finally {
        btn.innerHTML = '<i class="ph ph-paper-plane-right"></i> Gerar e Enviar E-mail';
        btn.disabled = false;
    }
};

const _oldFechar = window.fecharModalNovoCredenciamento;
window.fecharModalNovoCredenciamento = function() {
    if (_oldFechar) _oldFechar();
    setTimeout(() => {
        const cn = document.getElementById('cred-cliente-nome');
        if (cn) cn.disabled = false;
        
        const ce = document.getElementById('cred-cliente-email');
        if (ce) ce.disabled = false;
        
        const ei = document.getElementById('cred-endereco-instalacao');
        if (ei) ei.disabled = false;
        
        document.querySelectorAll('#cred-docs-exigidos input[type="checkbox"]').forEach(c => c.disabled = false);
        const llist = document.getElementById('cred-licencas-list');
        if (llist) llist.style.pointerEvents = 'auto';
        
        const btn = document.getElementById('btn-enviar-cred');
        if (btn) {
            btn.setAttribute('onclick', 'window.gerarEnviarCredenciamento()');
            btn.innerHTML = '<i class="ph ph-paper-plane-right"></i> Gerar e Enviar E-mail';
        }
    }, 300);
}
`;
}

fs.writeFileSync('frontend/credenciamento.js', js, 'utf8');
console.log('patched successfully');
