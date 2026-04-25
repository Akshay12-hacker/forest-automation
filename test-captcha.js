const Tesseract = require('tesseract.js');
async function run() {
    try {
        const worker = await Tesseract.createWorker('eng');
        await worker.setParameters({
            tessedit_char_whitelist: '0123456789+-*xX=',
        });
        console.log("Worker initialized successfully with parameters.");
        await worker.terminate();
    } catch (e) {
        console.error(e);
    }
}
run();
