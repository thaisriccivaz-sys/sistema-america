try {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    console.log("pdfjs-dist legacy loaded!");
} catch (e) {
    try {
        const pdfjsLib = require('pdfjs-dist');
        console.log("pdfjs-dist default loaded!");
    } catch(e2) {
        console.error("Neither loaded:", e2.message);
    }
}
