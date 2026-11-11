---
description: Regras obrigatórias para tudo que for criado no menu APP (uso operacional, celular)
always_on: true
---

## Menu APP — uso OPERACIONAL, celular primeiro

Tudo que for implementado dentro do menu **APP** (ex.: APP › Liderança › Candidatos) é usado pela **operação** (líderes, motoristas, ajudantes), normalmente **no celular, em pé, com pressa e às vezes com luva**. Portanto, **sempre**:

### 1. Responsivo e com boa visualização no celular
- Projetar **mobile-first**: o layout base é de celular (360–430 px de largura); desktop é adaptação (conteúdo centralizado, largura máxima ~760 px).
- **Nada de rolagem horizontal.** Cards em coluna única; tabelas viram cards/listas.
- Em telas ≤ 768 px, a tela do APP abre em **tela cheia** (sem barra lateral/abas/rodapé do desktop), com botão de menu para voltar ao sistema.
- Detalhes/formulários abrem em **tela cheia** (nunca modal pequeno no celular), com cabeçalho fixo e **barra de ações fixa no rodapé** (respeitar `env(safe-area-inset-*)`).
- Testar em **375×667**, **412×915** e no desktop antes de entregar.

### 2. Usabilidade operacional (ícones + interativo + fácil)
- **Ícones Phosphor (`ph ph-*`) em tudo**: títulos, botões, status, itens de lista. Texto curto e direto; nada de jargão.
- **Alvos de toque ≥ 48 px** (botões, linhas de checklist, chips); espaçamento generoso entre alvos.
- **Interativo**: toque na linha inteira marca/desmarca; feedback imediato (cor, ícone, vibração leve); barra/contador de progresso; stepper por etapas quando houver fluxo.
- **Uma ação principal por tela**, grande, na barra fixa do rodapé; botão desabilitado explica o que falta ("Faltam 3").
- **Salvar automaticamente** rascunhos (sem exigir botão "Salvar") e mostrar indicador "Salvo".
- **Campos de formulário com `font-size ≥ 16px`** (evita zoom automático no iOS); teclado adequado (`inputmode`, `type`).
- Cores com significado consistente: verde = ok/concluído, vermelho = pendente/erro, azul = hoje/informação, laranja = em andamento, cinza = neutro.
- Estados vazios, carregando e erro sempre com ícone e botão de "Tentar de novo".

### 3. Permissão, pendência e avisos
- Toda tela do APP é uma página no **Controle de Acesso** (`app-...`), registrada em `TELAS_SISTEMA` e na árvore de permissões (`usuarios.js`), no menu (`index.html`) e em `app.js` (path, aba e render).
- Avisos no celular usam **PWA + Web Push** (`app-lideranca-sw.js`), apenas para quem estiver **escalado/de plantão** quando a regra do dia exigir.

### 4. Arquivos
- CSS do APP em `frontend/app_mobile.css` (classes com prefixo próprio, ex.: `alc-`), JS em `frontend/app_*.js`, rotas em `backend/routes_app_*.js` (prefixo `/api/app/...`).
- Fotos, áudios e PDFs seguem a regra do **Cloudflare R2** (`r2_key` no banco, nunca disco local).
