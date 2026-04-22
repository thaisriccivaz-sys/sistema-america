const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

// The replacement logic: intercept Assinafy URLs and proxy them
const proxyLogic = `if (signedUrl) {
                        try {
                            if (!signedUrl.includes('assinafy.com.br')) {
                                return res.redirect(signedUrl);
                            } else {
                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(Buffer.from(arrayBuffer));
                                } else {
                                    return res.redirect(signedUrl);
                                }
                            }
                        } catch(err) { return res.redirect(signedUrl); }
                    }`;

js = js.replace(/if \(signedUrl\) return res\.redirect\(signedUrl\);/g, proxyLogic);

// Add fallback logic when signed_file_path is null (to fallback to local file_path) inside view/:id
const viewIdLogicRegex = /let pathToFile = row\.signed_file_path \|\| row\.file_path;\s+if \(pathToFile && fs\.existsSync\(pathToFile\)\) \{/;

const viewIdLogicReplace = `// Tentar assinado local primeiro
        let pathToFile = row.signed_file_path || row.file_path; // original fallback is fine actually!
        if (pathToFile && fs.existsSync(pathToFile)) {`;

js = js.replace(viewIdLogicRegex, viewIdLogicReplace);

fs.writeFileSync('backend/server.js', js, 'utf8');
