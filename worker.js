const BOT_TOKEN = '8186020934:AAHvpqnVrcLF-WBdnDi5iVWLAPQGLlGovF4';  // Replace with your token from BotFather
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const BASE_URL = 'https://drlabapis.onrender.com/api';
const CHANNEL_URL = 'https://t.me/yourchannel';  // Replace with your actual Telegram channel URL

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function fetchBinInfo(bin) {
    const url = `${BASE_URL}/bin?bin=${bin}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('BIN API request failed');
    }
    return response.json();
}

async function fetchGeneratedCCs(bin, count = 10) {
    const url = `${BASE_URL}/ccgenerator?bin=${bin}&count=${count}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('CC Generator API request failed');
    }
    return response.json();  // Assuming response is JSON with 'cards' array or similar; adjust based on actual structure
}

async function fetchIpInfo(ip) {
    const url = `${BASE_URL}/iplookup/?ip=${ip}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('IP Lookup API request failed');
    }
    return response.json();
}

async function handleRequest(request) {
    if (request.method !== 'POST') {
        return new Response('Not a POST request', { status: 405 });
    }

    try {
        const update = await request.json();
        const chatId = update.message?.chat?.id;
        const text = update.message?.text?.trim();

        if (chatId && text) {
            let reply = 'Use /bin or !bin followed by a 6-digit BIN (e.g., /bin 123456), /gen BIN [COUNT] to generate CCs, /ip IP to lookup IP info, or /start for info.';
            let replyMarkup = null;

            if (text === '/start') {
                reply = `🤖 Bot Status: Active ✅\n\n` +
                        `📢 For announcements and updates, join us 👉 here.\n\n` +
                        `💡 Tip: To use Raven 1.0 in your group, make sure to set it as an admin.`;
                replyMarkup = {
                    inline_keyboard: [[
                        { text: 'Join Channel', url: CHANNEL_URL }
                    ]]
                };
            } else {
                // Check for /bin or !bin command
                const binMatch = text.match(/^[!\/]bin\s*(\d{6})$/i);
                if (binMatch) {
                    const bin = binMatch[1];
                    try {
                        const binInfo = await fetchBinInfo(bin);
                        if (binInfo.status === 'ok') {
                            reply = `BIN: ${bin}\n` +
                                    `Scheme: ${binInfo.scheme}\n` +
                                    `Type: ${binInfo.type}\n` +
                                    `Tier: ${binInfo.tier}\n` +
                                    `Country: ${binInfo.country}\n` +
                                    `Issuer: ${binInfo.issuer}`;
                        } else {
                            reply = `BIN info unavailable for ${bin}. Details: ${JSON.stringify(binInfo)}`;
                        }
                    } catch (error) {
                        reply = `Error fetching BIN info for ${bin}. Try again later.`;
                    }
                }

                // Check for /gen, !gen, or .gen command
                const genMatch = text.match(/^[!\/.]gen\s+(\S+)(?:\s+(\d+))?$/i);
                if (genMatch) {
                    const bin = genMatch[1];  // Can include formats like 4548531|10|2025
                    const count = parseInt(genMatch[2] || '10', 10);
                    try {
                        // Fetch BIN lookup (use first 6 digits for /bin endpoint)
                        const binPrefix = bin.slice(0, 6);
                        const binInfo = await fetchBinInfo(binPrefix);

                        // Fetch generated CCs
                        const genResponse = await fetchGeneratedCCs(bin, count);
                        // Assuming genResponse is {status: 'ok', cards: ['cc1', 'cc2', ...]}; adjust if different
                        if (genResponse.status === 'ok' && genResponse.cards?.length) {
                            const ccs = genResponse.cards.join('\n');
                            reply = `Generated ${count} CCs 💳\n\n` +
                                    `BIN-LOOKUP\n` +
                                    `BIN ➳ ${binPrefix}\n` +
                                    `Country ➳ ${binInfo.country || 'Unavailable'}\n` +
                                    `Type ➳ ${binInfo.type || 'Unavailable'}\n` +
                                    `Bank ➳ ${binInfo.issuer || 'Unavailable'}\n\n` +
                                    `${ccs}`;
                        } else {
                            reply = `Failed to generate CCs for BIN ${bin}. Details: ${JSON.stringify(genResponse)}`;
                        }

                        // Add inline button for copy/paste
                        replyMarkup = {
                            inline_keyboard: [[
                                { text: 'Copy Generated CCs', callback_data: 'copy_ccs' }
                            ]]
                        };
                    } catch (error) {
                        reply = `Error generating CCs for BIN ${bin}. Try again later.`;
                    }
                }

                // Check for /ip, !ip, or .ip command
                const ipMatch = text.match(/^[!\/.]ip\s*([\d.]+)$/i);
                if (ipMatch) {
                    const ip = ipMatch[1];
                    try {
                        const ipInfo = await fetchIpInfo(ip);
                        if (ipInfo.status === 'ok' && ipInfo.details) {
                            const details = ipInfo.details;
                            reply = `IP Lookup for ${ip}:\n\n` +
                                    `Country: ${details.country}\n` +
                                    `City: ${details.city}\n` +
                                    `State: ${details.state}\n` +
                                    `Continent: ${details.continent}\n` +
                                    `ISP: ${details.isp}\n` +
                                    `Organization: ${details.organization}\n` +
                                    `ASN: ${details.asn_number}\n` +
                                    `Timezone: ${details.timezone}\n` +
                                    `Connection Type: ${details.connection_type}\n` +
                                    `User Type: ${details.user_type}\n` +
                                    `Latitude: ${details.latitude}\n` +
                                    `Longitude: ${details.longitude}\n` +
                                    `Map: ${details.map_link}`;
                        } else {
                            reply = `IP info unavailable for ${ip}. Details: ${JSON.stringify(ipInfo)}`;
                        }
                    } catch (error) {
                        reply = `Error fetching IP info for ${ip}. Try again later.`;
                    }
                }
            }

            // Send reply back to Telegram
            await fetch(`${API_URL}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: reply,
                    reply_markup: replyMarkup
                })
            });
        }

        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response('Error processing request', { status: 500 });
    }
}
