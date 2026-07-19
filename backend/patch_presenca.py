# -*- coding: utf-8 -*-
import re

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\treinamento_presenca.js'
with open(js_file, 'r', encoding='utf-8') as f:
    js = f.read()

# Add _filtroStatus
if 'let _filtroStatus' not in js:
    js = js.replace("let _filtroTipoDepto = '';", "let _filtroTipoDepto = '';\nlet _filtroStatus = 'Ativos';")

# Replace renderizar logic for filtering
old_renderizar = """function renderizar() {
    const grid = document.getElementById('presenca-colaboradores-grid');
    if (!grid) return;
    const counter = document.getElementById('pres-counter');

    const depto = _filtroDepto.toLowerCase();
    const busca = _filtroBusca.toLowerCase();
    const tipoDepto = _filtroTipoDepto;

    let lista = _dados;

    if (depto) lista = lista.filter(c => (c.departamento || '').toLowerCase() === depto);
    if (tipoDepto === 'Desligados') {
        lista = lista.filter(c => c.status === 'Desligado');
    } else {
        lista = lista.filter(c => c.status !== 'Desligado');
        if (tipoDepto) lista = lista.filter(c => c.departamento_tipo === tipoDepto);
    }
    if (busca) lista = lista.filter(c =>
        (c.nome_completo || '').toLowerCase().includes(busca) ||
        (c.cargo || '').toLowerCase().includes(busca)
    );"""

new_renderizar = """function renderizar() {
    const grid = document.getElementById('presenca-colaboradores-grid');
    if (!grid) return;
    const counter = document.getElementById('pres-counter');

    const depto = _filtroDepto.toLowerCase();
    const busca = _filtroBusca.toLowerCase();
    const tipoDepto = _filtroTipoDepto;
    const statusFiltro = _filtroStatus || 'Ativos';

    let lista = _dados;

    if (depto) lista = lista.filter(c => (c.departamento || '').toLowerCase() === depto);
    if (tipoDepto) lista = lista.filter(c => c.departamento_tipo === tipoDepto);
    
    // Filtro de Status
    if (statusFiltro === 'Desligados') {
        lista = lista.filter(c => c.status === 'Desligado');
    } else {
        // Ativos (inclui Ativo, Afastado e Férias)
        lista = lista.filter(c => c.status === 'Ativo' || c.status === 'Afastado' || c.status === 'Férias');
    }
    
    if (busca) lista = lista.filter(c =>
        (c.nome_completo || '').toLowerCase().includes(busca) ||
        (c.cargo || '').toLowerCase().includes(busca)
    );"""

if "const statusFiltro" not in js:
    js = js.replace(old_renderizar, new_renderizar)

# Add window.filtrarPresencaStatus
add_filtro = """window.filtrarPresencaTipoDepto = function (val) {
    _filtroTipoDepto = val;
    renderizar();
};

window.filtrarPresencaStatus = function (val) {
    _filtroStatus = val;
    renderizar();
};"""
if "window.filtrarPresencaStatus =" not in js:
    js = js.replace("""window.filtrarPresencaTipoDepto = function (val) {
    _filtroTipoDepto = val;
    renderizar();
};""", add_filtro)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated treinamento_presenca.js")
