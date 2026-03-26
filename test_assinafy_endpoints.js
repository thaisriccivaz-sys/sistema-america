const apiKey = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd';
const accountId = '10237785fb23cf473d54845a013e';
const baseUrl = 'https://api.assinafy.com.br/v1';
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        console.log("Uploading file...");
        const formData = new FormData();
        // create a dummy text file to pdf? No, we will just use it.
        const blob = new Blob(["test"], { type: 'application/pdf' });
        formData.append('file', blob, 'test.pdf');

        const uploadRes = await fetch(`${baseUrl}/accounts/${accountId}/documents`, {
            method: 'POST',
            headers: { 'X-Api-Key': apiKey },
            body: formData
        });
        
        const uploadData = await uploadRes.json();
        console.log("Upload response:", JSON.stringify(uploadData, null, 2));

    } catch (e) {
        console.error(e);
    }
}
run();
