// Low Poly Drift - online server (Node.js + ws)
// Serves index.html and relays car positions between players in the same room.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 8;
const MAPS = 9;
const CAR_TYPES = 14; // number of buyable vehicles (keep equal to the car list in index.html)
// Room flow: wait (Trick Park) -> vote (3 random maps) -> race (3 laps) -> wait ...   (env overrides are only meant for testing)
const MATCH_MS = process.env.MATCH_MS !== undefined ? +process.env.MATCH_MS : 8 * 60 * 1000; // a race lasts at most 8 minutes
const VOTE_MS = process.env.VOTE_MS !== undefined ? +process.env.VOTE_MS : 15 * 1000;         // time to pick one of the 3 maps
const MIN_RACE_MS = process.env.MIN_RACE_MS !== undefined ? +process.env.MIN_RACE_MS : 20000; // faster 'finishes' are ignored
const AFK_MS = process.env.AFK_MS !== undefined ? +process.env.AFK_MS : 60 * 1000;           // standing still this long = kicked
const AFK_WARN_MS = Math.max(0, AFK_MS - 20000);                                                // warning during the last 20 s
const MOVE_EPS = 3;                                                                             // units a car must travel to count as 'moving'
const validElo = (v) => Math.max(0, Math.min(9999, (+v) | 0));
const validCar = (v) => Math.max(0, Math.min(CAR_TYPES - 1, (+v) | 0));
let nextPub = 1;

// addresses other devices on the same Wi-Fi/LAN can use (virtual adapters are skipped, Wi-Fi first)
const VIRTUAL = /vethernet|virtualbox|vmware|vmnet|docker|veth|br-|utun|awdl|llw|bridge|tailscale|zerotier|hyper-v|wsl/i;
const isWifi = (n) => /wi-?fi|wlan|wireless|^en0$/i.test(n) ? 1 : 0;
function lanUrls() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces()))
    for (const i of list || [])
      if (i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.') && !VIRTUAL.test(name))
        out.push({ name, url: 'http://' + i.address + ':' + PORT });
  return out.sort((a, b) => isWifi(b.name) - isWifi(a.name));
}

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/shop.html': ['shop.html', 'text/html; charset=utf-8'],
  '/lobby.html': ['lobby.html', 'text/html; charset=utf-8'],
  '/game.html': ['game.html', 'text/html; charset=utf-8'],
  '/admin': ['admin.html', 'text/html; charset=utf-8'],
  '/admin/': ['admin.html', 'text/html; charset=utf-8'],
  '/game/admin': ['admin.html', 'text/html; charset=utf-8'],
  '/game.html/admin': ['admin.html', 'text/html; charset=utf-8'],
  '/logo.png': ['logo.png', 'image/png'],
  '/favicon.png': ['favicon.png', 'image/png'],
  '/apple-touch-icon.png': ['apple-touch-icon.png', 'image/png'],
  '/config.js': ['config.js', 'text/javascript; charset=utf-8'],
  '/cars.js': ['cars.js', 'text/javascript; charset=utf-8'],
  '/carmodel.js': ['carmodel.js', 'text/javascript; charset=utf-8'],
  '/ui.css': ['ui.css', 'text/css; charset=utf-8'],
};
const json = (res, o) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(o)); };
const hostName = (r) => { const h = r.players.get(r.host); return h ? h.name : '?'; };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname;
  const em = /^\/emblems\/([a-z_]+\.webp)$/.exec(p);
  if (em) {
    return fs.readFile(path.join(__dirname, 'emblems', em[1]), (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=86400' });
      res.end(data);
    });
  }
  if (p === '/lan') return json(res, lanUrls());
  if (p === '/admin/api' && req.method === 'POST') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 4096) req.destroy(); });
    req.on('end', () => {
      let b; try { b = JSON.parse(body); } catch { b = {}; }
      const ip = req.socket.remoteAddress || '?';
      if (!adminOk(ip, b.pw)) { res.writeHead(403, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: false, error: 'Wrong password' + (ADMIN_ENV || isLoop(ip) ? '' : ' (admin only works from this PC unless ADMIN_PASSWORD is set)') })); }
      try { json(res, Object.assign({ ok: true }, adminCmd(b) || {})); } catch (e) { json(res, { ok: false, error: String(e.message || e) }); }
    });
    return;
  }
  // active public rooms (shown in the lobby)
  if (p === '/rooms') {
    return json(res, [...rooms.values()].filter((r) => r.pub).map((r) => ({
      key: r.key, name: r.name, host: hostName(r), players: r.players.size, max: MAX_PLAYERS,
      racing: r.state !== 'wait',
    })));
  }
  // does a private room exist? (used by "Join private")
  if (p === '/room') {
    const r = rooms.get('R:' + String(u.searchParams.get('code') || '').toUpperCase());
    return json(res, r ? { exists: true, players: r.players.size, max: MAX_PLAYERS } : { exists: false });
  }
  const f = STATIC[p];
  if (!f) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(__dirname, f[0]), (err, data) => {
    if (err) { res.writeHead(500); return res.end(f[0] + ' missing'); }
    res.writeHead(200, { 'Content-Type': f[1], 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---- admin panel: /admin  (password = ADMIN_PASSWORD, default 'admin' and then only reachable from this PC) ----
const ADMIN_ENV = process.env.ADMIN_PASSWORD;
const ADMIN_PW = ADMIN_ENV || 'admin';
const isLoop = (a) => /^(::1|127\.|::ffff:127\.)/.test(a || '');
const adminFails = new Map();
function adminOk(ip, pw) {
  if (!ADMIN_ENV && !isLoop(ip)) return false;
  const f = adminFails.get(ip) || { n: 0, t: 0 };
  if (Date.now() - f.t > 60000) { f.n = 0; }
  if (f.n >= 10) return false;
  const a = Buffer.from(String(pw || '')), b = Buffer.from(ADMIN_PW);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) { f.n++; f.t = Date.now(); adminFails.set(ip, f); }
  return ok;
}

const wss = new WebSocketServer({ server, maxPayload: 2048 });
const rooms = new Map(); // code -> { code, players: Map(id -> {ws,name,slot}), host }
let nextId = 1;

const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const broadcast = (room, o, exceptId) => {
  for (const [id, p] of room.players) if (id !== exceptId) send(p.ws, o);
};
const roster = (room) => {
  const players = {};
  for (const [id, p] of room.players) players[id] = { name: p.name, slot: p.slot, car: p.car, elo: p.elo };
  return { t: 'players', host: room.host, players };
};
const num = (v) => (Number.isFinite(+v) ? +v : 0);

wss.on('connection', (ws) => {
  let room = null, id = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    if (m.t === 'join' && !room) {
      let r;
      if (m.kind === 'public') {
        if (m.create) {
          const n = nextPub++, key = 'PUB' + n;
          r = { key, name: 'Room ' + n, pub: true, players: new Map(), host: null, state: 'wait', endsAt: 0, maps: [], votes: new Map(), raceIds: new Set(), finOrder: [] };
          rooms.set(key, r);
        } else {
          r = rooms.get(String(m.key || ''));
          if (!r || !r.pub) return send(ws, { t: 'error', msg: 'That public room no longer exists' });
        }
      } else if (m.create) {
        // new private room with a random code
        const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code;
        do { code = ''; for (let i = 0; i < 5; i++) code += ABC[Math.floor(Math.random() * ABC.length)]; } while (rooms.has('R:' + code));
        r = { key: 'R:' + code, name: code, pub: false, players: new Map(), host: null, state: 'wait', endsAt: 0, maps: [], votes: new Map(), raceIds: new Set(), finOrder: [] };
        rooms.set(r.key, r);
      } else {
        r = rooms.get('R:' + String(m.room || '').toUpperCase().slice(0, 12));
        if (!r) return send(ws, { t: 'error', msg: 'Private room not found' });
      }
      if (r.players.size >= MAX_PLAYERS) { if (!r.players.size) rooms.delete(r.key); return send(ws, { t: 'error', msg: 'Room is full' }); }
      const used = new Set([...r.players.values()].map((p) => p.slot));
      let slot = 0; while (used.has(slot)) slot++;
      id = String(nextId++); room = r;
      r.players.set(id, { ws, name: String(m.name || 'Player').slice(0, 12), slot, car: validCar(m.car), elo: validElo(m.elo), score: 0, prog: 0, fin: null, ax: null, az: null, moved: Date.now() });
      if (!r.host) r.host = id;
      send(ws, { t: 'welcome', id, slot, code: r.name, pub: r.pub, phase: r.state, left: Math.max(0, r.endsAt - Date.now()), maps: r.maps, votes: voteCounts(r) });
      broadcast(r, roster(r));
    } else if (!room) {
      return;
    } else if (m.t === 's') {
      const p = room.players.get(id); if (!p) return;
      const x = num(m.x), z = num(m.z);
      // idle detection: the car has to leave a small circle around its last 'anchor' position
      if (p.ax === null || Math.hypot(x - p.ax, z - p.az) > MOVE_EPS) { p.ax = x; p.az = z; p.moved = Date.now(); }
      p.score = Math.max(0, Math.min(9999999, num(m.sc)));
      p.prog = num(m.p);
      broadcast(room, { t: 's', id, w: num(m.w) | 0, x, y: num(m.y), z, a: num(m.a), st: num(m.st), vf: num(m.vf), pt: num(m.pt), rl: num(m.rl), sc: p.score | 0, l: num(m.l) | 0, p: p.prog }, id);
    } else if (m.t === 'start' && room.host === id) {
      if (room.state !== 'wait') return; // a vote or a race is already running
      // offer 3 different random maps
      const all = Array.from({ length: MAPS }, (_, i) => i);
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      room.state = 'vote'; room.maps = all.slice(0, 3); room.votes = new Map(); room.endsAt = Date.now() + VOTE_MS;
      for (const p of room.players.values()) { p.moved = Date.now(); p.ax = null; }
      broadcast(room, { t: 'vote', maps: room.maps, left: VOTE_MS, votes: voteCounts(room) });
    } else if (m.t === 'pick' && room.state === 'vote') {
      const i = m.i | 0; if (i < 0 || i > 2) return;
      room.votes.set(id, i);
      broadcast(room, { t: 'votes', votes: voteCounts(room) });
      if ([...room.players.keys()].every((k) => room.votes.has(k))) startRace(room); // everybody has voted
    } else if (m.t === 'fin' && room.state === 'race') {
      const p = room.players.get(id); if (!p) return;
      broadcast(room, { t: 'fin', id, time: num(m.time) });
      // finishing order decides rank points/coins (only racers who were in the room at the start)
      if (room.raceIds.has(id) && !room.finOrder.includes(id) && Date.now() - room.startedAt >= MIN_RACE_MS) {
        room.finOrder.push(id); p.fin = num(m.time);
        send(ws, { t: 'result', pos: room.finOrder.length, total: room.raceIds.size });
      }
    } else if (m.t === 'elo') {
      const p = room.players.get(id); if (p) { p.elo = validElo(m.elo); broadcast(room, roster(room)); }
    } else if (m.t === 'car') {
      const p = room.players.get(id); if (p) { p.car = validCar(m.car); broadcast(room, roster(room)); }
    }
  });

  ws.on('close', () => {
    if (!room) return;
    room.players.delete(id);
    if (!room.players.size) { rooms.delete(room.key); return; }
    if (room.host === id) room.host = room.players.keys().next().value;
    broadcast(room, roster(room));
  });
});

// drop dead connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false; ws.ping();
  });
}, 30000);

const voteCounts = (room) => { const c = [0, 0, 0]; for (const v of room.votes.values()) c[v]++; return c; };

function startRace(room, force) {
  const c = voteCounts(room), best = Math.max(...c);
  const tied = c.map((n, i) => (n === best ? i : -1)).filter((i) => i >= 0); // ties (and nobody voting) are decided by chance
  const map = force != null ? force : room.maps.length ? room.maps[tied[Math.floor(Math.random() * tied.length)]] : Math.floor(Math.random() * MAPS);
  room.state = 'race'; room.startedAt = Date.now(); room.endsAt = room.startedAt + MATCH_MS;
  room.raceIds = new Set(room.players.keys()); room.finOrder = [];
  for (const p of room.players.values()) { p.fin = null; p.prog = 0; p.moved = Date.now(); p.ax = null; }
  broadcast(room, { t: 'start', map, seed: 1 + Math.floor(Math.random() * 2147483645), left: MATCH_MS });
}

function endRace(room) {
  room.state = 'wait';
  const list = [...room.players].map(([id, p]) => ({ id, name: p.name, car: p.car, time: p.fin, prog: p.prog || 0, racer: room.raceIds.has(id) }))
    .sort((a, b) => (a.time != null && b.time != null) ? a.time - b.time : a.time != null ? -1 : b.time != null ? 1 : b.prog - a.prog);
  for (const p of room.players.values()) { p.moved = Date.now(); p.ax = null; p.fin = null; }
  broadcast(room, { t: 'over', results: list });
}

function kick(room, id, reason) {
  const p = room.players.get(id); if (!p) return;
  send(p.ws, { t: 'kicked', reason });
  try { p.ws.close(); } catch {}
  setTimeout(() => { try { p.ws.terminate(); } catch {} }, 1500);
  room.players.delete(id); // remove right away so nobody waits for the socket to close
  if (!room.players.size) { rooms.delete(room.key); return; }
  if (room.host === id) room.host = room.players.keys().next().value;
  broadcast(room, roster(room));
}

function roomList() {
  const now = Date.now();
  return [...rooms.values()].map((r) => ({
    key: r.key, name: r.name, pub: r.pub, state: r.state, left: Math.max(0, r.endsAt - now), host: r.host,
    players: [...r.players].map(([id, p]) => ({ id, name: p.name, car: p.car, score: p.score | 0, prog: p.prog | 0, fin: p.fin, idle: Math.round((now - p.moved) / 1000), host: id === r.host })),
  }));
}
// make every racer finish (they get their reward by position) and end the race
function finishAll(room) {
  if (room.state !== 'race') return false;
  const left = [...room.raceIds].filter((id) => room.players.has(id) && !room.finOrder.includes(id))
    .sort((a, b) => (room.players.get(b).prog || 0) - (room.players.get(a).prog || 0));
  for (const id of left) {
    const p = room.players.get(id), t = Date.now() - room.startedAt;
    room.finOrder.push(id); p.fin = t;
    broadcast(room, { t: 'fin', id, time: t });
    send(p.ws, { t: 'result', pos: room.finOrder.length, total: room.raceIds.size });
  }
  endRace(room); return true;
}
function startVote(room) {
  if (room.state !== 'wait') return false;
  const all = Array.from({ length: MAPS }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  room.state = 'vote'; room.maps = all.slice(0, 3); room.votes = new Map(); room.endsAt = Date.now() + VOTE_MS;
  for (const p of room.players.values()) { p.moved = Date.now(); p.ax = null; }
  broadcast(room, { t: 'vote', maps: room.maps, left: VOTE_MS, votes: voteCounts(room) });
  return true;
}
function adminCmd(b) {
  const cmd = String(b.cmd || '');
  if (cmd === 'state') return { rooms: roomList(), matchMin: MATCH_MS / 60000, maps: MAPS };
  const sel = b.room === '*' || !b.room ? [...rooms.values()] : [rooms.get(String(b.room))].filter(Boolean);
  if (!sel.length) throw new Error('No room selected');
  const pick = (r) => (b.id && b.id !== 'all' ? [[String(b.id), r.players.get(String(b.id))]].filter((x) => x[1]) : [...r.players]);
  let n = 0;
  for (const r of sel) {
    if (cmd === 'finish') { if (finishAll(r)) n++; }
    else if (cmd === 'end') { if (r.state === 'race' || r.state === 'vote') { endRace(r); n++; } }
    else if (cmd === 'startvote') { if (startVote(r)) n++; }
    else if (cmd === 'startrace') { if (r.state !== 'race') { startRace(r, b.map === undefined || b.map === '' ? null : Math.max(0, Math.min(MAPS - 1, b.map | 0))); n++; } }
    else if (cmd === 'kick') { if (b.id && r.players.has(String(b.id))) { kick(r, String(b.id), 'admin'); n++; } }
    else if (cmd === 'say') { broadcast(r, { t: 'toast', text: String(b.text || '').slice(0, 60) }); n++; }
    else if (cmd === 'coins') { const c = Math.max(-1000000, Math.min(1000000, b.amount | 0)); for (const [, p] of pick(r)) { send(p.ws, { t: 'gift', coins: c }); n++; } }
    else if (cmd === 'unlock') { for (const [, p] of pick(r)) { send(p.ws, { t: 'gift', unlock: true }); n++; } }
    else if (cmd === 'wrap') { const w = String(b.wrap || ''); if (!/^[a-z0-9_-]{1,40}$/i.test(w)) throw new Error('Pick a wrap'); for (const [, p] of pick(r)) { send(p.ws, { t: 'gift', wrap: w, from: String(b.from || '').slice(0, 30) }); n++; } }
    else if (cmd === 'power') { for (const [, p] of pick(r)) { send(p.ws, { t: 'power', k: String(b.k || '').slice(0, 20) }); n++; } }
    else throw new Error('Unknown command');
  }
  return { done: n, rooms: roomList() };
}

// once a second: vote/race timers, end finished races, warn and kick idle players
setInterval(() => {
  const now = Date.now();
  for (const room of [...rooms.values()]) {
    if (room.state === 'vote' && now >= room.endsAt) startRace(room);
    else if (room.state === 'race') {
      const done = [...room.raceIds].every((id) => !room.players.has(id) || room.players.get(id).fin != null);
      if (now >= room.endsAt || done) endRace(room);
    }
    for (const [id, p] of [...room.players]) {
      if (room.state === 'race' && p.fin != null) continue; // finished: waiting for the others is not 'idle'
      const idle = now - p.moved;
      if (idle >= AFK_MS) kick(room, id, 'afk');
      else if (idle >= AFK_WARN_MS) send(p.ws, { t: 'afk', left: Math.ceil((AFK_MS - idle) / 1000) });
    }
  }
}, 1000);

server.listen(PORT, '0.0.0.0', () => {
  console.log('Low Poly Drift online: http://localhost:' + PORT);
  console.log('Admin panel: http://localhost:' + PORT + '/admin  (password: ' + (ADMIN_ENV ? 'ADMIN_PASSWORD' : "admin - only from this PC; set ADMIN_PASSWORD to open it elsewhere") + ')');
  const lan = lanUrls();
  if (!lan.length) return console.log('No Wi-Fi/LAN address found: connect the PC to your Wi-Fi to play with phones.');
  console.log('\nOn your Wi-Fi (phones, other PCs):');
  lan.forEach((l) => console.log('  ' + l.url + '   [' + l.name + ']'));
  try { require('qrcode-terminal').generate(lan[0].url, { small: true }); } catch {}
  console.log('If a phone cannot connect: allow Node.js on private networks in the firewall.');
});

module.exports = { lanUrls, PORT };
