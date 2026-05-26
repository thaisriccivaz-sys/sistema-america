const fs = require('fs');
let content = fs.readFileSync('frontend/comercial_credenciamento.js', 'utf8');

const oldFunc = "window._switchLicencaTab";
const newFuncBlock = `
window._switchLicencaTab = function(empKey) {
    document.querySelectorAll('.solic-lic-tab-btn').forEach(btn => {
        const ativo = btn.dataset.emp === empKey;
        btn.style.background = ativo ? '#7048e8' : '#f1f5f9';
        btn.style.color = ativo ? '#fff' : '#475569';
        btn.style.borderColor = ativo ? '#7048e8' : '#e2e8f0';
        btn.style.fontWeight = ativo ? '700' : '400';
    });
    document.querySelectorAll('.solic-lic-panel').forEach(panel => {
        panel.style.display = panel.dataset.emp === empKey ? 'grid' : 'none';
    });
};

window._updateLicencasTabCounts = function() {
    document.querySelectorAll('.solic-lic-tab-btn').forEach(btn => {
        const emp = btn.dataset.emp;
        const panel = document.querySelector(\`.solic-lic-panel[data-emp="\${emp}"]\`);
        if (panel) {
            const count = panel.querySelectorAll('input[type="checkbox"]:checked').length;
            const span = btn.querySelector('.tab-count');
            if (span) span.textContent = \`(\${count})\`;
        }
    });
};
`;

content = content.replace(/window\._switchLicencaTab = function[\s\S]*?};/, newFuncBlock);

// Now update _carregarLicencasAgrupadas
const oldTabsHtml = "const tabsHtml = todasEmpresas.map(emp => {";
const newTabsHtml = `const tabsHtml = todasEmpresas.map(emp => {
            const ativo = emp === primeiraEmp;
            return \`<button type="button" class="solic-lic-tab-btn" data-emp="\${emp}" onclick="window._switchLicencaTab('\${emp}')"
                style="padding:6px 14px; border-radius:6px; border:1.5px solid \${ativo ? '#7048e8' : '#e2e8f0'};
                background:\${ativo ? '#7048e8' : '#f1f5f9'}; color:\${ativo ? '#fff' : '#475569'};
                font-weight:\${ativo ? '700' : '400'}; font-size:13px; cursor:pointer; white-space:nowrap;">
                <i class="ph ph-buildings"></i> \${emp}
                <span class="tab-count" style="font-size:11px; opacity:0.75;">(0)</span>
            </button>\`;
        }).join('');`;

content = content.replace(/const tabsHtml = todasEmpresas\.map\(emp => \{[\s\S]*?\}\)\.join\(''\);/, newTabsHtml);

// And update checkbox to trigger update
const oldCheckbox = "return `<label style=\"display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; padding:4px 0;\">\n                        <input type=\"checkbox\" name=\"solic_licencas\" value=\"${l.id}\" data-nome=\"${l.nome}\" data-empresa=\"${emp}\" ${checked}>\n                        ${l.nome}\n                    </label>`;";
const newCheckbox = "return `<label style=\"display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; padding:4px 0;\">\n                        <input type=\"checkbox\" name=\"solic_licencas\" value=\"${l.id}\" data-nome=\"${l.nome}\" data-empresa=\"${emp}\" ${checked} onchange=\"window._updateLicencasTabCounts()\">\n                        ${l.nome}\n                    </label>`;";

content = content.replace(oldCheckbox, newCheckbox);

// Trigger initial count calculation right after rendering
const oldEnd = "            ${panelsHtml}\n        `;\n    } catch (e) {";
const newEnd = "            ${panelsHtml}\n        `;\n        window._updateLicencasTabCounts();\n    } catch (e) {";

content = content.replace(oldEnd, newEnd);

fs.writeFileSync('frontend/comercial_credenciamento.js', content, 'utf8');
console.log("comercial_credenciamento.js updated with dynamic tab counts!");