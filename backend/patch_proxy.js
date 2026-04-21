const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const regexView = /const signedUrl = extractSignedUrl\(data\?\.data \|\| data\);\s+if \(signedUrl\) return res\.redirect\(signedUrl\);/g;

const replacement = `const signedUrl = extractSignedUrl(data?.data || data);
                    if (signedUrl) {
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
                                    return res.redirect(signedUrl); // fallback
                                }
                            }
                        } catch(err) { return res.redirect(signedUrl); }
                    }`;

js = js.replace(regexView, replacement);

fs.writeFileSync('backend/server.js', js, 'utf8');
