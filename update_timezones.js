const fs = require('fs');

function processFile(path) {
    let content = fs.readFileSync(path, 'utf8');

    // Utility function to format date
    const dateUtil = `
function formatUTCDate(dateStr) {
    if (!dateStr) return 'Data não registrada';
    const isoStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const finalStr = isoStr.endsWith('Z') ? isoStr : isoStr + 'Z';
    return new Date(finalStr).toLocaleString('pt-BR');
}
`;

    // Ensure utility function is added if not present
    if (!content.includes('function formatUTCDate')) {
        content = dateUtil + content;
    }

    // Replace all new Date(X).toLocaleString('pt-BR') with formatUTCDate(X)
    content = content.replace(/new Date\(cred\.created_at\)\.toLocaleString\('pt-BR'\)/g, "formatUTCDate(cred.created_at)");
    content = content.replace(/new Date\(cred\.enviado_em\)\.toLocaleString\('pt-BR'\)/g, "formatUTCDate(cred.enviado_em)");
    content = content.replace(/new Date\(cred\.acessado_em\)\.toLocaleString\('pt-BR'\)/g, "formatUTCDate(cred.acessado_em)");
    
    // Check for accessor with acessDt
    content = content.replace(/const acessDt = new Date\(cred\.acessado_em\);\s*const acessStr = acessDt\.toLocaleDateString\('pt-BR'\) \+ ' às ' \+ acessDt\.toLocaleTimeString\('pt-BR', \{hour: '2-digit', minute:'2-digit'\}\);/g, 
        "const acessStr = formatUTCDate(cred.acessado_em).replace(',', ' às');");

    // Fix other instances
    content = content.replace(/const dt = new Date\(cred\.created_at\);\s*const dtFormatada = dt\.toLocaleDateString\('pt-BR'\) \+ ' às ' \+ dt\.toLocaleTimeString\('pt-BR', \{hour: '2-digit', minute:'2-digit'\}\);/g, 
        "const dtFormatada = formatUTCDate(cred.created_at).replace(',', ' às');");

    fs.writeFileSync(path, content, 'utf8');
}

processFile('frontend/comercial_credenciamento.js');
processFile('frontend/credenciamento.js');
console.log("Fixed Timezones");