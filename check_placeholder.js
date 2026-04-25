const signpdf = require('./backend/node_modules/@signpdf/placeholder-plain');
try {
    signpdf.plainAddPlaceholder({}); 
} catch(e) {
    console.log(e.message);
}
