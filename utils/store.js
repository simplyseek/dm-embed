// Tiny JSON-file storage. Data lives in data.json next to index.js:
// { guilds: { <guildId>: { embeds: { <name>: <embed data> } } } }
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data.json');
let data = { guilds: {} };
try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (raw && typeof raw === 'object' && raw.guilds) data = raw;
} catch { /* first run: no file yet */ }

function save() {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function guild(gid) {
    if (!data.guilds[gid]) data.guilds[gid] = { embeds: {} };
    if (!data.guilds[gid].embeds) data.guilds[gid].embeds = {};
    return data.guilds[gid];
}

function normName(name) {
    return String(name || '').trim().toLowerCase();
}

function getEmbed(gid, name) {
    return guild(gid).embeds[normName(name)] || null;
}

function setEmbed(gid, name, embedData) {
    guild(gid).embeds[normName(name)] = embedData;
    save();
}

function deleteEmbed(gid, name) {
    const g = guild(gid);
    const key = normName(name);
    if (!g.embeds[key]) return false;
    delete g.embeds[key];
    save();
    return true;
}

function listEmbeds(gid) {
    return Object.keys(guild(gid).embeds).sort();
}

module.exports = { guild, save, normName, getEmbed, setEmbed, deleteEmbed, listEmbeds };
