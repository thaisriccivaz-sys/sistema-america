const apiKey = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd';
const accountId = '10237785fb23cf473d54845a013e';

async function test(url) {
    try {
        console.log(`Testing ${url}...`);
        const res = await fetch(url, {
            headers: { 'X-Api-Key': apiKey }
        });
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Body: ${text.substring(0, 200)}`);
    } catch (e) {
        console.error(`Error for ${url}: ${e.message}`);
    }
}

async function run() {
    await test(`https://api.assinafy.com.br/v1/accounts/${accountId}/documents`);
    await test(`https://api.assinafy.com/v1/accounts/${accountId}/documents`);
    await test(`https://api.assinafy.com.br/v1/documents`);
    await test(`https://api.assinafy.com.br/v2/accounts/${accountId}/documents`);
}
run();
