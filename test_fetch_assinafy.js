const fetch = require('node-fetch');
async function run() {
    const rInfo = await fetch(`https://api.assinafy.com.br/v1/documents/24e58b16-cdb7-4c4c-83b3-8201a07010f3`, { headers: { 'X-Api-Key': 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd' } });
    const json = await rInfo.json();
    console.log(json.data.status, json.data.signed_file_url, json.data.document_pdf);
}
run();
