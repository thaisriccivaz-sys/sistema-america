---
trigger: always_on
---

# Checklist Obrigatório ao Criar uma Nova Tela no Sistema (Prevenção de Tela em Branco)

Toda vez que uma **nova tela** (`data-target="<target>"`) for criada em qualquer módulo do sistema (Logística, Comercial, RH, Financeiro, Administrativo, Processos, Treinamentos, APP), seguir **obrigatoriamente** os **7 pontos abaixo** antes do `git push` para garantir que a tela nunca abra em branco:

## 1. Container HTML da View (`frontend/index.html`) — Casamento 100% de IDs com Fallback
A causa número 1 de tela em branco em telas novas é criar `<section id="view-<target>" class="content-view"></section>` vazia no `index.html` enquanto o arquivo `.js` da tela faz `const root = document.getElementById('<target>-root'); if (!root) return;`.
- **No `frontend/index.html`:** Sempre incluir o `<div id="<target>-root"></div>` dentro da `<section id="view-<target>" class="content-view">`:
  ```html
  <section id="view-<target>" class="content-view" style="padding: 1.25rem 1.5rem;">
      <div id="<target>-root"></div>
  </section>
  ```
- **No arquivo `.js` da tela (`window.renderTelaXxx`):** Sempre buscar o elemento raiz com fallback duplo para a `<section>`:
  ```js
  const root = document.getElementById('<target>-root') || document.getElementById('view-<target>');
  if (!root) return;
  ```
- **Nunca travar apenas em `root.dataset.initialized`:** Sempre verificar se o container interno realmente existe no DOM antes de pular a montagem do HTML base:
  ```js
  if (!root.dataset.initialized || !root.innerHTML.trim()) {
      root.dataset.initialized = '1';
      root.innerHTML = ...;
  }
  ```

## 2. Renderizar o Shell Imediatamente Antes do `await fetch(...)`
- Nunca deixar o `root.innerHTML` dependendo do término ou sucesso de uma requisição `fetch` para aparecer na tela.
- Montar o cabeçalho, filtros e estrutura de tabela imediatamente ao abrir a tela, e no `catch (err)` do `fetch`, manter o layout visível (exibindo estado vazio ou mensagem de erro amigável) para que a tela nunca fique branca caso a API demore ou falhe.
- Sempre usar `const apiBase = (typeof API_URL !== 'undefined' && API_URL) ? API_URL : '/api';` nas chamadas `fetch`.

## 3. Link no Menu Lateral (`frontend/index.html`)
- Adicionar o item `<a href="#" class="nav-item" data-target="<target>">` dentro do `.dept-submenu` do departamento correspondente.

## 4. Inclusão da Tag `<script>` (`frontend/index.html`)
- Se a nova tela tiver um arquivo `.js` próprio (ex: `frontend/<nova_tela>.js`), adicionar `<script src="<nova_tela>.js?v=YYYYMMDDv1"></script>` no `frontend/index.html` **antes** do `<script src="app.js?v=...">`.

## 5. Registro Completo de Navegação e Abas (`frontend/app.js`)
Toda nova tela deve ser registrada nos **5 pontos do `frontend/app.js`**:
1. **`SCREEN_MAP`:** `'target': 'departamento'` (para destacar o ícone correto na barra lateral esquerda e montar o breadcrumb).
2. **Lista de permissões do departamento (`DEPT_PERMS`):** Incluir `'target'` no array do departamento.
3. **`TAB_META`:** `'target': { color: '...', icon: 'ph-...', title: '...' }` (para exibir título, cor e ícone na aba superior).
4. **`navigateTo(target)`:** Chamar `if (typeof window.renderTelaXxx === 'function') setTimeout(() => window.renderTelaXxx(), 80);`.
5. **`navigateToTab(tabId)`:** Chamar `if (tab.target === '<target>' && typeof window.renderTelaXxx === 'function') setTimeout(() => window.renderTelaXxx(), 80);` (garante que ao alternar entre abas abertas no topo a tela também renderize).

## 6. Controle de Acesso de Usuários (`frontend/usuarios.js`)
- Incluir a nova tela em `TELAS_SISTEMA` (`{ modulo: '...', pagina_id: '<target>', pagina_nome: '...', icone: 'ph-...' }`) e em `MENU_HIERARQUIA` do respectivo módulo.

## 7. Validação Pré-Push Obrigatória
Antes de commitar e dar `git push`:
1. Rodar `node --check` no novo arquivo `.js`, em `frontend/app.js`, `frontend/usuarios.js` e `backend/server.js`.
2. Confirmar com `Select-String` que o `id` buscado por `document.getElementById(...)` no `.js` da nova tela existe literalmente em `frontend/index.html`.
