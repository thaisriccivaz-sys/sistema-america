const fs = require('fs');
let file = fs.readFileSync('backend/server.js', 'utf8');

// Remover inicializacao
file = file.replace(/const cloudinary = require\('cloudinary'\)\.v2;\s*/g, '');

// Substituir upload de videos da OS (linha 12705)
let osVidOld = `        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: "video",
            folder: "os_videos"
        });

        // Delete the temporary file from local disk
        fs.unlinkSync(req.file.path);

        const cloudinaryUrl = result.secure_url;`;

let osVidNew = `        if (!r2 || !r2.isReady()) {
            try { fs.unlinkSync(req.file.path); } catch (_) {}
            return res.status(500).json({ error: 'R2 Storage não configurado.' });
        }

        const fileExt = req.file.originalname.split('.').pop() || 'mp4';
        const r2Key = \`os_videos/\${Date.now()}_\${Math.random().toString(36).substring(7)}.\${fileExt}\`;
        
        const cloudinaryUrl = await r2.uploadToR2(r2Key, req.file.path, req.file.mimetype); // mantemos o nome da var pra compatibilidade abaixo
        try { fs.unlinkSync(req.file.path); } catch (_) {}`;

file = file.replace(osVidOld, osVidNew);

fs.writeFileSync('backend/server.js', file, 'utf8');
console.log('Script concluido.');
