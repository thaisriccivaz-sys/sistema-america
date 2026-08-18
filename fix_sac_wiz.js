const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// 1. Remove the broken fetch logic from wizSubmit
const badLogic = `        const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
      let t = tLocal;
      try {
          const resp = await fetch('/api/sac/tickets/' + ticketId, { headers: { 'Authorization': \`Bearer \${token}\` } });
          if (resp.ok) {
              t = await resp.json();
          }
      } catch (e) { console.error('Erro ao buscar versão mais recente do ticket', e); }
      const user = currentUsername();`;
      
code = code.replace(badLogic, "        const user = currentUsername();");

// 2. Add the fetch logic correctly into addComment
// In addComment:
//       const text = textInput ? textInput.value.trim() : '';
//       if (!text) return;
//       const user = currentUsername();

const addCommentTarget = `      const text = textInput ? textInput.value.trim() : '';\n      if (!text) return;\n      const user = currentUsername();`;
const addCommentFix = `      const text = textInput ? textInput.value.trim() : '';\n      if (!text) return;\n\n      const token = localStorage.getItem('erp_token')||localStorage.getItem('token');\n      let t = tLocal;\n      try {\n          const resp = await fetch('/api/sac/tickets/' + ticketId, { headers: { 'Authorization': \`Bearer \${token}\` } });\n          if (resp.ok) {\n              t = await resp.json();\n          }\n      } catch (e) { console.error('Erro ao buscar versão mais recente do ticket', e); }\n\n      const user = currentUsername();`;

// Also check if LF or CRLF
const addCommentTargetCRLF = `      const text = textInput ? textInput.value.trim() : '';\r\n      if (!text) return;\r\n      const user = currentUsername();`;
const addCommentFixCRLF = `      const text = textInput ? textInput.value.trim() : '';\r\n      if (!text) return;\r\n\r\n      const token = localStorage.getItem('erp_token')||localStorage.getItem('token');\r\n      let t = tLocal;\r\n      try {\r\n          const resp = await fetch('/api/sac/tickets/' + ticketId, { headers: { 'Authorization': \`Bearer \${token}\` } });\r\n          if (resp.ok) {\r\n              t = await resp.json();\r\n          }\r\n      } catch (e) { console.error('Erro ao buscar versão mais recente do ticket', e); }\r\n\r\n      const user = currentUsername();`;

if (code.includes(addCommentTarget)) {
    code = code.replace(addCommentTarget, addCommentFix);
} else if (code.includes(addCommentTargetCRLF)) {
    code = code.replace(addCommentTargetCRLF, addCommentFixCRLF);
}

fs.writeFileSync('frontend/sac.js', code);
console.log('Fixed successfully');
