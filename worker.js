const BOT_TOKEN = '8186020934:AAHvpqnVrcLF-WBdnDi5iVWLAPQGLlGovF4';
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const BASE_URL = 'https://drlabapis.onrender.com/api';
const CHANNEL_URL = 'https://t.me/yourchannel'; // Set your channel URL

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function fetchBinInfo(bin) {
    const url = `${BASE_URL}/bin?bin=${bin}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('BIN API request failed');
    return response.json();
}

async function fetchGeneratedCCs(bin, count = 10) {
    const url = `${BASE_URL}/ccgenerator?bin=${bin}&count=${count}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('CC Generator API request failed');
    return response.json();
}

async function fetchIpInfo(ip) {
    const url = `${BASE_URL}/iplookup/?ip=${ip}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('IP Lookup API request failed');
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
            let reply = 'Unknown command. Use `/start` for help.';
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
            } else if (/^[!\/.]bin$/i.test(text)) {
                reply = 'Please send BIN in format: `/bin 123456` (6 digits).';
            } else if (/^[!\/.]gen$/i.test(text)) {
                reply = 'Please send BIN or BIN set in format: `/gen 4548531 [COUNT]` or `/gen 4548531|10|2025 [COUNT]`.';
            } else if (/^[!\/.]ip$/i.test(text)) {
                reply = 'Please send IP in format: `/ip 117.40.32.135` (example: IPv4 or IPv6 address).';
            } else {
                // Existing command handling...
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
                            reply = `BIN info unavailable for ${bin}.`;
                        }
                    } catch (error) {
                        reply = `Error fetching BIN info for ${bin}.`;
                    }
                }
                const genMatch = text.match(/^[!\/.]gen\s+(\S+)(?:\s+(\d+))?$/i);
                if (genMatch) {
                    const bin = genMatch[1];
                    const count = parseInt(genMatch[2] || '10', 10);
                    try {
                        const binPrefix = bin.slice(0, 6);
                        const binInfo = await fetchBinInfo(binPrefix);
                        const genResponse = await fetchGeneratedCCs(bin, count);
                        if (genResponse.status === 'ok' && genResponse.cards?.length) {
                            const ccs = genResponse.cards.join('\n');
                            reply = `Generated ${count} CCs 💳\n\n` +
                                    `BIN-LOOKUP\nBIN ➳ ${binPrefix}\n` +
                                    `Country ➳ ${binInfo.country || 'Unavailable'}\n` +
                                    `Type ➳ ${binInfo.type || 'Unavailable'}\n` +
                                    `Bank ➳ ${binInfo.issuer || 'Unavailable'}\n\n${ccs}`;
                            replyMarkup = {
                                inline_keyboard: [[
                                    { text: 'Copy Generated CCs', callback_data: 'copy_ccs' }
                                ]]
                            };
                        } else {
                            reply = `Failed to generate CCs for BIN ${bin}.`;
                        }
                    } catch (error) {
                        reply = `Error generating CCs for BIN ${bin}.`;
                    }
                }
                const ipMatch = text.match(/^[!\/.]ip\s*([\\d.]+)$/i);
                if (ipMatch) {
                    const ip = ipMatch[1];
                    try {
                        const ipInfo = await fetchIpInfo(ip);
                        if (ipInfo.status === 'ok' && ipInfo.details) {
                            const details = ipInfo.details;
                            reply = `IP Lookup for ${ip}:\n\n` +
                                    `Country: ${details.country}\nCity: ${details.city}\nState: ${details.state}\nContinent: ${details.continent}\nISP: ${details.isp}\nOrganization: ${details.organization}\nASN: ${details.asn_number}\nTimezone: ${details.timezone}\nConnection Type: ${details.connection_type}\nUser Type: ${details.user_type}\nLatitude: ${details.latitude}\nLongitude: ${details.longitude}\nMap: ${details.map_link}`;
                        } else {
                            reply = `IP info unavailable for ${ip}.`;
                        }
                    } catch (error) {
                        reply = `Error fetching IP info for ${ip}.`;
                    }
                }
            }
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
