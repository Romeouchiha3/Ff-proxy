
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

const ADMIN_PASSWORD = '@ROMEOPROXY789';

// State Management
const activeTimers = {}; 
const lastActivationData = {}; // Format: { uid: "12:30 PM" }
const systemLogs = []; // Array to keep logs persistent

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

process.on('uncaughtException', (err) => console.log(`[Shield] ${err.message}`));
process.on('unhandledRejection', () => console.log(`[Shield] Rejection Prevented.`));

// ==========================================
// AUTH & ROUTING
// ==========================================
const ADMIN_ROUTE = '/lg/rg/admin/proxy';

function checkAuth(req, res, next) {
    if (req.cookies.romeo_auth === 'authenticated') return next();
    res.redirect(ADMIN_ROUTE + '/login');
}

// ==========================================
// HTML TEMPLATES (ROMEO KING PREMIUM AURORA)
// ==========================================
const headMetaAndStyles = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        :root { 
            --bg: #05020a; 
            --glass: rgba(15, 8, 25, 0.6); 
            --primary: #00ffcc; 
            --secondary: #ff007f; 
            --aurora: #8a2be2; 
            --text: #e0e0e0; 
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { 
            background: var(--bg); color: var(--text); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; padding: 0; min-height: 100vh; position: relative; overflow-x: hidden;
            background-image: radial-gradient(circle at top right, rgba(138,43,226,0.15) 0%, transparent 40%),
                              radial-gradient(circle at bottom left, rgba(0,255,204,0.1) 0%, transparent 40%);
        }
        
        /* Floating Rounded Header */
        .floating-header {
            position: sticky; top: 15px; margin: 0 15px 20px 15px; padding: 15px 25px;
            background: var(--glass); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            border-radius: 40px; border: 1px solid rgba(138, 43, 226, 0.4);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 15px rgba(138,43,226,0.2);
            display: flex; justify-content: space-between; align-items: center; z-index: 1000;
        }
        .header-title { color: #fff; text-shadow: 0 0 10px var(--primary); font-weight: 900; font-size: 20px; letter-spacing: 2px; margin: 0;}
        .header-nav a { color: var(--secondary); text-decoration: none; font-size: 12px; font-weight: bold; border: 1px solid var(--secondary); padding: 5px 10px; border-radius: 15px; box-shadow: 0 0 10px rgba(255,0,127,0.3); }

        .container { padding: 0 15px 30px 15px; max-width: 800px; margin: auto; }
        
        .card { 
            background: var(--glass); backdrop-filter: blur(10px); padding: 25px; border-radius: 20px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,255,204,0.1); 
            border: 1px solid rgba(0,255,204,0.2); margin-bottom: 20px; 
        }
        h3 { margin-top: 0; color: var(--primary); text-shadow: 0 0 10px var(--primary); }
        
        /* Input & Buttons (No Zoom on Mobile) */
        input { 
            width: 100%; padding: 16px; border-radius: 15px; border: 1px solid rgba(0, 255, 204, 0.4); 
            background: rgba(0,0,0,0.7); color: #fff; font-size: 16px; outline: none; 
            margin-bottom: 15px; transition: 0.3s; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
        }
        input:focus { border-color: var(--primary); box-shadow: 0 0 15px rgba(0, 255, 204, 0.4); }
        
        button { 
            width: 100%; padding: 16px; background: linear-gradient(45deg, var(--aurora), var(--secondary)); 
            color: #fff; border: none; border-radius: 15px; cursor: pointer; font-size: 16px; 
            font-weight: bold; text-transform: uppercase; letter-spacing: 1px;
            box-shadow: 0 0 15px rgba(255, 0, 127, 0.4); transition: 0.3s; margin-bottom: 15px;
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 0 25px rgba(255, 0, 127, 0.6); }

        /* Dashboard Table */
        .status-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .status-table th { color: var(--aurora); text-align: left; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 12px; text-transform: uppercase;}
        .status-table td { padding: 15px 5px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; }
        .uid-badge { color: var(--primary); font-size: 11px; background: rgba(0,255,204,0.1); padding: 3px 6px; border-radius: 5px; }
        .timer-badge { font-family: monospace; color: var(--secondary); background: rgba(255,0,127,0.1); padding: 5px 8px; border-radius: 8px; font-weight: bold; text-shadow: 0 0 5px var(--secondary);}
        
        .user-card { background: rgba(0,0,0,0.5); border: 1px solid rgba(138,43,226,0.3); padding: 15px; border-radius: 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .del-btn { background: #ff3333; width: auto; padding: 10px 15px; margin: 0; box-shadow: 0 0 10px rgba(255,51,51,0.4); border-radius: 10px; font-size: 13px;}
        
        /* Persistent Logs Area */
        .logs-box { 
            background: rgba(0,0,0,0.8); border: 1px solid #333; border-radius: 15px; 
            height: 350px; overflow-y: auto; padding: 15px; font-family: 'Courier New', monospace; 
            font-size: 12px; color: #a9b7c6; word-wrap: break-word; box-shadow: inset 0 0 20px rgba(0,0,0,1);
        }
        .log-entry { margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px; }
        .log-time { color: #555; font-size: 10px; }
        .log-name { color: var(--primary); font-weight: bold; }
    </style>
`;

// ==========================================
// 1. PUBLIC DASHBOARD (Root)
// ==========================================
app.get('/', async (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html><head><title>ROMEO LIVE STATUS</title>${headMetaAndStyles}</head><body>
            <div class="floating-header">
                <div class="header-title">👑 ROMEO KING</div>
                <div class="header-nav"><a href="${ADMIN_ROUTE}">ADMIN LOGIN</a></div>
            </div>
            <div class="container">
                <div class="card">
                    <h3>LIVE ACTIVATION STATUS</h3>
                    <div style="overflow-x:auto;">
                        <table class="status-table">
                            <thead><tr><th>User (UID)</th><th>Last Activated</th><th>Next Run In</th></tr></thead>
                            <tbody id="status-body"><tr><td colspan="3" style="text-align:center;">Loading Engine Data...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                socket.on('update_ui', data => {
                    const tbody = document.getElementById('status-body');
                    if(Object.keys(data).length === 0) return tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No active targets.</td></tr>';
                    
                    let html = '';
                    for (const uid in data) {
                        const info = data[uid];
                        // Frontend script, so we keep the slash escapes here for literal string generation
                        html += \`<tr>
                            <td>\${info.name}<br><span class="uid-badge">\${uid}</span></td>
                            <td style="color:#aaa;">\${info.lastTime}</td>
                            <td><span class="timer-badge">\${info.remaining}</span></td>
                        </tr>\`;
                    }
                    tbody.innerHTML = html;
                });
            </script>
        </body></html>
    `);
});

// ==========================================
// 2. ADMIN LOGIN
// ==========================================
app.get(ADMIN_ROUTE + '/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html><head><title>ROMEO KING Auth</title>${headMetaAndStyles}</head><body>
            <div class="floating-header" style="justify-content:center;">
                <div class="header-title">👑 SYSTEM ACCESS</div>
            </div>
            <div class="container" style="margin-top: 10vh;">
                <div class="card" style="text-align:center; padding: 40px 20px;">
                    <h2 style="color:var(--secondary); text-shadow: 0 0 15px var(--secondary); margin-bottom: 30px;">ENTER PASSWORD</h2>
                    <form action="${ADMIN_ROUTE}/login" method="POST">
                        <input type="password" name="password" placeholder="Admin Password" required />
                        <button type="submit">UNLOCK SYSTEM</button>
                    </form>
                </div>
            </div>
        </body></html>
    `);
});

app.post(ADMIN_ROUTE + '/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        res.cookie('romeo_auth', 'authenticated', { maxAge: 24*60*60*1000 });
        res.redirect(ADMIN_ROUTE);
    } else {
        res.send(`<script>alert('Invalid Password!'); window.location.href='${ADMIN_ROUTE}/login';</script>`);
    }
});

// ==========================================
// 3. ADMIN PANEL
// ==========================================
app.get(ADMIN_ROUTE, checkAuth, async (req, res) => {
    const { data: users } = await supabase.from('targets').select('*');
    let usersHtml = '';
    if (users) {
        users.forEach(u => {
            usersHtml += `<div class="user-card">
                <div><b>${u.name}</b> <br> <span class="uid-badge">UID: ${u.uid}</span></div>
                <button class="del-btn" onclick="delUser('${u.id}', '${u.uid}')">Remove</button>
            </div>`;
        });
    }

    res.send(`
        <!DOCTYPE html>
        <html><head><title>Admin Panel</title>${headMetaAndStyles}</head><body>
            <div class="floating-header">
                <div class="header-title">👑 CONTROL PANEL</div>
                <div class="header-nav"><a href="/" style="border-color:var(--primary); color:var(--primary);">LIVE VIEW</a></div>
            </div>
            <div class="container">
                <div class="card">
                    <h3>Add Target</h3>
                    <input type="text" id="name" placeholder="User Name (e.g. Ali)" />
                    <input type="text" id="uid" placeholder="Target UID" />
                    <button onclick="addUser()">Register & Start Cycle</button>
                </div>

                <div class="card">
                    <h3 style="color:var(--secondary);">Managed Targets</h3>
                    <div style="max-height: 250px; overflow-y:auto;">${usersHtml || '<p style="color:#666;">No targets yet.</p>'}</div>
                </div>

                <div class="card">
                    <h3 style="color:#fff;">Engine Terminal</h3>
                    <div class="logs-box" id="logs">Waiting for connection...</div>
                </div>
            </div>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                
                socket.on('init_logs', logs => {
                    const l = document.getElementById('logs');
                    l.innerHTML = logs.join('') || '<div class="log-entry">System ready.</div>';
                    l.scrollTop = l.scrollHeight;
                });

                socket.on('cron_log', html => {
                    const l = document.getElementById('logs');
                    l.innerHTML += html;
                    l.scrollTop = l.scrollHeight;
                });

                async function addUser() {
                    const name = document.getElementById('name').value;
                    const uid = document.getElementById('uid').value;
                    if(!name || !uid) return alert('Name aur UID zaroori hain!');
                    const btn = document.querySelector('button[onclick="addUser()"]');
                    btn.innerText = 'Registering...'; btn.disabled = true;
                    await fetch('${ADMIN_ROUTE}/add', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name, uid}) });
                    location.reload();
                }
                async function delUser(id, uid) {
                    await fetch('${ADMIN_ROUTE}/del', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id, uid}) });
                    location.reload();
                }
            </script>
        </body></html>
    `);
});

// ==========================================
// SOCKET.IO & STATE MANAGEMENT
// ==========================================
io.on('connection', (socket) => {
    socket.emit('init_logs', systemLogs);
});

// UI Updater Loop (For Countdown Timers)
setInterval(() => {
    const uiData = {};
    const now = Date.now();
    for (const uid in activeTimers) {
        const timerObj = activeTimers[uid];
        const diff = timerObj.nextRun - now;
        
        let remainingStr = "Running...";
        if (diff > 0) {
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            remainingStr = `${mins}m ${secs}s`; // Fixed Syntax Here
        }

        uiData[uid] = {
            name: timerObj.name,
            lastTime: lastActivationData[uid] || 'Pending...',
            remaining: remainingStr
        };
    }
    io.emit('update_ui', uiData);
}, 1000);

function appendLog(html) {
    const timeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour12: false });
    const fullLog = `<div class="log-entry"><span class="log-time">[${timeStr}]</span> ${html}</div>`; // Fixed Syntax Here
    
    systemLogs.push(fullLog);
    if(systemLogs.length > 100) systemLogs.shift();
    
    io.emit('cron_log', fullLog);
}

// ==========================================
// UID MANAGEMENT & CYCLE START
// ==========================================
app.post(ADMIN_ROUTE + '/add', checkAuth, async (req, res) => {
    const { name, uid } = req.body;
    await supabase.from('targets').insert([{ name, uid }]);
    startUIDCycle(uid, name);
    res.json({ success: true });
});

app.post(ADMIN_ROUTE + '/del', checkAuth, async (req, res) => {
    const { id, uid } = req.body;
    await supabase.from('targets').delete().eq('id', id);
    if (activeTimers[uid]) {
        clearInterval(activeTimers[uid].interval);
        delete activeTimers[uid];
        appendLog(`🛑 Stopped cycle for [${uid}]`); // Fixed Syntax Here
    }
    res.json({ success: true });
});

function startUIDCycle(uid, name) {
    appendLog(`<span style="color:var(--secondary)">>> Registering ${name} & Starting immediate run!</span>`); // Fixed Syntax Here
    
    if (activeTimers[uid]) clearInterval(activeTimers[uid].interval);
    
    const getNextRun = () => Date.now() + (40 * 60 * 1000);

    runGhostActivator(uid, name).catch(e => console.log(e));

    activeTimers[uid] = {
        name: name,
        nextRun: getNextRun(),
        interval: setInterval(() => {
            activeTimers[uid].nextRun = getNextRun();
            appendLog(`<span style="color:var(--secondary)">>> 40 Mins passed! Reactivating ${name}...</span>`); // Fixed Syntax Here
            runGhostActivator(uid, name).catch(e => console.log(e));
        }, 40 * 60 * 1000)
    };
}

// RESTORE TIMERS ON SERVER START
setTimeout(async () => {
    try {
        const { data: users } = await supabase.from('targets').select('*');
        if (users && users.length > 0) {
            appendLog(`Restoring cycles for ${users.length} targets...`); // Fixed Syntax Here
            users.forEach((u, index) => {
                setTimeout(() => startUIDCycle(u.uid, u.name), index * 10000);
            });
        }
    } catch(e) { console.log("Restore error:", e); }
}, 3000);

// ==========================================
// AUTO-PILOT CHROMIUM CORE (THE GHOST)
// ==========================================
async function runGhostActivator(uid, name) {
    let browser;
    const sysLog = (msg) => appendLog(`<span class="log-name">[${name}]</span> ${msg}`); // Fixed Syntax Here

    try {
        sysLog(`Starting Engine...`); // Fixed Syntax Here
        
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable' 
        });

        const page = (await browser.pages())[0] || await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');

        page.on('dialog', async dialog => { await dialog.dismiss(); }); 

        await page.goto('https://unlockffbeta.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        let safetyCounter = 0;
        let uidInjected = false;
        
        while (safetyCounter < 45) { 
            safetyCounter++;

            const isSuccess = await page.evaluate(() => {
                const text = document.body.innerText.toLowerCase();
                if (text.includes('step ') && text.includes(' of ')) return false;
                return text.includes('access granted') || text.includes('successfully') || text.includes('expires in');
            });

            if (isSuccess) {
                sysLog(`<span style="color:#39ff14; font-weight:bold;">✅ Activation Successful!</span>`); // Fixed Syntax Here
                lastActivationData[uid] = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi' });
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
                if (injected) { 
                    uidInjected = true; 
                    sysLog(`UID Inserted.`); // Fixed Syntax Here
                    await new Promise(r => setTimeout(r, 1000)); 
                }
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
                            return text;
                        }
                    }
                }
                return null;
            });

            if (clicked) {
                sysLog(`Clicked: "${clicked}"`); // Fixed Syntax Here
                await new Promise(r => setTimeout(r, 2000));
            } else {
                await new Promise(r => setTimeout(r, 1500));
            }
            
            const isBlocked = await page.evaluate(() => document.body.innerText.toLowerCase().includes('invalid id'));
            if(isBlocked) throw new Error("Invalid ID / Blocked");
        }
        throw new Error("Timeout! Took too long.");
    } catch (error) {
        sysLog(`<span style="color:#ff3333">❌ Error: ${error.message}</span>`); // Fixed Syntax Here
    } finally {
        if (browser) await browser.close();
        sysLog(`Engine Closed.`); // Fixed Syntax Here
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`👑 ROMEO KING ADMIN SERVER RUNNING`);
    console.log(`👉 Admin: http://localhost:${PORT}${ADMIN_ROUTE}/login`);
    console.log(`👉 Live Status: http://localhost:${PORT}/`);
    console.log(`=========================================\n`);
});
