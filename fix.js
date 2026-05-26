const fs = require('fs');

let content = fs.readFileSync('frontend/pipeline.js', 'utf8');

content = content.replace(
    "    const _t = (os.tipo_servico || '').toLowerCase();\n    const bgCard     = _t.includes('obra')   ? '#dbeafe' : _t.includes('evento') ? '#e9d5ff' : '#ffffff';\n    const borderCard = _t.includes('obra')   ? '#93c5fd' : _t.includes('evento') ? '#d8b4fe' : '#e2e8f0';",
    `    const _t = (os.tipo_servico || '').toLowerCase();
    
    let tipoContrato = (os.tipo_os || '').toLowerCase();
    if (!tipoContrato) {
        if (_t.includes('obra')) tipoContrato = 'obra';
        else if (_t.includes('evento')) tipoContrato = 'evento';
        else if (prods.some(p => (p.desc || '').toUpperCase().includes('OBRA'))) tipoContrato = 'obra';
        else if (prods.some(p => (p.desc || '').toUpperCase().includes('EVENTO'))) tipoContrato = 'evento';
    }

    const bgCard     = tipoContrato.includes('obra') ? '#e0f2fe' : tipoContrato.includes('evento') ? '#f3e8ff' : '#ffffff';
    const borderCard = tipoContrato.includes('obra') ? '#7dd3fc' : tipoContrato.includes('evento') ? '#d8b4fe' : '#e2e8f0';`
).replace(
    "    const _t = (os.tipo_servico || '').toLowerCase();\r\n    const bgCard     = _t.includes('obra')   ? '#dbeafe' : _t.includes('evento') ? '#e9d5ff' : '#ffffff';\r\n    const borderCard = _t.includes('obra')   ? '#93c5fd' : _t.includes('evento') ? '#d8b4fe' : '#e2e8f0';",
    `    const _t = (os.tipo_servico || '').toLowerCase();
    
    let tipoContrato = (os.tipo_os || '').toLowerCase();
    if (!tipoContrato) {
        if (_t.includes('obra')) tipoContrato = 'obra';
        else if (_t.includes('evento')) tipoContrato = 'evento';
        else if (prods.some(p => (p.desc || '').toUpperCase().includes('OBRA'))) tipoContrato = 'obra';
        else if (prods.some(p => (p.desc || '').toUpperCase().includes('EVENTO'))) tipoContrato = 'evento';
    }

    const bgCard     = tipoContrato.includes('obra') ? '#e0f2fe' : tipoContrato.includes('evento') ? '#f3e8ff' : '#ffffff';
    const borderCard = tipoContrato.includes('obra') ? '#7dd3fc' : tipoContrato.includes('evento') ? '#d8b4fe' : '#e2e8f0';`
);

content = content.replace(
    "    const endFull = [os.endereco, os.complemento, os.cep ? `CEP: ${os.cep}` : ''].filter(Boolean).join(', ');",
    `    let endFull = [os.endereco, os.complemento, os.cep ? \`CEP: \${os.cep}\` : ''].filter(Boolean).join(', ');
    endFull = endFull.replace(/S[A-ZÃÁÀÂÄ]\\W?O PAULO/gi, 'SÃO PAULO').replace(/S[A-ZÃÁÀÂÄ]\\W?O BERNARDO/gi, 'SÃO BERNARDO').replace(/S[A-ZÃÁÀÂÄ]\\W?O CAETANO/gi, 'SÃO CAETANO').replace(/S[A-ZÃÁÀÂÄ]\\W?O LOUREN/gi, 'SÃO LOUREN').replace(/SÃ[^A-Z]?O\\b/gi, 'SÃO');`
);

content = content.replace(
    "                <span onclick=\"pipelineEditarTipoContrato(event, ${os.id}, '${(_t||'').replace(/'/g,\"\\\\'\")}')\" style=\"cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;\" title=\"Clique para alterar Obra/Evento\">\n                    ${pipelineGetIconServico(os.tipo_servico)}\n                </span>",
    `                <span onclick="pipelineEditarTipoContrato(event, \${os.id}, '\${(_t||'').replace(/'/g,"\\\\'")}')" style="cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform 0.2s;height:18px;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" title="Clique para alterar Obra/Evento">
                    \${tipoContrato.includes('obra') ? '<img src="assets/obra.png" style="height:16px;width:auto;" alt="Obra">' : tipoContrato.includes('evento') ? '<img src="assets/evento.png" style="height:16px;width:auto;" alt="Evento">' : '<span style="font-size:1.1rem;color:#cbd5e1;" title="Indefinido"><i class="ph ph-question"></i></span>'}
                </span>`
).replace(
    "                <span onclick=\"pipelineEditarTipoContrato(event, ${os.id}, '${(_t||'').replace(/'/g,\"\\\\'\")}')\" style=\"cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;\" title=\"Clique para alterar Obra/Evento\">\r\n                    ${pipelineGetIconServico(os.tipo_servico)}\r\n                </span>",
    `                <span onclick="pipelineEditarTipoContrato(event, \${os.id}, '\${(_t||'').replace(/'/g,"\\\\'")}')" style="cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform 0.2s;height:18px;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" title="Clique para alterar Obra/Evento">
                    \${tipoContrato.includes('obra') ? '<img src="assets/obra.png" style="height:16px;width:auto;" alt="Obra">' : tipoContrato.includes('evento') ? '<img src="assets/evento.png" style="height:16px;width:auto;" alt="Evento">' : '<span style="font-size:1.1rem;color:#cbd5e1;" title="Indefinido"><i class="ph ph-question"></i></span>'}
                </span>`
);

content = content.replace(
    "        ${(!_t.includes('entrega') && !_t.includes('retirada') && !(_t.includes('manutencao obra') || _t.includes('manutenção obra') || (_t.includes('vac') && _t.includes('obra')))) ? `\n        <div style=\"font-size:0.68rem;color:#64748b;margin-bottom:2px;margin-top:3px;\">\n            ${pipelineGetIconServico(os.tipo_servico)} <b>${(os.tipo_servico||'').toUpperCase()}</b>\n        </div>` : ''}",
    `        \${(!_t.includes('entrega') && !_t.includes('retirada') && !(_t.includes('manutencao obra') || _t.includes('manutenção obra') || (_t.includes('vac') && _t.includes('obra')))) ? \\\`
        <div style="font-size:0.68rem;color:#64748b;margin-bottom:2px;margin-top:3px;">
            <b>\${(os.tipo_servico||'').toUpperCase()}</b>
        </div>\\\` : ''}`
).replace(
    "        ${(!_t.includes('entrega') && !_t.includes('retirada') && !(_t.includes('manutencao obra') || _t.includes('manutenção obra') || (_t.includes('vac') && _t.includes('obra')))) ? `\r\n        <div style=\"font-size:0.68rem;color:#64748b;margin-bottom:2px;margin-top:3px;\">\r\n            ${pipelineGetIconServico(os.tipo_servico)} <b>${(os.tipo_servico||'').toUpperCase()}</b>\r\n        </div>` : ''}",
    `        \${(!_t.includes('entrega') && !_t.includes('retirada') && !(_t.includes('manutencao obra') || _t.includes('manutenção obra') || (_t.includes('vac') && _t.includes('obra')))) ? \\\`
        <div style="font-size:0.68rem;color:#64748b;margin-bottom:2px;margin-top:3px;">
            <b>\${(os.tipo_servico||'').toUpperCase()}</b>
        </div>\\\` : ''}`
);

fs.writeFileSync('frontend/pipeline.js', content, 'utf8');
