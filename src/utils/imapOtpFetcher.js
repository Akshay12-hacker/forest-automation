const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const { log } = require('./logger');

const config = {
    imap: {
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASSWORD,
        host: process.env.IMAP_HOST || 'imap.gmail.com',
        port: process.env.IMAP_PORT ? parseInt(process.env.IMAP_PORT, 10) : 993,
        tls: true,
        authTimeout: 30000,
        tlsOptions: { rejectUnauthorized: false }
    }
};

/**
 * Connects to IMAP, waits for the latest OTP email, and extracts the 6-digit OTP.
 */
async function fetchOtpFromEmail() {
    log('📧 Connecting to email to fetch OTP...');
    if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
        throw new Error('IMAP_USER or IMAP_PASSWORD is not set in environment variables');
    }
    
    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const maxRetries = 15; // 15 * 10 seconds = 2.5 minutes
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            // Search for unread emails
            const searchCriteria = ['UNSEEN'];
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
                markSeen: true
            };

            const messages = await connection.search(searchCriteria, fetchOptions);
            
            if (messages.length > 0) {
                // Get the most recent message
                const latestMessage = messages[messages.length - 1];
                const all = latestMessage.parts.find(part => part.which === '');
                const id = latestMessage.attributes.uid;
                const idHeader = "Imap-Id: "+id+"\r\n";
                const mail = await simpleParser(idHeader + all.body);

                // Assuming OTP is a 6-digit number in the email text
                const text = mail.text || mail.html || '';
                const otpMatch = text.match(/\b\d{6}\b/);

                if (otpMatch) {
                    log(`✅ Found OTP in email: ${otpMatch[0]}`);
                    connection.end();
                    return otpMatch[0];
                } else {
                    log('⚠️ Found unread email but could not extract OTP. Marking as seen.');
                }
            }

            log(`⏳ OTP not found yet, checking again in 10s (Attempt ${attempt + 1}/${maxRetries})...`);
            await delay(10000);
        }
        
        connection.end();
        throw new Error('Timeout waiting for OTP email');
    } catch (error) {
        log(`❌ Error fetching OTP: ${error.message}`);
        throw error;
    }
}

module.exports = { fetchOtpFromEmail };
