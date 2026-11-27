# Senha para Excluir ou Realizar Ações na Tela — Máscara com `x` (`xxxxxxxx`) e Sem Botão de Olho (Regra Obrigatória)

Sempre que criar ou alterar qualquer **ação que exija senha** em qualquer tela do sistema (exclusão de registros/anexos/contratos/propostas/clientes/contatos/chamados/sinistros/veículos/manutenções/estoque/EPI, liberação com Senha do Gestor, autorização de etapa ou qualquer confirmação por senha):

## Regras Obrigatórias

1. **Exibição obrigatória como `xxxxxxxx` ao digitar:**
   - À medida que o usuário digita a senha, cada caractere **DEVE** aparecer na tela literalmente como `x` minúsculo (ex: `xxxxxxxx`).
   - **NUNCA** exibir a senha real ao digitar.
   - **NUNCA** usar `window.prompt(...)` ou `prompt(...)` nativo do navegador para pedir senha (pois o `prompt` mostra os caracteres em texto aberto).

2. **Proibido botão de olho ("visualizar senha"):**
   - **NUNCA** incluir botão de olho (`ph-eye` / `ph-eye-slash`) em campos de senha de exclusão ou autorização de ações.
   - Manter o bloqueio de ícones nativos do navegador (`::-ms-reveal` e `::-ms-clear` ocultos via CSS global em `frontend/index.html`).

3. **Como implementar no Frontend (`frontend/senha_mascara_x.js`):**
   - **Para solicitar senha em popup/modal de ação ou exclusão:** usar sempre o helper global assíncrono:
     ```js
     const senha = await window.solicitarSenhaAcaoComMascaraX({
         titulo: 'Confirmar Exclusão',
         mensagem: 'Digite a senha para autorizar esta ação:',
         confirmButtonText: 'Confirmar'
     });
     if (senha === null) return; // cancelado pelo usuário
     ```
   - **Para campos de senha embutidos dentro de modais customizados (`Swal.fire` com `html` próprio ou modal DOM):**
     - Criar o `<input type="text" id="meu-campo-senha" data-senha-x="1" autocomplete="off" style="text-transform:none;">` (sem botão de olho);
     - Chamar `window.aplicarMascaraSenhaX(inp, '')` ao abrir o modal (`didOpen`);
     - Ler a senha real digitada exclusivamente via `window.obterValorRealSenhaX(inp)` (nunca `inp.value`, pois `inp.value` contém `'xxxxxxxx'`).
