const fs = require('fs');
let c = fs.readFileSync('frontend/app.js', 'utf8');

// Insert Folha section 7 populate code after brigadista validade line
const anchor = "if (document.getElementById('colab-brigadista-validade')) document.getElementById('colab-brigadista-validade').value = c.brigadista_validade || '';\r\n\r\n        // Add selected keys row by row";

const folhaLoadCode = `if (document.getElementById('colab-brigadista-validade')) document.getElementById('colab-brigadista-validade').value = c.brigadista_validade || '';

        // ── 7. Folha — carregar campos ao abrir colaborador ────────────────────────
        // Academia desconto
        if (document.getElementById('colab-academia-desconto-valor')) {
            document.getElementById('colab-academia-desconto-valor').value = c.academia_desconto_valor || 0;
        }
        // Insalubridade (Folha)
        const _folhaInsRad = document.querySelector(\`input[name="folha_insalubridade"][value="\${c.folha_insalubridade ? '1' : '0'}"]\`);
        if (_folhaInsRad) { _folhaInsRad.checked = true; toggleFolhaField('insalubridade', _folhaInsRad.value); }
        if (document.getElementById('colab-folha-insalubridade-valor')) document.getElementById('colab-folha-insalubridade-valor').value = c.folha_insalubridade_valor || 0;
        // Periculosidade (Folha)
        const _folhaPericRad = document.querySelector(\`input[name="folha_periculosidade"][value="\${c.folha_periculosidade ? '1' : '0'}"]\`);
        if (_folhaPericRad) { _folhaPericRad.checked = true; toggleFolhaField('periculosidade', _folhaPericRad.value); }
        if (document.getElementById('colab-folha-periculosidade-valor')) document.getElementById('colab-folha-periculosidade-valor').value = c.folha_periculosidade_valor || 0;
        // Mensalidade Sindical (Folha)
        const _folhaSindRad = document.querySelector(\`input[name="folha_mensalidade_sindical"][value="\${c.folha_mensalidade_sindical ? '1' : '0'}"]\`);
        if (_folhaSindRad) { _folhaSindRad.checked = true; toggleFolhaField('sindical', _folhaSindRad.value); }
        if (document.getElementById('colab-folha-mensalidade-sindical-valor')) document.getElementById('colab-folha-mensalidade-sindical-valor').value = c.folha_mensalidade_sindical_valor || 0;
        // Pensão Alimentícia (Folha)
        const _folhaPensValor = c.folha_pensao_pct > 0 ? 'Sim' : 'Não';
        const _folhaPensRad = document.querySelector(\`input[name="folha_pensao_alimenticia_rh"][value="\${_folhaPensValor}"]\`);
        if (_folhaPensRad) { _folhaPensRad.checked = true; toggleFolhaField('pensao', _folhaPensValor); }
        if (document.getElementById('colab-folha-pensao-tipo') && c.folha_pensao_tipo) document.getElementById('colab-folha-pensao-tipo').value = c.folha_pensao_tipo;
        if (document.getElementById('colab-folha-pensao-pct')) document.getElementById('colab-folha-pensao-pct').value = c.folha_pensao_pct || 0;
        // PLR (Folha)
        const _folhaPlrRad = document.querySelector(\`input[name="folha_plr"][value="\${c.folha_plr ? '1' : '0'}"]\`);
        if (_folhaPlrRad) { _folhaPlrRad.checked = true; toggleFolhaField('plr', _folhaPlrRad.value); }
        if (document.getElementById('colab-folha-plr-valor')) document.getElementById('colab-folha-plr-valor').value = c.folha_plr_valor || 0;
        if (c.folha_plr && c.folha_plr_meses) {
            try {
                const mesesArr = JSON.parse(c.folha_plr_meses || '[]');
                document.querySelectorAll('.plr-mes-check').forEach(el => { el.checked = mesesArr.includes(el.value); });
            } catch(e) {}
        }
        // Vale Refeição - VR (Folha)
        const _folhaVrRad = document.querySelector(\`input[name="folha_vr"][value="\${c.folha_vr ? '1' : '0'}"]\`);
        if (_folhaVrRad) { _folhaVrRad.checked = true; toggleFolhaField('vr', _folhaVrRad.value); }
        if (document.getElementById('colab-folha-vr-valor')) document.getElementById('colab-folha-vr-valor').value = c.folha_vr_valor || 0;
        // Vale Alimentação - VA (Folha)
        const _folhaVaRad = document.querySelector(\`input[name="folha_va"][value="\${c.folha_va ? '1' : '0'}"]\`);
        if (_folhaVaRad) { _folhaVaRad.checked = true; toggleFolhaField('va', _folhaVaRad.value); }
        if (document.getElementById('colab-folha-va-valor')) document.getElementById('colab-folha-va-valor').value = c.folha_va_valor || 0;
        // ── fim 7. Folha ────────────────────────────────────────────────────────────

        // Add selected keys row by row`;

if (c.includes(anchor)) {
    c = c.replace(anchor, folhaLoadCode);
    fs.writeFileSync('frontend/app.js', c, 'utf8');
    console.log('app.js Folha section load code added OK');
} else {
    console.log('Anchor not found');
}
