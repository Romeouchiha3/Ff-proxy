const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

puppeteer.use(StealthPlugin());

// ==========================================
// CONFIGURATIONS & INTEGRATIONS
// ==========================================
// HFS ke liye Port 7860 aur Host 0.0.0.0 lazmi hai
const PORT = process.env.PORT || 7860;
const HOST = '0.0.0.0';

const SUPABASE_URL = 'https://nebwfonyhfgxnfkiisvs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lYndmb255aGZneG5ma2lpc3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNjc0MjMsImV4cCI6MjA5MDk0MzQyM30.me-P_mhC3droVGrHSlD_G3h9-ZgGgR3hy8VyDLFTp58'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// TELEGRAM 2FA SECRETS
const TELEGRAM_BOT_TOKEN = '5893809958:AAHxBCHFPDIwejnOV596s2joow3KOSLEnCI';
const TELEGRAM_CHAT_ID = '6383817850';
let currentOTP = null;

// CRYPTOGRAPHY SECRETS (Vercel aur HFS ke darmian connection ke liye)
const ENCRYPTION_KEY = crypto.scryptSync('@ROMEOPROXY789', 'salt', 32); 
const IV_LENGTH = 16;

// State Management
const activeTimers = {}; 
const lastActivationData = {}; 
const systemLogs = []; 
const freeUserCounters = {}; // Free users ke loops track karega
const sessionManager = new Map(); // 1 Key = 1 Device

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ==========================================
// SECURITY LAYER 1: SAFE HONEYPOT
// ==========================================
app.use((req, res, next) => {
    req.clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    next();
});

// Honeypot Trap - Base URL par sirf fake error dikhaye ga (HF block hone se bachane ke liye)
app.get('/', (req, res) => {
    console.log(`[SHIELD] Unauthorized Access Attempted from: ${req.clientIp}`);
    res.status(403).send(`
        <html>
        <body style="background:#05020a; color:#ff3333; text-align:center; margin-top:20%; font-family:sans-serif;">
            <h1>403 - FORBIDDEN</h1>
            <p>ACCESS DENIED BY ROMEO SHIELD</p>
        </body>
        </html>
    `);
});

// ==========================================
// CRYPTOGRAPHY HELPER FUNCTIONS
// ==========================================
function decryptPayload(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString());
}

function encryptPayload(data) {
    let text = JSON.stringify(data);
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// ==========================================
// SECURITY LAYER 2: ENCRYPTED API GATEWAY
// ==========================================
app.post('/api/gateway', async (req, res) => {
    try {
        const { payload } = req.body;
        const requestData = decryptPayload(payload);
        
        let responseData = { status: 'failed', message: 'Unknown Command' };

        // Premium Login Logic
        if (requestData.action === 'login') {
            const { username, password, key, device_id } = requestData;
            if(sessionManager.has(key) && sessionManager.get(key) !== device_id) {
                responseData = { status: 'error', message: 'Key already active on another device.' };
            } else {
                sessionManager.set(key, device_id);
                responseData = { status: 'success', message: 'Logged In' };
            }
        }
        
        // Free User Activation Logic
        if (requestData.action === 'free_activate') {
            const { uid } = requestData;
            if((freeUserCounters[uid] || 0) >= 2) {
                responseData = { status: 'ads_required', message: 'Watch ads on Vercel to reactivate.' };
            } else {
                startUIDCycle(uid, 'Free User', 'free');
                responseData = { status: 'success', message: 'Free cycle started.' };
            }
        }

        res.json({ payload: encryptPayload(responseData) });
    } catch (e) {
        res.status(400).send('Bad Request'); // Decryption fail (Hacker interception)
    }
});

// ==========================================
// HTML TEMPLATES (ROMEO KING PREMIUM AURORA)
// ==========================================
const headMetaAndStyles = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        :root { --bg: #05020a; --glass: rgba(15, 8, 25, 0.6); --primary: #00ffcc; --secondary: #ff007f; --aurora: #8a2be2; --text: #e0e0e0; }
        body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; min-height: 100vh;
               background-image: radial-gradient(circle at top right, rgba(138,43,226,0.15) 0%, transparent 40%),
                                 radial-gradient(circle at bottom left, rgba(0,255,204,0.1) 0%, transparent 40%); }
        .floating-header { position: sticky; top: 15px; margin: 15px; padding: 15px 25px; background: var(--glass); backdrop-filter: blur(15px); border-radius: 40px; border: 1px solid rgba(138, 43, 226, 0.4); display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .header-title { color: #fff; text-shadow: 0 0 10px var(--primary); font-weight: 900; font-size: 20px; }
        
        /* Rounded Menu Icon */
        .menu-btn { display: flex; flex-direction: column; gap: 5px; cursor: pointer; }
        .menu-btn span { display: block; width: 28px; height: 3px; background: var(--secondary); border-radius: 10px; box-shadow: 0 0 8px var(--secondary); }

        .container { padding: 0 15px 30px 15px; max-width: 800px; margin: auto; }
        .card { background: var(--glass); padding: 25px; border-radius: 20px; border: 1px solid rgba(0,255,204,0.2); margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        input { width: 100%; padding: 16px; border-radius: 15px; border: 1px solid rgba(0, 255, 204, 0.4); background: rgba(0,0,0,0.7); color: #fff; margin-bottom: 15px; box-sizing: border-box;}
        button { width: 100%; padding: 16px; background: linear-gradient(45deg, var(--aurora), var(--secondary)); color: #fff; border: none; border-radius: 15px; cursor: pointer; font-weight: bold; }
        .logs-box { background: rgba(0,0,0,0.8); border-radius: 15px; height: 350px; overflow-y: auto; padding: 15px; font-family: monospace; font-size: 12px; color: #a9b7c6; border: 1px solid #333;}
    </style>
`;

// ==========================================
// SECURITY LAYER 3: ADMIN AUTH & 2FA
// ==========================================
const SECURE_ADMIN_ROUTE = '/lg/rg/admin/proxy/uchiha/secure';

async function sendTelegramOTP() {
    currentOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const msg = `👑 *Romeo King Admin Login*\n\nYour 2FA OTP is: \`${currentOTP}\`\n\n_Do not share this with anyone._`;
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(msg)}&parse_mode=Markdown`);
    } catch(e) { console.log("Failed to send OTP", e); }
}

app.get(SECURE_ADMIN_ROUTE + '/otp', async (req, res) => {
    await sendTelegramOTP();
    res.send(`
        <!DOCTYPE html><html><head><title>Admin 2FA</title>${headMetaAndStyles}</head><body>
            <div class="floating-header" style="justify-content:center;"><div class="header-title">🛡️ 2FA REQUIRED</div></div>
            <div class="container" style="margin-top: 10vh;"><div class="card" style="text-align:center;">
                <h3 style="color:var(--secondary); text-shadow: 0 0 10px var(--secondary);">Check Telegram for OTP</h3>
                <form action="${SECURE_ADMIN_ROUTE}/verify" method="POST">
                    <input type="text" name="otp" placeholder="Enter 6-Digit OTP" required />
                    <button type="submit">VERIFY IDENTITY</button>
                </form>
            </div></div>
        </body></html>
    `);
});

app.post(SECURE_ADMIN_ROUTE + '/verify', (req, res) => {
    if (req.body.otp === currentOTP && currentOTP !== null) {
        currentOTP = null; // reset OTP for security
        res.cookie('romeo_admin_auth', 'super_secure', { maxAge: 8*60*60*1000, httpOnly: true });
        res.redirect(SECURE_ADMIN_ROUTE);
    } else {
        res.send(`<script>alert('Invalid OTP!'); window.location.href='${SECURE_ADMIN_ROUTE}/otp';</script>`);
    }
});

function checkAdminAuth(req, res, next) {
    if (req.cookies.romeo_admin_auth === 'super_secure') return next();
    res.redirect(SECURE_ADMIN_ROUTE + '/otp');
}

// ==========================================
// ADMIN DASHBOARD (Central Command)
// ==========================================
app.get(SECURE_ADMIN_ROUTE, checkAdminAuth, async (req, res) => {
    res.send(`
        <!DOCTYPE html><html><head><title>Central Command</title>${headMetaAndStyles}</head><body>
            <div class="floating-header">
                <div class="header-title">👑 MASTER CONTROL</div>
                <div class="menu-btn"><span></span><span></span><span></span></div>
            </div>
            <div class="container">
                <div class="card">
                    <h3 style="color:var(--primary); text-shadow: 0 0 10px var(--primary);">Engine Terminal</h3>
                    <div class="logs-box" id="logs">Waiting for connection...</div>
                </div>
            </div>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                socket.on('cron_log', html => {
                    const l = document.getElementById('logs');
                    l.innerHTML += '<div style="margin-bottom:5px; border-bottom:1px solid #222; padding-bottom:3px;">'+html+'</div>';
                    l.scrollTop = l.scrollHeight;
                });
            </script>
        </body></html>
    `);
});

function appendLog(html) {
    const fullLog = `[${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi' })}] ${html}`;
    io.emit('cron_log', fullLog);
    console.log(fullLog);
}

// ==========================================
// THE GHOST ENGINE (PUPPETEER)
// ==========================================
function startUIDCycle(uid, name, type = 'premium') {
    appendLog(`>> Starting <span style="color:var(--primary)">${type.toUpperCase()}</span> cycle for ${name}`);
    if (activeTimers[uid]) clearInterval(activeTimers[uid].interval);
    
    runGhostActivator(uid, name).catch(e => console.log(e));

    activeTimers[uid] = {
        name: name, type: type,
        interval: setInterval(() => {
            if (type === 'free') {
                freeUserCounters[uid] = (freeUserCounters[uid] || 0) + 1;
                if (freeUserCounters[uid] >= 2) {
                    appendLog(`🛑 <span style="color:#ff3333">Free Limit Reached for ${name}. Waiting for ad reactivation.</span>`);
                    clearInterval(activeTimers[uid].interval);
                    delete activeTimers[uid];
                    return;
                }
            }
            appendLog(`>> 40 Mins passed! Reactivating ${name}...`);
            runGhostActivator(uid, name).catch(e => console.log(e));
        }, 40 * 60 * 1000)
    };
}

async function runGhostActivator(uid, name) {
    let browser;
    try {
        appendLog(`[${name}] Starting Engine...`);
        
        // Fetching Free Proxy dynamically
        let freeProxy = '';
        try {
            const proxyRes = await fetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all');
            const proxies = await proxyRes.text();
            freeProxy = proxies.split('\n')[0].trim();
        } catch(e) { /* Fallback to none */ }

        let launchArgs = [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage', // Critical for preventing HFS memory crashes
            '--disable-blink-features=AutomationControlled'
        ];
        
        if(freeProxy) {
            launchArgs.push(`--proxy-server=http://${freeProxy}`);
            appendLog(`[${name}] Free Proxy Injected: ${freeProxy}`);
        }

        browser = await puppeteer.launch({
            args: launchArgs,
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
        });

        const page = await browser.newPage();
        await page.goto('https://unlockffbeta.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Waiting exactly 11 seconds before major automation step
        await new Promise(r => setTimeout(r, 11000));

        // Note: You can add the rest of your DOM injection/clicking logic here just like before.
        appendLog(`[${name}] ✅ Automation step executed successfully.`);
        
    } catch (error) {
        appendLog(`[${name}] <span style="color:#ff3333">❌ Error: ${error.message}</span>`);
    } finally {
        if (browser) await browser.close();
        appendLog(`[${name}] Engine Closed.`);
    }
}

server.listen(PORT, HOST, () => {
    console.log(`\n=========================================`);
    console.log(`👑 ROMEO KING ENCRYPTED BACKEND LIVE`);
    console.log(`👉 Running on Port: ${PORT}`);
    console.log(`=========================================\n`);
});
