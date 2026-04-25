const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('./logger');

async function getGmailClient() {
    const credentialsPath = process.env.RESOURCE_ROOT ? path.join(process.env.RESOURCE_ROOT, 'config', 'credentials.json') : path.join(__dirname, '..', '..', 'config', 'credentials.json');
    const tokenPath = process.env.RESOURCE_ROOT ? path.join(process.env.RESOURCE_ROOT, 'config', 'token.json') : path.join(__dirname, '..', '..', 'config', 'token.json');

    try {
        const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
        const credentials = JSON.parse(credentialsContent);

        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

        const oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris ? redirect_uris[0] : 'urn:ietf:wg:oauth:2.0:oob'
        );

        const tokenContent = await fs.readFile(tokenPath, 'utf-8');
        oAuth2Client.setCredentials(JSON.parse(tokenContent));

        return google.gmail({ version: 'v1', auth: oAuth2Client });
    } catch (error) {
        throw new Error('Gmail API credentials/token not found or invalid: ' + error.message);
    }
}

function decodeBase64Url(data) {
    return Buffer.from(data, 'base64').toString('utf-8');
}

function extractTextFromPayload(payload) {
    if (!payload) return '';

    const chunks = [];
    const visit = (part) => {
        if (!part) return;

        if (part.body && part.body.data && (part.mimeType || '').startsWith('text/')) {
            chunks.push(decodeBase64Url(part.body.data));
        }

        if (part.parts) {
            part.parts.forEach(visit);
        }
    };

    visit(payload);
    return chunks.join('\n');
}

function extractOtp(text) {
    const focusedMatch = text.match(/(?:otp|one[\s-]*time password|verification code|security code)[^\d]{0,80}(\d{6})/i);
    if (focusedMatch) {
        return focusedMatch[1];
    }

    const matches = text.match(/\b\d{6}\b/g);
    return matches ? matches[matches.length - 1] : null;
}

async function fetchOtpFromEmail(options = {}) {
    log('Checking Gmail via API for new OTP...');
    let gmail;
    try {
        gmail = await getGmailClient();
    } catch (e) {
        log(e.message);
        throw e;
    }

    const maxAttempts = 15;
    const intervalMs = 10000;
    const since = options.since || Date.now();
    const minInternalDate = since - 30000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        log(`Gmail check attempt ${attempt}/${maxAttempts}...`);

        try {
            const res = await gmail.users.messages.list({
                userId: 'me',
                q: 'is:unread subject:"OTP" newer_than:1d',
                maxResults: 10
            });

            if (res.data.messages && res.data.messages.length > 0) {
                const messages = [];

                for (const item of res.data.messages) {
                    const msg = await gmail.users.messages.get({
                        userId: 'me',
                        id: item.id,
                        format: 'full'
                    });
                    messages.push(msg.data);
                }

                messages.sort((a, b) => Number(b.internalDate || 0) - Number(a.internalDate || 0));

                const ticketMatched = [];
                const otherRecent = [];

                for (const msg of messages) {
                    const internalDate = Number(msg.internalDate || 0);
                    if (internalDate < minInternalDate) {
                        continue;
                    }

                    const headers = msg.payload.headers || [];
                    const subject = (headers.find(h => h.name.toLowerCase() === 'subject') || {}).value || '';
                    const body = extractTextFromPayload(msg.payload);
                    const searchableText = `${subject}\n${msg.snippet || ''}\n${body}`;
                    const otp = extractOtp(searchableText);

                    if (!otp) {
                        log(`Unread OTP email ${msg.id} had no 6-digit OTP, skipping`);
                        continue;
                    }

                    const candidate = {
                        id: msg.id,
                        otp,
                        subject,
                        internalDate,
                    };

                    if (options.ticketId && searchableText.includes(options.ticketId)) {
                        ticketMatched.push(candidate);
                    } else {
                        otherRecent.push(candidate);
                    }
                }

                const selected = ticketMatched[0] || otherRecent[0];

                if (selected) {
                    log(`Selected OTP email ${selected.id} from ${new Date(selected.internalDate).toISOString()} subject="${selected.subject}"`);
                    log(`Successfully retrieved OTP via Gmail API: ${selected.otp}`);

                    await gmail.users.messages.modify({
                        userId: 'me',
                        id: selected.id,
                        requestBody: {
                            removeLabelIds: ['UNREAD']
                        }
                    });

                    return selected.otp;
                }

                log(`No unread OTP email newer than request time (${new Date(minInternalDate).toISOString()}) yet`);
            }
        } catch (e) {
            log('Error communicating with Gmail API: ' + e.message);
        }

        if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, intervalMs));
        }
    }

    throw new Error('Timeout: Did not receive OTP email via Gmail API within expected time.');
}

module.exports = { fetchOtpFromEmail };
