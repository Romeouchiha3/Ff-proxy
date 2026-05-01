const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
const cookieParser = require('cookie-parser');

puppeteer.use(StealthPlugin());

// ==========================================
// CONFIGURATIONS & INTEGRATIONS
// ==========================================
const SUPABASE_URL = 'https://nebwfonyhfgxnfkiisvs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lYndmb255aGZneG5ma2lpc3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNjc0MjMsImV4cCI6MjA5MDk0MzQyM30.me-P_mhC3droVGrHSlD_G3h9-ZgGgR3hy8VyDLFTp58';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TG_BOT_TOKEN = '5893809958:AAHxBCHFPDIwejnOV596s2joow3KOSLEnCI';
let globalAdminChatId = null; // Save chat ID for cron notifications

// OTP Memory Storage
const pendingOTPs = {}; 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Anti-Crash
process.on('uncaughtException', (err) => console.log(`[Shield] ${err.message}`));
process.on('unhandledRejection', () => console.log(`[Shield] Rejection Prevented.`));

// ==========================================
// TELEGRAM BOT HELPERS
// ==========================================
async function sendTgMessage(chatId, text) {
    try {
        const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
        });
    } catch(e) { console.log("TG Error:", e.message); }
}

// ==========================================
// AUTH & ROUTING
// ==========================================
const ADMIN_ROUTE = '/lg/rg/admin/proxy';

// Middleware to check auth
function checkAuth(req, res, next) {
    if (req.cookies.romeo_auth === 'authenticated') return next();
    res.redirect(ADMIN_ROUTE + '/login');
}

// ==========================================
// HTML TEMPLATES (ROMEO KING AURORA THEME)
// ==========================================
const auroraStyles = `
    <style>
        :root { --bg: #030005; --panel: #0a0510; --primary: #00ffcc; --secondary: #ff007f; --aurora: #8a2be2; --text: #e0e0e0; }
        body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; margin: 0; min-height: 100vh; position: relative; overflow-x: hidden; }
        body::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(138,43,226,0.15) 0%, rgba(0,0,0,0) 50%), radial-gradient(circle at 80% 20%, rgba(0,255,204,0.1) 0%, rgba(0,0,0,0) 40%); z-index: -1; animation: aurora 10s infinite alternate; }
        @keyframes aurora { 0% { transform: rotate(0deg); } 100% { transform: rotate(5deg); } }
        
        .container { background: rgba(10, 5, 16, 0.85); backdrop-filter: blur(10px); padding: 30px; border-radius: 16px; width: 100%; max-width: 600px; box-shadow: 0 0 30px rgba(138, 43, 226, 0.3), inset 0 0 10px rgba(0, 255, 204, 0.1); border: 1px solid rgba(138, 43, 226, 0.5); }
        .header-title { text-align: center; color: #fff; text-shadow: 0 0 15px var(--primary), 0 0 30px var(--aurora); margin-bottom: 30px; letter-spacing: 3px; font-weight: 900; font-size: 28px;}
        .crown { color: #ffd700; font-size: 32px; text-shadow: 0 0 20px #ffd700; }
        
        input { width: 100%; padding: 15px; border-radius: 10px; border: 1px solid rgba(0, 255, 204, 0.4); background: rgba(0,0,0,0.6); color: #fff; font-size: 16px; outline: none; box-sizing: border-box; margin-bottom: 15px; box-shadow: inset 0 0 10px rgba(0,0,0,0.8); transition: 0.3s;}
        input:focus { border-color: var(--primary); box-shadow: 0 0 15px rgba(0, 255, 204, 0.3), inset 0 0 10px rgba(0,0,0,0.8); }
        
        button { width: 100%; padding: 15px; background: linear-gradient(45deg, var(--aurora), var(--secondary)); color: #fff; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold; text-transform: uppercase; box-shadow: 0 0 15px rgba(255, 0, 127, 0.4); transition: 0.3s; margin-bottom: 15px;}
        button:hover { transform: translateY(-2px); box-shadow: 0 0 25px rgba(255, 0, 127, 0.6); }
        
        .user-card { background: rgba(0,0,0,0.5); border: 1px solid rgba(0,255,204,0.3); padding: 15px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .del-btn { background: #ff3333; width: auto; padding: 8px 15px; margin: 0; box-shadow: 0 0 10px rgba(255,51,51,0.4); }
        .logs-box { background: #000; border: 1px solid #333; border-radius: 10px; height: 200px; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 12px; color: #a9b7c6; }
    </style>
`;

// LOGIN PAGE
app.get(ADMIN_ROUTE + '/login', (req, res) => {
    res.send(`
        <html><head><title>ROMEO KING Auth</title>${auroraStyles}</head><body>
            <div class="container">
                <div class="header-title"><span class="crown">👑</span><br>ROMEO KING</div>
                <div id="step1">
                    <input type="text" id="chatId" placeholder="Enter Telegram Chat ID" />
                    <button onclick="sendOtp()">Send OTP</button>
                </div>
                <div id="step2" style="display:none;">
                    <input type="text" id="otp" placeholder="Enter 4-Digit OTP" />
                    <button onclick="verifyOtp()">Login</button>
                </div>
            </div>
            <script>
                async function sendOtp() {
                    const chatId = document.getElementById('chatId').value;
                    const res = await fetch('${ADMIN_ROUTE}/send-otp', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({chatId}) });
                    const data = await res.json();
                    if(data.success) { document.getElementById('step1').style.display = 'none'; document.getElementById('step2').style.display = 'block'; alert('OTP Sent to Telegram!'); }
                    else alert('Failed to send OTP');
                }
                async function verifyOtp() {
                    const chatId = document.getElementById('chatId').value;
                    const otp = document.getElementById('otp').value;
                    const res = await fetch('${ADMIN_ROUTE}/verify-otp', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({chatId, otp}) });
                    if(res.ok) window.location.href = '${ADMIN_ROUTE}';
                    else alert('Invalid OTP!');
                }
            </script>
        </body></html>
    `);
});

// AUTH APIs
app.post(ADMIN_ROUTE + '/send-otp', async (req, res) => {
    const { chatId } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    pendingOTPs[chatId] = otp;
    await sendTgMessage(chatId, `👑 <b>ROMEO KING SYSTEM</b>\n\nYour Admin Login OTP is: <b>${otp}</b>`);
    res.json({ success: true });
});

app.post(ADMIN_ROUTE + '/verify-otp', (req, res) => {
    const { chatId, otp } = req.body;
    if (pendingOTPs[chatId] && pendingOTPs[chatId] === otp) {
        delete pendingOTPs[chatId];
        globalAdminChatId = chatId; // Set for cron
        res.cookie('romeo_auth', 'authenticated', { maxAge: 24*60*60*1000 });
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// DASHBOARD
app.get(ADMIN_ROUTE, checkAuth, async (req, res) => {
    // Note: User must create table 'targets' with columns 'id', 'uid', 'name' in Supabase
    const { data: users } = await supabase.from('targets').select('*');
    
    let usersHtml = '';
    if (users) {
        users.forEach(u => {
            usersHtml += `<div class="user-card">
                <div><b>${u.name}</b> <br> <span style="color:#00ffcc; font-size:12px;">UID: ${u.uid}</span></div>
                <button class="del-btn" onclick="delUser('${u.id}')">Delete</button>
            </div>`;
        });
    }

    res.send(`
        <html><head><title>Admin Panel</title>${auroraStyles}</head><body>
            <div class="container">
                <div class="header-title"><span class="crown">👑</span><br>ROMEO KING PANEL</div>
                
                <h3 style="color:var(--primary);">Add Target</h3>
                <input type="text" id="name" placeholder="User Name (e.g. Ali)" />
                <input type="text" id="uid" placeholder="Target UID" />
                <button onclick="addUser()">Register UID</button>

                <h3 style="color:var(--secondary); margin-top:20px;">Active Targets (15m Auto-Cycle)</h3>
                <div style="max-height: 250px; overflow-y:auto; margin-bottom:20px;">${usersHtml}</div>

                <h3 style="color:#fff;">Cron Live Logs</h3>
                <div class="logs-box" id="logs">Waiting for next cycle...</div>
            </div>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                socket.on('cron_log', msg => {
                    const l = document.getElementById('logs');
                    l.innerHTML += '<div>[' + new Date().toLocaleTimeString() + '] ' + msg + '</div>';
                    l.scrollTop = l.scrollHeight;
                });

                async function addUser() {
                    const name = document.getElementById('name').value;
                    const uid = document.getElementById('uid').value;
                    await fetch('${ADMIN_ROUTE}/add', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name, uid}) });
                    location.reload();
                }
                async function delUser(id) {
                    await fetch('${ADMIN_ROUTE}/del', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) });
                    location.reload();
                }
            </script>
        </body></html>
    `);
});

app.post(ADMIN_ROUTE + '/add', checkAuth, async (req, res) => {
    await supabase.from('targets').insert([{ name: req.body.name, uid: req.body.uid }]);
    res.json({ success: true });
});
app.post(ADMIN_ROUTE + '/del', checkAuth, async (req, res) => {
    await supabase.from('targets').delete().eq('id', req.body.id);
    res.json({ success: true });
});

// ==========================================
// AUTO-PILOT CHROMIUM CORE (THE GHOST)
// ==========================================
async function runGhostActivator(uid, name) {
    let browser;
    try {
        io.emit('cron_log', `Starting Ghost Engine for ${name} [${uid}]...`);
        
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
            headless: 'new', // Best for Railway
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable' // Railway Docker path
        });

        const page = (await browser.pages())[0] || await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');

        page.on('dialog', async dialog => { await dialog.dismiss(); }); // Kill popups

        await page.goto('https://unlockffbeta.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        let safetyCounter = 0;
        let uidInjected = false;
        
        while (safetyCounter < 60) { // Limit loop
            safetyCounter++;

            const isSuccess = await page.evaluate(() => {
                const text = document.body.innerText.toLowerCase();
                if (text.includes('step ') && text.includes(' of ')) return false;
                return text.includes('access granted') || text.includes('success') || text.includes('expires in');
            });

            if (isSuccess) {
                const timeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
                const msg = `👑 <b>ROMEO KING SYSTEM</b>\n\n✅ <b>ACTIVATION SUCCESSFUL!</b>\n\n👤 <b>Name:</b> ${name}\n🆔 <b>UID:</b> <code>${uid}</code>\n⏰ <b>Time (PKT):</b> ${timeStr}\n\n<i>Auto-Cycle Status: Active</i>`;
                if(globalAdminChatId) await sendTgMessage(globalAdminChatId, msg);
                io.emit('cron_log', `<span style="color:#39ff14">Success: ${name} [${uid}] activated!</span>`);
                return true;
            }

            if (!uidInjected) {
                const injected = await page.evaluate((val) => {
                    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"])'));
                    if (inputs.length > 0 && inputs[0].value !== val) {
                        inputs[0].focus(); inputs[0].value = val;
                        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                    return false;
                }, uid);
                if (injected) { uidInjected = true; await new Promise(r => setTimeout(r, 1000)); }
            }

            const clicked = await page.evaluate(() => {
                const targets = ['continue without discord', 'continue (an ad will open)', 'continue', 'proceed', 'next', 'submit', 'renew'];
                const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"], span'));
                for (let btn of buttons) {
                    if (!btn.innerText) continue;
                    const text = btn.innerText.toLowerCase().trim();
                    if (btn.offsetHeight > 0 && window.getComputedStyle(btn).display !== 'none') {
                        if (targets.some(t => text === t || text.includes(t))) {
                            btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                            if (typeof btn.click === 'function') btn.click();
                            return true;
                        }
                    }
                }
                return false;
            });

            if (clicked) await new Promise(r => setTimeout(r, 2000));
            else await new Promise(r => setTimeout(r, 1000));
            
            const isBlocked = await page.evaluate(() => document.body.innerText.toLowerCase().includes('invalid id'));
            if(isBlocked) throw new Error("Invalid ID / Blocked");
        }
        throw new Error("Timeout");
    } catch (error) {
        io.emit('cron_log', `<span style="color:#ff3333">Error on ${name}: ${error.message}</span>`);
        if(globalAdminChatId) await sendTgMessage(globalAdminChatId, `⚠️ <b>FAILED</b>\nName: ${name}\nUID: ${uid}\nError: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
}

// ==========================================
// CRON SCHEDULER (Runs every 15 mins)
// ==========================================
let isCronRunning = false;
setInterval(async () => {
    if (isCronRunning) return;
    isCronRunning = true;
    io.emit('cron_log', `--- Starting 15 Min Auto-Cycle ---`);
    
    try {
        const { data: users } = await supabase.from('targets').select('*');
        if (users && users.length > 0) {
            for (let user of users) {
                await runGhostActivator(user.uid, user.name);
                // 10 second delay between each UID to avoid heavy CPU load
                await new Promise(r => setTimeout(r, 10000)); 
            }
        } else {
            io.emit('cron_log', `No active targets found in database.`);
        }
    } catch(e) {
        console.log("Cron Error:", e);
    }
    
    io.emit('cron_log', `--- Auto-Cycle Finished ---`);
    isCronRunning = false;
}, 15 * 60 * 1000); // 15 Minutes


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`👑 ROMEO KING ADMIN SERVER RUNNING`);
    console.log(`👉 ${ADMIN_ROUTE}/login`);
    console.log(`=========================================\n`);
});
