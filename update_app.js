const fs = require('fs');
let appJs = fs.readFileSync('frontend/app.js', 'utf8');

if (!appJs.includes('logistica-entregas')) {
    appJs = appJs.replace(
        /'logistica-pipeline':\s*\{\s*color:\s*'#[^']+',\s*icon:\s*'[^']+',\s*title:\s*'[^']+'\s*\},/,
        match => match + "\n    'logistica-entregas':             { color: '#2d9e5f', icon: 'ph-package',       title: 'Entregas' },"
    );
    fs.writeFileSync('frontend/app.js', appJs);
    console.log('updated TAB_META in app.js');
} else {
    console.log('already has logistica-entregas');
}