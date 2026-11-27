# Regra Obrigatória: Fechamento Automático de Listas de Seleção (Dropdowns Customizados)

Sempre que criar ou alterar qualquer **lista de seleção suspensa customizada** (dropdown single-select, multi-select com checkboxes, combobox digitável ou menu suspenso de status/badges) em qualquer tela do sistema:

1. **Minimizar/fechar ao clicar fora ou ao interagir com outro campo:**
   - Qualquer lista suspensa aberta **DEVE** ser fechada/minimizada imediatamente quando o usuário:
     - Clicar fora do container da lista;
     - Clicar em **outra lista de seleção** (mesmo que o botão da outra lista use `event.stopPropagation()`);
     - Clicar ou focar (`Tab` / clique) em qualquer outro `input`, `select`, `textarea` ou botão da tela;
     - Pressionar `Escape`.

2. **Padrão obrigatório de implementação (`capture: true`):**
   - Registrar os listeners globais de fechamento em **fase de captura (`true`)** para `mousedown` e `focusin`, garantindo que o fechamento ocorra **antes** de qualquer `event.stopPropagation()` em outros componentes:

```js
function fecharDropdownsPorAlvo(targetEl) {
    const pares = [
        ['meu-combo-wrap-1', 'meu-combo-dropdown-1'],
        ['meu-combo-wrap-2', 'meu-combo-dropdown-2']
    ];
    pares.forEach(([wrapId, dropId]) => {
        const drop = document.getElementById(dropId);
        if (!drop || drop.style.display === 'none' || !drop.style.display) return;
        const wrap = document.getElementById(wrapId);
        if (!targetEl || !wrap || !wrap.contains(targetEl)) {
            drop.style.display = 'none';
        }
    });
}

document.addEventListener('mousedown', (e) => fecharDropdownsPorAlvo(e.target), true);
document.addEventListener('focusin', (e) => fecharDropdownsPorAlvo(e.target), true);
```
