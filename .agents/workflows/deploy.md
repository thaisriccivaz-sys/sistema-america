---
description: Deploy automático para o Render via git push
---

// turbo-all

Sempre que fizer qualquer alteração no código (frontend ou backend), executar os passos abaixo automaticamente SEM pedir confirmação.

## Passos

1. Adicionar os arquivos alterados ao staging (nunca incluir node_modules, *.db, tmp/)
// turbo
```powershell
git add frontend/index.html frontend/app.js frontend/style.css backend/server.js backend/database.js backend/routes
```

2. Fazer commit com mensagem descritiva da alteração feita
// turbo
```powershell
git commit -m "<mensagem descritiva da alteração>"
```

3. Enviar para o repositório remoto (GitHub), o que aciona o deploy automático no Render
// turbo
```powershell
git push
```

## Regras importantes

- Usar ponto-e-vírgula (`;`) para separar comandos no PowerShell (NÃO usar `&&`)
- NUNCA incluir `node_modules/`, arquivos `.db`, `tmp/`, arquivos de teste temporários no commit
- A mensagem do commit deve descrever claramente a mudança feita (em português)
- O push no branch `main` aciona automaticamente o redeploy no Render
- Verificar o output do push para confirmar `main -> main` com sucesso
