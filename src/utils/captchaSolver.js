const Tesseract = require('tesseract.js');
const { log } = require('./logger');

function evaluateSimpleMathExpression(expression) {
    const match = expression.match(/^(\d+)([+\-*\/])(\d+)$/);
    if (!match) {
        throw new Error(`Unsupported captcha expression: ${expression}`);
    }

    const left = Number(match[1]);
    const operator = match[2];
    const right = Number(match[3]);

    switch (operator) {
        case '+':
            return left + right;
        case '-':
            return left - right;
        case '*':
            return left * right;
        case '/':
            if (right === 0) {
                throw new Error('Captcha expression divided by zero');
            }
            return left / right;
        default:
            throw new Error(`Unsupported captcha operator: ${operator}`);
    }
}

/**
 * Reads a math captcha from an image, evaluates it and returns the answer.
 * @param {import('playwright').Page} page - The Playwright page.
 * @param {string} imageSelector - The selector for the captcha image.
 * @returns {Promise<string>} The evaluated answer as a string.
 */
async function solveArithmeticCaptcha(page, imageSelector) {
    try {
        log('🤖 Captcha solving initiated...');
        const captchaImageElement = page.locator(imageSelector).first();
        
        await captchaImageElement.waitFor({ state: 'visible', timeout: 5000 });
        
        // Scale up the image by 3x to drastically improve Tesseract's recognition of small symbols like '*'
        const dataUrl = await captchaImageElement.evaluate((img) => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width * 3;
            canvas.height = img.height * 3;
            const ctx = canvas.getContext('2d');
            // Disable smoothing for sharp edges
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/png');
        });
        
        const screenshotBuffer = Buffer.from(dataUrl.split(',')[1], 'base64');
        log('📸 Captcha screenshot scaled up 3x and captured, sending to Tesseract OCR...');
        
        // Use Worker to set whitelist and improve accuracy
        const worker = await Tesseract.createWorker('eng');
        await worker.setParameters({
            tessedit_char_whitelist: ' 0123456789+-*xX=',
            tessedit_pageseg_mode: '7',
        });
        
        const { data: { text } } = await worker.recognize(screenshotBuffer);
        await worker.terminate();
        
        log(`🔍 OCR raw output: "${text.trim()}"`);
        
        // If there's an '=' sign, everything after it is the answer box or noise. Drop it.
        let equationPart = text.split('=')[0];
        
        // Clean up text: replace 'x' or 'X' with '*', remove spaces, keep numbers and operators
        let mathStr = equationPart.replace(/[xX]/g, '*').replace(/[^0-9+\-*\/]/g, '');
        
        // Fallback: If OCR completely missed the operator and saw 3 numbers (e.g. "574" from "5 * 4")
        // Since '+' and '-' are usually recognized perfectly, the missing operator is almost always '*'
        if (!/[+\-*\/]/.test(mathStr) && mathStr.length === 3) {
            mathStr = mathStr[0] + '*' + mathStr[2];
            log(`🪄 Missing operator fallback: Assumed middle character was '*' -> "${mathStr}"`);
        }
        
        log(`🧮 Cleaned math string: "${mathStr}"`);
        
        if (!mathStr) {
            throw new Error('Could not extract math expression from Captcha');
        }

        const answer = Math.round(evaluateSimpleMathExpression(mathStr)).toString();
        
        log(`✅ Captcha evaluated: ${mathStr} = ${answer}`);
        return answer;
    } catch (error) {
        log(`❌ Captcha solving failed: ${error.message}`);
        throw error;
    }
}

module.exports = { solveArithmeticCaptcha };
