const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Fix line 2897 that has \r\r at the end (double carriage return) + remove orphan </body> + dupes
// Line 2897: frota_resumo.js\r\r
// Line 2898: </body>\r
// Line 2899: multas_logistica.js?v=30\r
// Line 2900: frota.js?v=3\r
// Line 2901: \r

// Replace this exact problematic block
const badBlock = '    <script src="frota_resumo.js?v=4"></script>\r\r\n</body>\r\n    <script src="multas_logistica.js?v=30"></script>\r\n    <script src="frota.js?v=3"></script>\r\n\r\n';
const goodBlock = '    <script src="frota_resumo.js?v=4"></script>\r\n';

if (html.includes(badBlock)) {
    html = html.replace(badBlock, goodBlock);
    console.log('Block replaced successfully!');
} else {
    console.log('Block not found exactly. Trying alternative...');
    // Try with different endings
    const badBlock2 = '    <script src="frota_resumo.js?v=4"></script>\r\r\n</body>\r\n    <script src="multas_logistica.js?v=30"></script>\r\n    <script src="frota.js?v=3"></script>';
    if (html.includes(badBlock2)) {
        html = html.replace(badBlock2, '    <script src="frota_resumo.js?v=4"></script>');
        console.log('Alternative block replaced!');
    } else {
        // Manual index-based approach
        const idx = html.indexOf('<script src="frota_resumo.js?v=4"></script>');
        if (idx >= 0) {
            const end = html.indexOf('<!-- Global Scroll-to-Top', idx);
            const original = html.substring(idx, end);
            console.log('Found block:', JSON.stringify(original));
            html = html.substring(0, idx) + '    <script src="frota_resumo.js?v=4"></script>\r\n\r\n    ' + html.substring(end);
            console.log('Manual replacement done!');
        }
    }
}

// Count final occurrences
console.log('multas_logistica.js:', (html.match(/src="multas_logistica\.js/g) || []).length, 'times');
console.log('frota.js:', (html.match(/src="frota\.js/g) || []).length, 'times');
console.log('</body>:', (html.match(/<\/body>/g) || []).length, 'times');

fs.writeFileSync('frontend/index.html', html);
console.log('Done!');
