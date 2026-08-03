const fs = require('fs');
const path = require('path');

const frontendDir = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Sistema\\Sistema 1\\sistema-america\\frontend';

function searchInDir(dir, query) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchInDir(fullPath, query);
      }
    } else if (file.endsWith('.html') || file.endsWith('.js')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(query) && (line.includes('tab-prop-lista') || line.includes('tab-prop-form') || line.includes('switchPropostaTab'))) {
            console.log(`${file}:${idx + 1}: ${line.trim()}`);
          }
        });
      } catch (e) {}
    }
  });
}

searchInDir(frontendDir, 'tab-prop-lista');
