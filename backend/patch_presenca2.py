# -*- coding: utf-8 -*-
import re

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\treinamento_presenca.js'
with open(js_file, 'r', encoding='utf-8') as f:
    js = f.read()

# Replace renderizar function filtering block
old_filter = """        let lista = _dados;
        if (depto) lista = lista.filter(c => c.departamento === depto);
        
        if (tipoDepto === 'Desligados') {
            lista = lista.filter(c => c.status === 'Desligado');
        } else {
            lista = lista.filter(c => c.status !== 'Desligado');
            if (tipoDepto) lista = lista.filter(c => c.departamento_tipo === tipoDepto);
        }
        if (busca) lista = lista.filter(c =>"""

new_filter = """        let lista = _dados;
        const statusFiltro = _filtroStatus || 'Ativos';

        if (depto) lista = lista.filter(c => c.departamento === depto);
        if (tipoDepto) lista = lista.filter(c => c.departamento_tipo === tipoDepto);
        
        // Filtro de Status: Ocultar Iniciado/Aguardando e aplicar seleção
        if (statusFiltro === 'Desligados') {
            lista = lista.filter(c => (c.status || '').toLowerCase() === 'desligado');
        } else {
            // Ativos (inclui Ativo, Afastado e Férias, case-insensitive)
            lista = lista.filter(c => {
                const s = (c.status || '').toLowerCase();
                return s === 'ativo' || s === 'afastado' || s === 'férias' || s === 'ferias';
            });
        }
        
        if (busca) lista = lista.filter(c =>"""

if old_filter in js:
    js = js.replace(old_filter, new_filter)
    print("Replaced filtering logic.")
else:
    print("Warning: old filter not found. Might have already been replaced.")

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated treinamento_presenca.js")
