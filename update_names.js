const fs = require('fs');
let file = fs.readFileSync('frontend/rota_redonda.js', 'utf8');

// Replace EXL with ELX in EQUIPAMENTOS_DICT
file = file.replace(/'EXL OBRA':/g, "'ELX OBRA':");
file = file.replace(/'EXL O'/g, "'ELX O'");
file = file.replace(/'EXL EVENTO':/g, "'ELX EVENTO':");
file = file.replace(/'EXL E'/g, "'ELX E'");

// Replace in switch statements
file = file.replace(/case 'EXL OBRA':/g, "case 'ELX OBRA':");
file = file.replace(/case 'EXL EVENTO':/g, "case 'ELX EVENTO':");

// Replace SLX with ELX in switch statements
file = file.replace(/case 'SLX OBRA':/g, "case 'ELX OBRA':");
file = file.replace(/case 'SLX EVENTO':/g, "case 'ELX EVENTO':");

// Replace in MAP_PROD
file = file.replace(/'LX': 'LX', 'EXL': 'EXL', 'SLX': 'SLX',/g, "'LX': 'LX', 'ELX': 'ELX', 'EXL': 'ELX', 'SLX': 'ELX',");

fs.writeFileSync('frontend/rota_redonda.js', file);
console.log('Done!');
