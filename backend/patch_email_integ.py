
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Modify gerarEmailIntegracaoHTML parameter
regex_func = r"function gerarEmailIntegracaoHTML\(\{ respNome, nomeColaborador, cargoColaborador, passos, baseUrl \}\) \{"
replacement_func = r"function gerarEmailIntegracaoHTML({ respNome, nomeColaborador, cargoColaborador, passos, baseUrl, dataAdmissao }) {"
content = re.sub(regex_func, replacement_func, content)

# Modify the HTML string to include data de admissão
regex_html = r'(<div style="font-size:0\.95rem;color:#475569;line-height:1\.6;margin-top:20px;">\s*Olá <strong>\$\{respNome\}</strong>.*?O colaborador <strong>\$\{nomeColaborador\}</strong>.*?</p>)'
replacement_html = r'\1\n<p style="margin:4px 0 16px 0;"><strong>Data de Admissão:</strong> ${dataAdmissao ? new Date(dataAdmissao).toLocaleDateString("pt-BR", {timeZone:"UTC"}) : "Não informada"}</p>'
content = re.sub(regex_html, replacement_html, content, flags=re.DOTALL)

# Update the call to sendMailHelper to pass dataAdmissao
regex_call = r"(html: gerarEmailIntegracaoHTML\(\{ respNome: resp\.nome, nomeColaborador: colab\.nome_completo, cargoColaborador: colab\.cargo \|\| '', passos: resp\.passos, baseUrl \}\))"
replacement_call = r"html: gerarEmailIntegracaoHTML({ respNome: resp.nome, nomeColaborador: colab.nome_completo, cargoColaborador: colab.cargo || '', passos: resp.passos, baseUrl, dataAdmissao: colab.data_admissao })"
content = re.sub(regex_call, replacement_call, content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patched backend/server.js")
