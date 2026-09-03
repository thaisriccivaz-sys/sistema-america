const fs = require('fs');
const path = require('path');
const basePath = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\Folha\\Junho 2026';

// Use the same pattern that server.js uses
const pdfParseMod = require('pdf-parse');
const pdfParse = typeof pdfParseMod === 'function' ? pdfParseMod : (pdfParseMod.default || Object.values(pdfParseMod).find(v => typeof v === 'function'));

console.log('pdf-parse exports:', typeof pdfParseMod, Object.keys(pdfParseMod));
