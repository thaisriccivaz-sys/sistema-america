const fs = require('fs');
let code = fs.readFileSync('frontend/pipeline.js', 'utf8');

code = code.replace(/id="pipe-filtro-os"(.*?)\n(.*?)onkeydown="[^"]+"/g, 'id="pipe-filtro-os"$1\n$2oninput="buscarPipelineDebounced()"');
code = code.replace(/id="pipe-filtro-data-de"(.*?)\n(.*?)onkeydown="[^"]+"/g, 'id="pipe-filtro-data-de"$1\n$2onchange="buscarPipeline()"');
code = code.replace(/id="pipe-filtro-data-ate"(.*?)\n(.*?)onkeydown="[^"]+"/g, 'id="pipe-filtro-data-ate"$1\n$2onchange="buscarPipeline()"');
code = code.replace(/id="pipe-filtro-endereco"(.*?)\n(.*?)onkeydown="[^"]+"/g, 'id="pipe-filtro-endereco"$1\n$2oninput="buscarPipelineDebounced()"');
code = code.replace(/id="pipe-filtro-cliente"(.*?)\n(.*?)onkeydown="[^"]+"/g, 'id="pipe-filtro-cliente"$1\n$2oninput="buscarPipelineDebounced()"');

code = code.replace(/id="pipe-filtro-dia"/g, 'id="pipe-filtro-dia" onchange="buscarPipeline()"');
code = code.replace(/id="pipe-filtro-tipo-os"/g, 'id="pipe-filtro-tipo-os" onchange="buscarPipeline()"');

code = code.replace(/🔍 Buscar/g, '<i class="ph ph-arrows-clockwise"></i>');
code = code.replace(/title="Buscar"/g, 'title="Atualizar (F5)"');

fs.writeFileSync('frontend/pipeline.js', code);
