const fs = require('fs');

const file = 'backend/server.js';
let content = fs.readFileSync(file, 'utf8');

const search = "const multerUploadMemoria = require('multer')({ storage: require('multer').memoryStorage() });";
const replacement = "const multerUploadMemoria = require('multer')({ storage: require('multer').memoryStorage(), limits: { fieldSize: 100 * 1024 * 1024 } });"; // 100 MB allow

if (content.includes(search)) {
    content = content.replace(search, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Multer memory storage limit increased to 100MB.');
} else {
    console.log('Could not find multerUploadMemoria string.');
}
