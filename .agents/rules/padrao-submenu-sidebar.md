# Regra Obrigatória: Padronização de Submenus da Barra Lateral (`nav-group` / `nav-group-label` / `nav-item-sub`)

Sempre que um novo **submenu expansível (acordeão)** for criado ou editado dentro de qualquer menu lateral de departamento (`.dept-submenu`), ele **DEVE** seguir rigorosamente o mesmo padrão visual e tipográfico dos itens principais do menu (`.dept-submenu .nav-item`), exceto no menu **Treinamentos** (que utiliza títulos de seção fixos próprios).

## Diretrizes Obrigatórias

1. **Mesma Fonte, Tamanho, Peso e Cor dos Itens Principais:**
   - Como `<button>` no HTML não herda `font-family` do `body` automaticamente nos navegadores, todo botão de submenu (`.nav-group-label.nav-group-toggle` e seu `<span>`) e todo subitem (`.nav-item.nav-item-sub`) **DEVEM** usar exatamente:
     - `font-family: 'Inter', sans-serif;`
     - `font-size: 0.84rem;`
     - `font-weight: 500;`
     - `line-height: 1.25;`
     - `letter-spacing: normal;`
     - `color: var(--text-main);`
     - `text-transform: none;` (nunca usar caixa alta nos submenus padrão).

2. **Estrutura HTML Obrigatória para Todo Submenu:**
   ```html
   <div class="nav-group" id="nav-group-nome-unico">
       <button class="nav-group-label nav-group-toggle"
               onclick="toggleNavGroup('nav-group-nome-unico')">
           <span style="display:flex;align-items:center;gap:0.55rem;">
               <i class="ph ph-icone-do-grupo"></i>
               Nome do Submenu
           </span>
           <i class="ph ph-caret-right nav-group-chevron"></i>
       </button>
       <div class="nav-group-items" id="nav-group-items-nome-unico">
           <a href="#" class="nav-item nav-item-sub" data-target="alvo-da-tela"
              onclick="navigateTo('alvo-da-tela'); return false;">
               <i class="ph ph-icone-subitem"></i> Nome da Tela
           </a>
       </div>
   </div>
   ```

3. **Proibido Estilos Inline Divergentes:**
   - **NUNCA** colocar `font-size`, `font-weight`, `font-family`, `color` ou `text-transform` inline diferentes no `<button class="nav-group-label">` ou nos `<a class="nav-item nav-item-sub">` ao criar um novo submenu.
   - Submenus padronizados por esta regra:
     - **Comercial:** `Administração`, `Cadastros`
     - **Logística:** `Rota Redonda`
     - **Financeiro:** `Frota`
     - **RH:** `Avaliações`, `Pagamentos`, `Rota de Sucesso`, `Logística`
     - **APP:** `Liderança`
     - *(Exceção: o menu **Treinamentos** permanece com sua estrutura atual).*
