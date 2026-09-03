with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

# Remove a coluna do cabeçalho
old_th = '<th style="padding:0.5rem 0.75rem;text-align:left;font-size:0.75rem;font-weight:700;color:#64748b;">COLABORADOR</th>\n'
new_th = ''
if old_th in c:
    c = c.replace(old_th, new_th)
    print("Cabeçalho COLABORADOR removido.")
else:
    # try CRLF
    old_th2 = old_th.replace('\n', '\r\n')
    if old_th2 in c:
        c = c.replace(old_th2, new_th)
        print("Cabeçalho COLABORADOR removido (CRLF).")
    else:
        print("Cabeçalho COLABORADOR não encontrado!")

# Remove a coluna do conteúdo da tabela
# Pode estar com CRLF ou LF, vamos usar find e replace com substring segura
old_td = """            <td style="padding:0.5rem 0.75rem;">
              <select onchange="window._pmCorrigirColab(${realIdx},this.value)"
                style="width:100%;padding:0.3rem 0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;background:${bg};">
                ${dropdownOpts.replace(`value="${item.colaborador_id||''}"`, `value="${item.colaborador_id||''}" selected`)}
              </select>
            </td>\n"""

# Como os espaços podem variar, vamos usar regex ou simplesmente esconder
# Esconder a coluna com um display: none é super seguro e não quebra nada caso o usuário queira voltar depois, mas ele pediu para "retirar".
import re
# Vamos buscar pela tag <td> que contem window._pmCorrigirColab
pattern = re.compile(r'\s*<td[^>]*>\s*<select[^>]*window\._pmCorrigirColab[\s\S]*?</select>\s*</td>\n?')
if pattern.search(c):
    c = pattern.sub('', c)
    print("Conteúdo da coluna COLABORADOR removido.")
else:
    print("Conteúdo da coluna COLABORADOR não encontrado!")

with open('frontend/app.js', 'wb') as f:
    f.write(c.encode('utf-8'))
