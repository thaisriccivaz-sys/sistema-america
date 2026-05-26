const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'frontend', 'pipeline.js');
let c = fs.readFileSync(filePath, 'utf8');

// Find and replace the compact card block (lines 1656-1661)
const OLD = `    if (compact) {
        return \`<div onclick="pipelineAbrirOS(\${os.id},'\${(os.numero_os||'').replace(/'/g,"\\\\'")}')"
            style="background:\${bg};border-left:3px solid \${border};border-radius:5px;padding:3px 6px;margin-bottom:3px;cursor:pointer;font-size:0.68rem;color:\${textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
            title="\${cliente} | \${endereco} | \${os.numero_os || ''} | \${qtd} equip.">
            <span style="font-weight:700;">\${os.numero_os || '—'}</span> \${badgeContrato} \${cliente}
        </div>\`;
    }`;

const NEW = `    if (compact) {
        return \`<div onclick="pipelineAbrirOS(\${os.id},'\${(os.numero_os||'').replace(/'/g,"\\\\'")}')"
            style="background:\${bg};border-left:3px solid \${border};border-radius:5px;padding:3px 6px;margin-bottom:3px;cursor:pointer;overflow:hidden;"
            title="\${cliente} | \${endereco} | \${os.numero_os || ''} | \${qtd} equip.">
            <div style="font-size:0.68rem;color:\${textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;">
                <span style="font-weight:800;">\${os.numero_os || '—'}</span> \${badgeContrato} \${cliente}
            </div>
            \${endereco ? \`<div style="font-size:0.59rem;color:#94a3b8;font-weight:300;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;letter-spacing:0.01em;line-height:1.3;">\${endereco}</div>\` : ''}
        </div>\`;
    }`;

if (c.includes(OLD.substring(0, 50))) {
    // Try partial match approach
    const idx = c.indexOf('if (compact) {');
    console.log('Found compact block at index:', idx);
    
    // Use line-based replacement
    const lines = c.split('\n');
    let startLine = -1, endLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('if (compact) {') && startLine === -1) {
            startLine = i;
        }
        if (startLine !== -1 && lines[i].trim() === '}' && i > startLine + 3) {
            endLine = i;
            break;
        }
    }
    console.log('startLine:', startLine, 'endLine:', endLine);
    if (startLine !== -1 && endLine !== -1) {
        const newLines = [
            ...lines.slice(0, startLine),
            NEW,
            ...lines.slice(endLine + 1)
        ];
        fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
        console.log('SUCCESS: compact card block replaced');
    } else {
        console.log('ERROR: Could not find block boundaries');
    }
} else {
    console.log('OLD string not found, trying direct indexOf...');
    const idx = c.indexOf('white-space:nowrap;overflow:hidden;text-overflow:ellipsis;');
    console.log('Found style at index:', idx);
    console.log('Context:', c.substring(idx - 100, idx + 200));
}
