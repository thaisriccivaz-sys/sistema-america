const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
const { PDFDocument } = require('pdf-lib');

const API_KEY    = 'AxaT-FiXBckHqEYV0s_MtUhLF3pReRz3dX4zVpC173vmjDwzLGHYtDJuQje4-4Pd';
const ACCOUNT_ID = '10237785fb23cf473d54845a013e';
const HOSTNAME   = 'api.assinafy.com.br';

function req(method, urlPath, bodyObj) {
    return new Promise((resolve, reject) => {
        const body = bodyObj ? JSON.stringify(bodyObj) : null;
        const options = {
            hostname: HOSTNAME,
            path: urlPath,
            method,
            headers: {
                'X-Api-Key': API_KEY,
                'Accept': 'application/json',
                ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {})
            }
        };
        const request = https.request(options, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                let json = null;
                try { json = JSON.parse(raw); } catch(e) {}
                resolve({ status: res.statusCode, json, raw });
            });
        });
        request.on('error', reject);
        if (body) request.write(body);
        request.end();
    });
}

function uploadForm(urlPath, form) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOSTNAME,
            path: urlPath,
            method: 'POST',
            headers: {
                'X-Api-Key': API_KEY,
                ...form.getHeaders()
            }
        };
        const request = https.request(options, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                let json = null;
                try { json = JSON.parse(raw); } catch(e) {}
                resolve({ status: res.statusCode, json, raw });
            });
        });
        request.on('error', reject);
        form.pipe(request);
    });
}

async function runTest() {
    try {
        console.log("1. Generating PDF...");
        const doc = await PDFDocument.create();
        const page = doc.addPage([600, 400]);
        page.drawText('Test Document Assinafy!', { x: 50, y: 350, size: 30 });
        const pdfBytes = await doc.save();
        const tempPath = path.resolve(__dirname, 'temp_test.pdf');
        fs.writeFileSync(tempPath, pdfBytes);
        console.log("PDF created at", tempPath);

        const form = new FormData();
        form.append('file', fs.createReadStream(tempPath), {
            filename: 'test_auto.pdf',
            contentType: 'application/pdf'
        });

        console.log("2. Uploading PDF to Assinafy...");
        const uploadRes = await uploadForm(`/v1/accounts/${ACCOUNT_ID}/documents`, form);
        
        let assinafyDocId = uploadRes.json?.data?.id || uploadRes.json?.id;
        console.log("Upload response HTTP:", uploadRes.status);
        console.log("Assinafy Doc ID:", assinafyDocId);

        if (!assinafyDocId) {
            console.log("Failed to get ID. Raw:", uploadRes.raw);
            return;
        }

        console.log("3. Polling status...");
        let isReady = false;
        let lastDocStatus = "";
        for (let i = 1; i <= 20; i++) {
            await new Promise(r => setTimeout(r, 3000));
            
            const statusRes = await req('GET', `/v1/documents/${assinafyDocId}`, null);
            console.log(`[POLL ${i}] HTTP ${statusRes.status}. Data fields available: ${Object.keys(statusRes.json?.data || {}).join(', ')}`);
            if (statusRes.json?.data?.status) {
                console.log(`[POLL ${i}] Status field:`, statusRes.json?.data?.status);
            }

            const docStatus = (statusRes.json?.data?.status || statusRes.json?.status || '').toString().toLowerCase();
            lastDocStatus = docStatus;
            console.log(`[POLL ${i}] docStatus checked: "${docStatus}"`);

            if (!docStatus.includes('processing')) {
                console.log(`Document ready! Reason: docStatus "${docStatus}" does not include processing.`);
                isReady = true;
                break;
            }
        }

        if (!isReady) {
            console.log("Timeout waiting for document. Last status:", lastDocStatus);
            // Even if it timed out, try creating assignment to see the exact error.
            console.log("Attempting assignment anyway to check error...");
        }

        console.log("4. Finding signer...");
        const cpf = "55555555555";
        const email = "teste.assinafy@americarental.com.br";
        const nome = "Teste Assinafy API";

        let signerId = null;
        const searchRes = await req('GET', `/v1/accounts/${ACCOUNT_ID}/signers?tax_id=${cpf}`, null);
        const lista = searchRes.json?.data || [];
        if (lista.length > 0) {
            signerId = lista[0].id;
            console.log("Found signer:", signerId);
        } else {
            console.log("Creating signer...");
            const createRes = await req('POST', `/v1/accounts/${ACCOUNT_ID}/signers`, {
                full_name: nome, email, tax_id: cpf
            });
            signerId = createRes.json?.data?.id || createRes.json?.id;
            console.log("Created signer:", signerId);
        }

        console.log("5. Creating assignment...");
        const assignRes = await req('POST', `/v1/documents/${assinafyDocId}/assignments`, {
            signers: [{ id: signerId, role: 'signer', notification_methods: ['Email', 'WhatsApp'] }],
            method: 'virtual'
        });
        
        console.log("Assignment HTTP:", assignRes.status);
        if (assignRes.status >= 400) {
            console.log("\n--- ASSIGNMENT ERROR ---");
            console.log(JSON.stringify(assignRes.json || assignRes.raw, null, 2));
            console.log("------------------------");
        } else {
            console.log("Assignment created!");
            console.log("Signature URL:", assignRes.json?.data?.signature_url || assignRes.json?.data?.signing_url || assignRes.json?.data?.url);
        }

    } catch (err) {
        console.error("FATAL ERROR:", err);
    }
}

runTest();
