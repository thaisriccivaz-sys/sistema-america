const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

const tablesStart = html.indexOf('<!-- DASHBOARD TABLES ROW -->');
const tablesEnd = html.indexOf('                    <div class="card mt-4">', tablesStart);
const tablesStr = html.substring(tablesStart, tablesEnd);

// Remove the tables from their original location
html = html.substring(0, tablesStart) + html.substring(tablesEnd);

// Insert before the charts
const chartsStart = html.indexOf('<!-- DASHBOARD CHARTS ROW -->');
html = html.substring(0, chartsStart) + tablesStr + "\n                    " + html.substring(chartsStart);

fs.writeFileSync('frontend/index.html', html, 'utf8');
