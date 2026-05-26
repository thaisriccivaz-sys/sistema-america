import re

with open('frontend/pipeline.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: bgCard and borderCard logic + add tipoContrato
content = re.sub(
    r'    const _t = \(os\.tipo_servico \|\| \'\'\)\.toLowerCase\(\);\n    const bgCard     = _t\.includes\(\'obra\'\)   \? \'#dbeafe\' : _t\.includes\(\'evento\'\) \? \'#e9d5ff\' : \'#ffffff\';\n    const borderCard = [^\n]+;',
    r'''    const _t = (os.tipo_servico || '').toLowerCase();
    
    let tipoContrato = (os.tipo_os || '').toLowerCase();
    if (!tipoContrato) {
        if (_t.includes('obra')) tipoContrato = 'obra';
        else if (_t.includes('evento')) tipoContrato = 'evento';
        else if (prods.some(p => (p.desc || '').toUpperCase().includes('OBRA'))) tipoContrato = 'obra';
        else if (prods.some(p => (p.desc || '').toUpperCase().includes('EVENTO'))) tipoContrato = 'evento';
    }

    const bgCard     = tipoContrato.includes('obra') ? '#e0f2fe' : tipoContrato.includes('evento') ? '#f3e8ff' : '#ffffff';
    const borderCard = tipoContrato.includes('obra') ? '#7dd3fc' : tipoContrato.includes('evento') ? '#d8b4fe' : '#e2e8f0';''',
    content
)

# Fix 2: Icon next to OS number
content = re.sub(
    r'<span onclick=\"pipelineEditarTipoContrato\(event, \$\{os\.id\}, \'[^>]+\" title=\"Clique para alterar Obra/Evento\">\s*\$\{pipelineGetIconServico\(os\.tipo_servico\)\}\s*</span>',
    r'''<span onclick=\"pipelineEditarTipoContrato(event, , \'\')\" style=\"cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform 0.2s;height:18px;\" onmouseover=\"this.style.transform=\'scale(1.1)\'\" onmouseout=\"this.style.transform=\'scale(1)\'\" title=\"Clique para alterar Obra/Evento\">
                    
                </span>''',
    content
)

with open('frontend/pipeline.js', 'w', encoding='utf-8') as f:
    f.write(content)
