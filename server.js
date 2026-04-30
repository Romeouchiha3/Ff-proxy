const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

puppeteer.use(StealthPlugin());

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const uidFile = path.join(__dirname, 'uid.json');

// --- TELEGRAM CONFIGURATION ---
const TELEGRAM_TOKEN = '5893809958:AAHxBCHFPDIwejnOV596s2joow3KOSLEnCI';
const TELEGRAM_CHAT_ID = '6383817850';

async function sendTelegramLog(msg) {
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: `🤖 *Bot Log:*\n${msg}`,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Telegram Log Error:', error.message);
    }
}

async function sendTelegramScreenshot(page, caption) {
    try {
        const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 50 });
        const form = new FormData();
        form.append('chat_id', TELEGRAM_CHAT_ID);
        form.append('caption', caption);
        form.append('photo', screenshotBuffer, 'screenshot.jpg');

        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, form, {
            headers: form.getHeaders()
        });
    } catch (error) {
        console.error('Telegram Screenshot Error:', error.message);
    }
}
// ------------------------------

function saveAndGetUids(newUid) {
    let uids = [];
    if (fs.existsSync(uidFile)) {
        uids = JSON.parse(fs.readFileSync(uidFile));
    }
    if (newUid && !uids.includes(newUid)) {
        uids.push(newUid);
        fs.writeFileSync(uidFile, JSON.stringify(uids, null, 2));
    }
    return uids;
}

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapid Fire Bot - Ultimate</title>
    <style>
        :root { --bg-color: #050505; --panel-bg: #111111; --primary: #00ffcc; --secondary: #ff007f; --error: #ff3333; --success: #39ff14; --text-main: #e0e0e0; --border-glow: 0 0 10px rgba(0, 255, 204, 0.2); }
        body { background-color: var(--bg-color); color: var(--text-main); font-family: 'Segoe UI', Tahoma, sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px 10px; margin: 0; }
        .container { background-color: var(--panel-bg); padding: 20px; border-radius: 16px; width: 95%; max-width: 900px; box-shadow: var(--border-glow); border: 1px solid rgba(0, 255, 204, 0.3); }
        h2 { text-align: center; color: var(--primary); margin-bottom: 10px; font-size: 26px; text-transform: uppercase; letter-spacing: 2px; }
        .status-bar { text-align: center; margin-bottom: 15px; font-weight: bold; padding: 12px; border-radius: 8px; background-color: #000; border: 1px solid var(--primary); font-size: 18px; letter-spacing: 1px;}
        #status { color: var(--primary); }
        .controls { display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;}
        input[type="text"] { flex-grow: 1; padding: 15px; border: 1px solid rgba(0, 255, 204, 0.5); border-radius: 8px; background: #000; color: var(--primary); font-size: 16px; min-width: 200px; outline: none; transition: 0.3s; font-family: monospace;}
        input[type="text"]:focus { border-color: var(--primary); box-shadow: 0 0 10px rgba(0, 255, 204, 0.3); }
        button { padding: 15px 30px; background: linear-gradient(45deg, #00ffcc, #00b3ff); color: #000; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 900; text-transform: uppercase; transition: 0.3s; }
        button:hover { transform: translateY(-2px); box-shadow: 0 0 15px rgba(0, 255, 204, 0.6); }
        button:disabled { background: #333; color: #666; cursor: not-allowed; transform: none; }
        .checkbox-container { text-align: center; margin-bottom: 20px; font-size: 16px; font-weight: bold; color: var(--primary); }
        .checkbox-container input { transform: scale(1.3); margin-right: 10px; cursor: pointer; }
        .main-content { display: flex; gap: 20px; flex-direction: column; }
        @media (min-width: 768px) { .main-content { flex-direction: row; } }
        .screenshot-container { flex: 1.2; border: 1px solid rgba(255, 0, 127, 0.4); border-radius: 12px; overflow: hidden; background-color: #000; position: relative; display: flex; justify-content: center; align-items: center; min-height: 250px;}
        #live-screen { width: 100%; max-height: 500px; object-fit: contain; border-radius: 12px;}
        .terminal { flex: 1; background-color: #000; color: #a9b7c6; padding: 20px; border-radius: 12px; height: 350px; overflow-y: auto; border: 1px solid #333; font-size: 14px; line-height: 1.6; font-family: 'Courier New', monospace; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);}
        .log-info { color: #00b3ff; } .log-success { color: var(--success); font-weight: bold; } .log-error { color: var(--error); font-weight: bold; } .log-warn { color: #ffaa00; } .log-time { color: #666; font-size: 12px; margin-right: 8px;}
    </style>
</head>
<body>
    <div class="container">
        <h2>⚡ Rapid Fire Ultimate</h2>
        <div class="status-bar">STATUS: <span id="status">AWAITING COMMAND</span></div>
        <div class="controls">
            <input type="text" id="uid" placeholder="Enter UID (or leave empty to run saved)..." />
            <button id="startBtn" onclick="startBot()">Initiate Attack</button>
        </div>
        <div class="checkbox-container">
            <label><input type="checkbox" id="autoRenew" checked> 🔄 Auto-Activate Every 15 Mins</label>
        </div>
        <div class="main-content">
            <div class="screenshot-container">
                <img id="live-screen" src="https://via.placeholder.com/800x450/000000/00ffcc?text=STREAM+OFFLINE" alt="Live Stream" />
            </div>
            <div class="terminal" id="logs">
                <div class="log-info">> System Initialized. Auto-Renew supported.</div>
            </div>
        </div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const logsDiv = document.getElementById('logs');
        const statusDiv = document.getElementById('status');
        const startBtn = document.getElementById('startBtn');

        function addLog(msg, type = 'info') {
            const div = document.createElement('div');
            const time = new Date().toLocaleTimeString('en-US', { hour12: false });
            div.innerHTML = \`<span class="log-time">[\${time}]</span> <span class="log-\${type}">> \${msg}</span>\`;
            logsDiv.appendChild(div);
            logsDiv.scrollTop = logsDiv.scrollHeight; 
        }

        socket.on('log', (data) => addLog(data.msg, data.type));
        socket.on('status', (data) => {
            statusDiv.textContent = data.text;
            statusDiv.style.color = data.color;
            startBtn.disabled = data.state === 'running';
        });
        socket.on('live_stream', (b64) => { document.getElementById('live-screen').src = 'data:image/jpeg;base64,' + b64; });

        function startBot() {
            const uid = document.getElementById('uid').value.trim();
            const autoRenew = document.getElementById('autoRenew').checked;
            socket.emit('start_bot', { uid: uid, autoRenew: autoRenew });
            logsDiv.innerHTML = ''; 
            addLog("Executing aggressive protocol...", "warn");
        }
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(HTML_CONTENT));

io.on('connection', (socket) => {
    const UNIVERSAL_BTN_REGEX = 'Continue|Proceed|Next|an ad will open|without Discord|Submit|Renew';

    // Helper to send logs to BOTH Web UI and Telegram
    const emitLog = (msg, type = 'info') => {
        socket.emit('log', { msg, type });
        sendTelegramLog(`[${type.toUpperCase()}] ${msg}`);
    };

    socket.on('start_bot', async (data) => {
        let { uid, autoRenew } = data;
        let uidsToProcess = saveAndGetUids(uid);

        if (uidsToProcess.length === 0) {
            emitLog('No UIDs provided or found in uid.json!', 'error');
            socket.emit('status', { text: `ERROR: NO UID`, color: '#ff3333', state: 'idle' });
            return;
        }

        const processSingleUid = async (targetUid, attemptNum) => {
            emitLog(`[${targetUid}] - ATTEMPT ${attemptNum} STARTED`);
            let browser;
            let page;
            try {
                // FIXED EXECUTABLE PATH FOR RAILWAY
                browser = await puppeteer.launch({
                    executablePath: '/usr/bin/chromium', // <-- Ye path lagaya hai
                    headless: "new",
                    defaultViewport: { width: 1024, height: 768 }, 
                    args: [
                        '--no-sandbox', 
                        '--disable-setuid-sandbox', 
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--disable-blink-features=AutomationControlled'
                    ]
                });

                page = await browser.newPage();
                
                // Live Stream for Web
                const client = await page.target().createCDPSession();
                await client.send('Page.startScreencast', { format: 'jpeg', quality: 20 });
                client.on('Page.screencastFrame', async (frame) => {
                    socket.emit('live_stream', frame.data); 
                    try { await client.send('Page.screencastFrameAck', { sessionId: frame.sessionId }); } catch(e){}
                });

                const checkHardBlock = async () => {
                    return await page.evaluate(() => document.body.innerText.toLowerCase().includes('something went wrong'));
                };

                const smartClick = async (textPattern, logName) => {
                    if (await checkHardBlock()) throw new Error("HARD_BLOCK");
                    try {
                        await page.waitForFunction((pattern) => {
                            const elements = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
                            return elements.find(el => el.innerText && el.innerText.match(new RegExp(pattern, 'i')) && el.offsetHeight > 0);
                        }, { timeout: 25000 }, textPattern);

                        await page.evaluate((pattern) => {
                            const elements = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
                            const target = elements.find(el => el.innerText && el.innerText.match(new RegExp(pattern, 'i')) && el.offsetHeight > 0);
                            if(target) target.click();
                        }, textPattern);
                        
                        emitLog(`Success: Clicked "${logName}"`);
                    } catch(e) {
                        if (await checkHardBlock()) throw new Error("HARD_BLOCK");
                        throw new Error(`TIMEOUT: "${logName}"`);
                    }
                };

                await page.goto('https://unlockffbeta.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
                await sendTelegramScreenshot(page, `Bypassing Initial Ad for UID: ${targetUid}`); // Telegram screenshot
                
                await smartClick('without Discord', 'Bypass Initial Discord');
                
                await page.waitForSelector('input:not([type="hidden"]):not([type="checkbox"])', {visible: true});
                emitLog(`Injecting UID: ${targetUid}`, 'warn');
                await page.evaluate((val) => {
                    const input = document.querySelector('input:not([type="hidden"]):not([type="checkbox"])');
                    if(input) { input.focus(); input.value = val; input.dispatchEvent(new Event('input', {bubbles: true})); }
                }, targetUid);

                await smartClick(UNIVERSAL_BTN_REGEX, 'Submit UID');
                
                for (let i = 1; i <= 5; i++) {
                    socket.emit('status', { text: `[${targetUid}] STEP ${i}/5 ⏳`, color: '#ffaa00', state: 'running' });
                    if (await checkHardBlock()) throw new Error("HARD_BLOCK");
                    
                    await smartClick(UNIVERSAL_BTN_REGEX, `Step ${i} - 1st Click`);
                    emitLog(`Step ${i}: Waiting 11 seconds...`, 'warn');
                    await new Promise(r => setTimeout(r, 11000));
                    
                    if (await checkHardBlock()) throw new Error("HARD_BLOCK");

                    await smartClick(UNIVERSAL_BTN_REGEX, `Step ${i} - 2nd Click`);
                    
                    // Screenshot to telegram on every step
                    await sendTelegramScreenshot(page, `Completed Step ${i}/5 for UID: ${targetUid}`);
                    await new Promise(r => setTimeout(r, 2000)); 
                }

                emitLog('Verifying...', 'info');
                await new Promise(r => setTimeout(r, 4000)); 

                const isSuccess = await page.evaluate(() => {
                    const t = document.body.innerText.toLowerCase();
                    return t.includes('success') || t.includes('granted') || t.includes('active') || t.includes('expire');
                });

                if (isSuccess) {
                    emitLog(`✅ [${targetUid}] ACTIVATED SUCCESSFULLY!`, 'success');
                    await sendTelegramScreenshot(page, `✅ SUCCESS! Activated ${targetUid}`);
                    if(browser) await browser.close();
                    return true; 
                } else {
                    throw new Error("Verification Failed");
                }

            } catch (error) {
                if (page && !page.isClosed()) {
                    await sendTelegramScreenshot(page, `⚠️ ERROR HICCUP: ${error.message}`);
                }
                if (browser) await browser.close(); 
                
                if (error.message.includes("HARD_BLOCK")) {
                    emitLog(`🛑 Block Detected. Restarting...`, 'error');
                } else {
                    emitLog(`⚠️ Hiccup: ${error.message.replace('Error: ', '')}. Restarting...`, 'error');
                }
                return false; 
            }
        };

        socket.emit('status', { text: `STARTING ENGINE...`, color: '#00ffcc', state: 'running' });
        let engineRunning = true;
        
        const runScheduler = async () => {
            while (engineRunning) {
                for (let i = 0; i < uidsToProcess.length; i++) {
                    let currentUid = uidsToProcess[i];
                    emitLog(`🎯 TARGETING UID [${i+1}/${uidsToProcess.length}]: ${currentUid}`, 'success');
                    
                    for (let tryNum = 1; tryNum <= 100; tryNum++) {
                        const isDone = await processSingleUid(currentUid, tryNum);
                        if (isDone) break;
                        await new Promise(r => setTimeout(r, 1000)); 
                    }
                }

                if (autoRenew) {
                    socket.emit('status', { text: 'WAITING 15 MINS ⏳', color: '#ffaa00', state: 'running' });
                    emitLog(`🔄 All UIDs processed. Sleeping for 15 minutes before auto-renewal...`, 'warn');
                    await new Promise(r => setTimeout(r, 15 * 60 * 1000)); 
                    uidsToProcess = saveAndGetUids(); 
                } else {
                    socket.emit('status', { text: 'ALL TASKS COMPLETED ✅', color: '#39ff14', state: 'idle' });
                    emitLog(`🎉 All UIDs completed. Auto-renew is OFF. Engine shutting down.`, 'success');
                    engineRunning = false;
                }
            }
        };

        runScheduler();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=========================================`);
    console.log(`⚡ RAPID FIRE ULTIMATE RUNNING!`);
    console.log(`👉 Bound to Port: ${PORT}`);
    console.log(`=========================================\n`);
});
