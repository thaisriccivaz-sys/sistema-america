const fs = require('fs');
const path = 'frontend/logistica_senhas.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Status filter next to Link filter
content = content.replace(
    /<div style="position:relative;">\s*<i class="ph ph-funnel" style="position:absolute;left:12px;top:50%;transform:translateY\(-50%\);color:#94a3b8;font-size:1rem;"><\/i>\s*<input type="text" id="filter-senha-link"/,
    `<div style="position:relative;">
                    <select id="filter-senha-status" onchange="filtrarSenhasMulti()" style="width:100%;padding:0.6rem 0.75rem 0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;background:#fff;color:#64748b;appearance:none;cursor:pointer;">
                        <option value="">Todos os Status</option>
                        <option value="ativo">🟢 Ativo</option>
                        <option value="inativo">🔴 Inativo</option>
                    </select>
                </div>
                <div style="position:relative;">
                    <i class="ph ph-funnel" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;"></i>
                    <input type="text" id="filter-senha-link"`
);

// 2. Add Status column header
content = content.replace(
    /<th>Nome<\/th>\s*<th>Serviço \/ Acesso<\/th>/,
    `<th>Status</th>\n                            <th>Nome</th>\n                            <th>Serviço / Acesso</th>`
);

// 3. Update table rendering for colspan
content = content.replace(
    /<tr><td colspan="6" style=/g,
    `<tr><td colspan="7" style=`
);
content = content.replace(
    /<tr><td colspan="\$\{showDono \? 7 : 6\}" style=/g,
    `<tr><td colspan="\${showDono ? 8 : 7}" style=`
);

// 4. Update table rendering for Status column
content = content.replace(
    /tr\.innerHTML = `\s*<td style="font-weight:600; color:#1e293b;">\$\{s\.nome \|\| '<span style="color:#94a3b8;">-<\/span>'\}<\/td>/,
    `
        const statusClass = (s.colab_status === 'Desligado') ? 'color:#ef4444;background:#fee2e2;' : 'color:#155724;background:#d4edda;';
        const statusIcon = (s.colab_status === 'Desligado') ? '🔴 Inativo' : '🟢 Ativo';
        
        tr.innerHTML = \`
            <td><span style="\${statusClass} padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:600; white-space:nowrap;">\${statusIcon}</span></td>
            <td style="font-weight:600; color:#1e293b;">\${s.nome || '<span style="color:#94a3b8;">-</span>'}</td>`
);

// 5. Update filter logic
content = content.replace(
    /const fLink = document\.getElementById\('filter-senha-link'\)\?.value\.toLowerCase\(\)\.trim\(\) \|\| '';/,
    `const fLink = document.getElementById('filter-senha-link')?.value.toLowerCase().trim() || '';
    const fStatus = document.getElementById('filter-senha-status')?.value || '';`
);
content = content.replace(
    /let matchLink = true;/,
    `let matchLink = true;
        let matchStatus = true;`
);
content = content.replace(
    /if \(fLink\) matchLink = s\.link && s\.link\.toLowerCase\(\)\.includes\(fLink\);/,
    `if (fLink) matchLink = s.link && s.link.toLowerCase().includes(fLink);
        if (fStatus === 'ativo') matchStatus = s.colab_status !== 'Desligado';
        if (fStatus === 'inativo') matchStatus = s.colab_status === 'Desligado';`
);
content = content.replace(
    /return matchServico && matchUsuario && matchLink && matchTab;/,
    `return matchServico && matchUsuario && matchLink && matchStatus && matchTab;`
);

// 6. Update Nome input to have a datalist
content = content.replace(
    /<input type="text" id="senha-nome" placeholder="Ex: Conta Principal" autocomplete="off">/,
    `<input type="text" id="senha-nome" list="colaboradores-senha-list" placeholder="Nome do Colaborador (ou Conta Principal)" autocomplete="off">
                            <datalist id="colaboradores-senha-list"></datalist>`
);

// 7. Fetch colaboradores in carregarSenhas or initLogisticaSenhas
content = content.replace(
    /carregarSenhas\(\);/,
    `carregarSenhas();\n    carregarColaboradoresParaSenhas();`
);
content += `\n
function carregarColaboradoresParaSenhas() {
    fetch('/api/colaboradores', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('erp_token') }
    })
    .then(r => r.json())
    .then(data => {
        const datalist = document.getElementById('colaboradores-senha-list');
        if (!datalist) return;
        datalist.innerHTML = '';
        data.forEach(c => {
            const option = document.createElement('option');
            option.value = c.nome_completo;
            datalist.appendChild(option);
        });
    })
    .catch(console.error);
}
`;

fs.writeFileSync(path, content, 'utf8');
console.log('Updated logistica_senhas.js');