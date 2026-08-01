
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\treinamento.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. salvarNovoTreinamento (POST)
POST_OLD = """            const r = await api('/treinamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao: desc || '', departamento, validade_dias, pesquisa_perguntas, tipo: tipoAtual })
            });"""
POST_NEW = """            const is_integracao = el('novo-treinamento-is-integracao') && el('novo-treinamento-is-integracao').checked ? 1 : 0;
            const r = await api('/treinamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao: desc || '', departamento, validade_dias, pesquisa_perguntas, tipo: tipoAtual, is_integracao })
            });"""
content = content.replace(POST_OLD, POST_NEW)

# 2. abrirModalEditarTreinamento (populate modal)
ABRIR_OLD = """        el('editar-treinamento-id').value   = t.id;
        el('editar-treinamento-nome').value = t.nome || '';
        el('editar-treinamento-desc').value = t.descricao || '';
        if (el('editar-treinamento-validade')) el('editar-treinamento-validade').value = t.validade_dias || 0;"""
ABRIR_NEW = """        el('editar-treinamento-id').value   = t.id;
        el('editar-treinamento-nome').value = t.nome || '';
        el('editar-treinamento-desc').value = t.descricao || '';
        if (el('editar-treinamento-validade')) el('editar-treinamento-validade').value = t.validade_dias || 0;
        if (el('editar-treinamento-is-integracao')) el('editar-treinamento-is-integracao').checked = !!t.is_integracao;"""
content = content.replace(ABRIR_OLD, ABRIR_NEW)

# 3. salvarEdicaoTreinamento (PUT)
PUT_OLD = """            const r = await api('/treinamentos/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao: desc || '', departamento, capa_url, validade_dias, tipo: tipoAtual })
            });"""
PUT_NEW = """            const is_integracao = el('editar-treinamento-is-integracao') && el('editar-treinamento-is-integracao').checked ? 1 : 0;
            const r = await api('/treinamentos/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, descricao: desc || '', departamento, capa_url, validade_dias, tipo: tipoAtual, is_integracao })
            });"""
content = content.replace(PUT_OLD, PUT_NEW)

# 4. update cache
CACHE_OLD = """            if (idx !== -1) {
                _cache[idx].nome        = nome;
                _cache[idx].descricao   = desc || '';
                _cache[idx].departamento = departamento;
                _cache[idx].capa_url    = capa_url;
            }"""
CACHE_NEW = """            const is_integracao = el('editar-treinamento-is-integracao') && el('editar-treinamento-is-integracao').checked ? 1 : 0;
            if (idx !== -1) {
                _cache[idx].nome        = nome;
                _cache[idx].descricao   = desc || '';
                _cache[idx].departamento = departamento;
                _cache[idx].capa_url    = capa_url;
                _cache[idx].is_integracao = is_integracao;
            }"""
content = content.replace(CACHE_OLD, CACHE_NEW)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Frontend patch for treinamento.js Treinamento Integration done!")
