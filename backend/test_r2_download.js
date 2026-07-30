require('dotenv').config();
const r2 = require('./utils/r2');
async function test() {
    try {
        const fileData = await r2.downloadStreamFromR2('cargos/1/anexos/1_test.doc');
        console.log('Success:', !!fileData.stream, fileData.contentType, fileData.contentLength);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
test();
