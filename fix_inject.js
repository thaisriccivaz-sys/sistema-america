const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');

// Find the exact line "                            }" followed by blank line and "                             const mergedPdfBytes"
// and inject the Comunicacao block in between

// Use line-by-line approach
const lines = c.split('\n');
let insertAfter = -1;

for (let i = 0; i < lines.length; i++) {
    // Find: line with "temEmprMerged = true;" followed by close brace, then blank, then "const mergedPdfBytes"
    if (lines[i].includes('temEmprMerged = true;')) {
        // look ahead: next non-empty should be the closing brace } of if block, then blank, then "const mergedPdfBytes"
        for (let j = i+1; j < Math.min(i+5, lines.length); j++) {
            if (lines[j].trim() === '}') {
                // check if a few lines after is "const mergedPdfBytes"
                for (let k = j+1; k < Math.min(j+5, lines.length); k++) {
                    if (lines[k].includes('const mergedPdfBytes = await basePdfDoc.save()')) {
                        insertAfter = j; // insert after the closing brace
                        break;
                    }
                }
                break;
            }
        }
        if (insertAfter !== -1) break;
    }
}

if (insertAfter !== -1) {
    // Check if not already injected
    const alreadyInjected = lines.slice(insertAfter, insertAfter + 8).some(l => l.includes('temComMerged'));
    if (alreadyInjected) {
        console.log('Already injected, skipping.');
    } else {
        const injection = [
            '',
            '                             // Comunicação genérica: por último de tudo',
            '                             let temComMerged = false;',
            '                             if (bufCom) {',
            '                                 const comPdfDoc = await PDFDocument.load(bufCom);',
            '                                 const comPages = await basePdfDoc.copyPages(comPdfDoc, comPdfDoc.getPageIndices());',
            '                                 comPages.forEach(p => basePdfDoc.addPage(p));',
            '                                 temComMerged = true;',
            '                             }',
        ];
        lines.splice(insertAfter + 1, 0, ...injection);
        fs.writeFileSync('backend/server.js', lines.join('\n'), 'utf8');
        console.log('Injected Comunicacao merge at line ' + (insertAfter + 1));
    }
} else {
    console.log('Could not find insertion point!');
    // debug: show lines around temEmprMerged
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('temEmprMerged = true;')) {
            console.log('Found temEmprMerged at line', i+1);
            for (let j = i; j < Math.min(i+10, lines.length); j++) {
                console.log(j+1, ':', lines[j]);
            }
        }
    }
}
