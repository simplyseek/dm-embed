const { EmbedBuilder } = require('discord.js');

// Saved embed shape: { title, description, color ('#rrggbb'), content,
// author (name), footer (text), thumbnail (url), image (url) } — all optional.
function buildEmbed(d) {
    const e = new EmbedBuilder();
    if (d.title) e.setTitle(String(d.title).slice(0, 256));
    if (d.description) e.setDescription(String(d.description).slice(0, 4096));
    if (d.color) e.setColor(d.color);
    if (d.author) e.setAuthor({ name: String(d.author).slice(0, 256) });
    if (d.footer) e.setFooter({ text: String(d.footer).slice(0, 2048) });
    if (d.thumbnail) e.setThumbnail(d.thumbnail);
    if (d.image) e.setImage(d.image);
    return e;
}

function validColor(v) {
    return /^#?[0-9a-fA-F]{6}$/.test(String(v || '').trim());
}

function normColor(v) {
    const t = String(v).trim();
    return t.startsWith('#') ? t.toLowerCase() : '#' + t.toLowerCase();
}

function validUrl(v) {
    return /^https?:\/\/\S+$/i.test(String(v || '').trim());
}

module.exports = { buildEmbed, validColor, normColor, validUrl };
