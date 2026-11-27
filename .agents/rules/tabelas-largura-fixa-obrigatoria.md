# Tabelas com Largura Fixa de Colunas Independente do Filtro (Regra Obrigatória)

Toda **tabela de listagem / relatório com filtros ou pesquisa** criada ou alterada no sistema **DEVE** manter as larguras das colunas **100% fixas** ao aplicar qualquer filtro (mesmo com poucas linhas ou nenhum resultado), para garantir estabilidade visual e agilidade de leitura:

1. **Usar `table-layout: fixed;`:**
   - A tag `<table>` **DEVE** possuir `table-layout: fixed;` dentro de um container com rolagem (`overflow: auto;`).
2. **Definir `<colgroup>` com larguras explícitas em `px`:**
   - Toda tabela filtrável **DEVE** incluir um `<colgroup>` com `<col style="width: <N>px;">` explícito para **cada coluna**, garantindo que a largura não mude quando o conteúdo das células variar ou quando a tabela estiver vazia ("Nenhum registro encontrado").
3. **Largura total da tabela = soma das colunas:**
   - Definir a largura da `<table>` como a soma das larguras fixas das colunas (`style="width: <soma>px; min-width: 100%;"`) para preservar o alinhamento perfeito entre cabeçalho (`<thead>`), corpo (`<tbody>`) e rodapé (`<tfoot>`).
4. **Quebra de texto segura nas células:**
   - Aplicar `overflow-wrap: break-word; word-break: normal;` (ou `overflow: hidden; text-overflow: ellipsis;` quando for coluna de linha única) para impedir que textos longos empurrem ou deformem outras colunas.
