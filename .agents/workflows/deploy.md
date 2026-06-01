---
description: Deploy automático para o Render via git push
---

// turbo-all

Sempre que fizer qualquer alteração no código (frontend ou backend), executar os passos abaixo automaticamente SEM pedir confirmação.

## Passos

1. Adicionar os arquivos alterados ao staging (nunca incluir node_modules, *.db, tmp/)
// turbo
```powershell
git add frontend/index.html frontend/app.js frontend/style.css backend/server.js backend/database.js
```

2. Fazer commit com mensagem descritiva da alteração feita
// turbo
```powershell
git commit -m "<mensagem descritiva da alteração>"
```

3. Enviar para o branch producao (que o Render escuta) e também atualizar o main, depois disparar o deploy hook
// turbo
```powershell
git push origin main ; git push origin main:producao ; Invoke-RestMethod -Uri "https://api.render.com/deploy/srv-d72pfn5m5p6s73en9tjg?key=BBqh06kkEgg" -Method POST
```

## Regras importantes

- Usar ponto-e-vírgula (`;`) para separar comandos no PowerShell (NÃO usar `&&`)
- NUNCA incluir `node_modules/`, arquivos `.db`, `tmp/`, arquivos de teste temporários no commit
- A mensagem do commit deve descrever claramente a mudança feita (em português)
- O Render escuta o branch `producao` — sempre fazer push para `origin main:producao`
- Após o push, disparar o Deploy Hook do Render: https://api.render.com/deploy/srv-d72pfn5m5p6s73en9tjg?key=BBqh06kkEgg
- Verificar o output do push para confirmar `main -> producao` e `Accepted` do hook
