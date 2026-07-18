const fs = require('fs');
let file = fs.readFileSync('backend/server.js', 'utf8');

// Remover a inicializacao do cloudinary
file = file.replace(/const cloudinary = require\('cloudinary'\)\.v2;\s*/g, '');

// Substituir DELETE /api/treinamentos/:id
let delTreinAnexosOld = `    // Deletar do Cloudinary em paralelo (ignorar erros individuais)
    await Promise.allSettled(anexos.map(a => {
      if (!a.public_id && !a.url_cloudinary) return Promise.resolve();
      const pid = a.public_id || _extrairPublicId(a.url_cloudinary);
      if (!pid) return Promise.resolve();
      // Tenta deletar como 'auto' (Cloudinary detecta o tipo)
      return cloudinary.uploader.destroy(pid, { resource_type: 'auto' }).catch(() =>
        cloudinary.uploader.destroy(pid, { resource_type: 'video' }).catch(() =>
          cloudinary.uploader.destroy(pid, { resource_type: 'image' }).catch(() => {})));
    }));`;

let delTreinAnexosNew = `    // Deletar do R2 em paralelo (ignorar erros individuais)
    if (r2 && r2.isReady()) {
      await Promise.allSettled(anexos.map(a => {
        const pid = a.public_id;
        if (!pid) return Promise.resolve();
        return r2.deleteFromR2(pid);
      }));
    }`;

file = file.replace(delTreinAnexosOld, delTreinAnexosNew);

// Substituir POST /api/treinamentos/:id/anexos
let postTreinOld = `    // Upload para o Cloudinary com resource_type: 'auto' (detecta vídeo, imagem, PDF…)
    const result = await cloudinary.uploader.upload(tmpPath, {
      resource_type: 'auto',
      folder:        'treinamentos',
      use_filename:  false,
      unique_filename: true
    });

    // Limpar arquivo temporário
    try { fs.unlinkSync(tmpPath); } catch (_) {}

    const urlCloud = result.secure_url;
    const publicId = result.public_id;`;

let postTreinNew = `    if (!r2 || !r2.isReady()) {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      return res.status(500).json({ error: 'R2 Storage não configurado.' });
    }

    // Upload para o R2
    const fileExt = nomeOrig.split('.').pop() || 'bin';
    const r2Key = \`treinamentos/\${treinId}/\${Date.now()}_\${Math.random().toString(36).substring(7)}.\${fileExt}\`;
    
    const urlCloud = await r2.uploadToR2(r2Key, tmpPath, mime);
    const publicId = r2Key;

    // Limpar arquivo temporário
    try { fs.unlinkSync(tmpPath); } catch (_) {}`;

file = file.replace(postTreinOld, postTreinNew);

// Substituir DELETE /api/treinamentos/:id/anexos/:anexoId
let delAnexoOld = `    // Deletar do Cloudinary
    const pid = anexo.public_id || _extrairPublicId(anexo.url_cloudinary);
    if (pid) {
      await cloudinary.uploader.destroy(pid, { resource_type: 'auto' }).catch(() =>
        cloudinary.uploader.destroy(pid, { resource_type: 'video' }).catch(() =>
          cloudinary.uploader.destroy(pid, { resource_type: 'image' }).catch(() => {})));
    }`;

let delAnexoNew = `    // Deletar do R2
    const pid = anexo.public_id;
    if (pid && r2 && r2.isReady()) {
      await r2.deleteFromR2(pid);
    }`;

file = file.replace(delAnexoOld, delAnexoNew);

// Substituir POST /api/ocorrencias/:id/anexos
let postOcorrOld = `    // Upload para Cloudinary — resource_type: 'auto' detecta PDF, imagem, etc.
    const result = await cloudinary.uploader.upload(tmpPath, {
      resource_type: 'auto',
      folder: 'ocorrencias',
      use_filename: false,
      unique_filename: true
    });

    // Limpar arquivo temporário
    try { require('fs').unlinkSync(tmpPath); } catch (_) {}

    const urlCloud = result.secure_url;
    const publicId = result.public_id;`;

let postOcorrNew = `    if (!r2 || !r2.isReady()) {
      try { require('fs').unlinkSync(tmpPath); } catch (_) {}
      return res.status(500).json({ error: 'R2 Storage não configurado.' });
    }

    const fileExt = nomeOrig.split('.').pop() || 'bin';
    const r2Key = \`ocorrencias/\${docId}/\${Date.now()}_\${Math.random().toString(36).substring(7)}.\${fileExt}\`;
    const urlCloud = await r2.uploadToR2(r2Key, tmpPath, mime);
    const publicId = r2Key;

    // Limpar arquivo temporário
    try { require('fs').unlinkSync(tmpPath); } catch (_) {}`;

file = file.replace(postOcorrOld, postOcorrNew);

// Substituir DELETE /api/ocorrencias/:id/anexos/:anexoId
let delOcorrOld = `    // Deletar do Cloudinary
    const pid = anexo.public_id || _extrairPublicIdOcorr(anexo.url);
    if (pid) {
      await cloudinary.uploader.destroy(pid, { resource_type: 'auto' }).catch(() =>
        cloudinary.uploader.destroy(pid, { resource_type: 'image' }).catch(() => {})
      );
    }`;

let delOcorrNew = `    // Deletar do R2
    const pid = anexo.public_id;
    if (pid && r2 && r2.isReady()) {
      await r2.deleteFromR2(pid);
    }`;

file = file.replace(delOcorrOld, delOcorrNew);

// Verificar se as substituicoes deram certo (simples contagem de palavras chave)
let clCount = (file.match(/cloudinary/g) || []).length;
console.log('Sobraram ocorrencias de cloudinary: ' + clCount);

fs.writeFileSync('backend/server.js', file, 'utf8');
console.log('Script Node concluido.');
