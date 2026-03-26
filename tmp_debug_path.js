const path = require('path');
const fs = require('fs');

const BASE_PATH = "C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Colaboradores";
const foto_path_db = "files/Colaboradores/TESTE_AMERICA/Fotos/FOTO_TESTE_AMERICA_03.jpg";

let file_path = foto_path_db;
if (file_path.startsWith('files/') || file_path.startsWith('files\\')) {
    file_path = path.join(BASE_PATH, '..', file_path.replace(/^files[\\\/]/, ''));
} else if (file_path.startsWith('Colaboradores/') || file_path.startsWith('Colaboradores\\')) {
    file_path = path.join(BASE_PATH, '..', file_path);
}

file_path = path.normalize(file_path);
if (!path.isAbsolute(file_path)) {
    file_path = path.resolve(file_path);
}

console.log('BASE_PATH:', BASE_PATH);
console.log('DB_PATH:', foto_path_db);
console.log('RESOLVED_PATH:', file_path);
console.log('EXISTS:', fs.existsSync(file_path));

// If fails, try to list the parent of RESOLVED_PATH
const parent = path.dirname(file_path);
if (fs.existsSync(parent)) {
    console.log('PARENTS FILES:', fs.readdirSync(parent));
} else {
    console.log('PARENT DOES NOT EXIST:', parent);
}
