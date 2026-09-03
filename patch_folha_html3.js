const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// 1) Add fechamento.js script tag after recibos.js
html = html.replace(
    '<script src="recibos.js?v=20260804v5" defer></script>',
    '<script src="recibos.js?v=20260804v5" defer></script>\r\n    <script src="fechamento.js?v=20260828v1" defer></script>'
);
console.log('script tag added:', html.includes('fechamento.js'));

// 2) Insert view-fechamento before view-recibos
const viewAnchor = '<!-- VIEW: RECIBOS -->';
const viewInsert = `<!-- VIEW: FECHAMENTO MENSAL -->
                <section id="view-fechamento" class="content-view" style="padding:0; background:#f8fafc;">
                    <div id="fechamento-container"></div>
                </section>

                <!-- VIEW: RECIBOS -->`;
html = html.replace(viewAnchor, viewInsert);
console.log('view-fechamento added:', html.includes('view-fechamento'));

fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('Done! Size:', html.length);
