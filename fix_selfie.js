const fs = require('fs');
let code = fs.readFileSync('frontend/treinamento_presenca.js', 'utf8');

// Replace the canvas drawing logic
const oldDraw = `canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);`;

const newDraw = `
    const isPortraitScreen = window.innerHeight > window.innerWidth;
    const isLandscapeVideo = video.videoWidth > video.videoHeight;
    
    if (isPortraitScreen && isLandscapeVideo) {
        canvas.width = video.videoHeight;
        canvas.height = video.videoWidth;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(90 * Math.PI / 180);
        ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2, video.videoWidth, video.videoHeight);
    } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    }
`;

code = code.replace(oldDraw, newDraw);

// Replace object-fit:cover for selfies with object-fit:contain
code = code.replace(/max-height:140px;object-fit:cover;/g, "max-height:140px;object-fit:contain;");

fs.writeFileSync('frontend/treinamento_presenca.js', code);
console.log('Fixed selfie rotation');
