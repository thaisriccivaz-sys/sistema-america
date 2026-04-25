const fs = require('fs');
let js = fs.readFileSync('frontend/usuarios.js', 'utf8');

// The icons I will map out based on what we had on the left sidebar:
// Dashboard - ph-squares-four, Colaboradores - ph-address-book, Férias - ph-airplane-tilt
// Admissão - ph-list-checks, Integração - ph-users-three, Assinaturas - ph-signature
// Cargos = ph-briefcase, Faculdade = ph-graduation-cap, Geradores = ph-file-text
// EPI = ph-shield-check, Avaliações = ph-clipboard-text, Dissídio = ph-trend-up
// Logística = ph-truck, Financeiro = ph-currency-dollar, Comercial = ph-handshake, Admin = ph-gear
// Usuários = ph-users-three, Chaves = ph-key, Certificado = ph-certificate, Homologação = ph-database

const iconMap = {
    'dashboard': 'ph-squares-four',
    'colaboradores': 'ph-address-book',
    'ferias': 'ph-airplane-tilt',
    'admissao': 'ph-list-checks',
    'integracao': 'ph-users-three',
    'assinaturas-digitais': 'ph-signature',
    'cargos': 'ph-briefcase',
    'faculdade': 'ph-graduation-cap',
    'geradores': 'ph-file-text',
    'ficha-epi': 'ph-shield-check',
    'gerenciar-avaliacoes': 'ph-clipboard-text',
    'dissidio': 'ph-trend-up',
    'logistica-em-breve': 'ph-truck',
    'financeiro-em-breve': 'ph-currency-dollar',
    'comercial-em-breve': 'ph-handshake',
    'admin-em-breve': 'ph-gear',
    'usuarios-permissoes': 'ph-users-three',
    'chaves': 'ph-key',
    'certificado-digital': 'ph-certificate',
    'homologacao': 'ph-database'
};

const regexTelas = /const TELAS_SISTEMA = \[([\s\S]*?)\];/;
const matchTelas = js.match(regexTelas);

if (matchTelas) {
    let telasContent = matchTelas[1];
    
    // Add icone: '' property to all items if they don't have it
    const updatedTelas = telasContent.split('\n').map(line => {
        if (!line.includes('pagina_id:')) return line;
        
        let match = line.match(/pagina_id:\s*'([^']+)'/);
        if (match && match[1]) {
            let id = match[1];
            let icon = iconMap[id] || 'ph-app-window';
            
            // Check if icone already exists on the line
            if (!line.includes('icone:')) {
               return line.replace(/pagina_nome:\s*'([^']+)'(\s*)\}/, \`pagina_nome: '$1', icone: '\${icon}'$2}\`);
            }
        }
        return line;
    }).join('\n');
    
    js = js.replace(telasContent, updatedTelas);
}

// Update the render form to show the icon
const oldBullet = '<span style="font-size:0.85rem;font-weight:600;color:#334155;">&bull; ${nomeTela}</span>';
const newIcon = '<span style="font-size:0.85rem;font-weight:600;color:#334155;display:flex;align-items:center;gap:6px;"><i class="ph ${telaInfo && telaInfo.icone ? telaInfo.icone : \'ph-app-window\'}" style="font-size:1.1rem;color:#f37021;"></i> ${nomeTela}</span>';

if (js.includes(oldBullet)) {
    js = js.replace(oldBullet, newIcon);
    console.log('Bullet replaced with icon!');
} else {
    console.log('Bullet not found. Trying flexible regex.');
    const flexRegex = /<span [^>]*>&bull;\s*\$\{nomeTela\}<\/span>/g;
    js = js.replace(flexRegex, newIcon);
}

fs.writeFileSync('frontend/usuarios.js', js, 'utf8');
console.log('Icons added to TELAS_SISTEMA and renderer updated.');
