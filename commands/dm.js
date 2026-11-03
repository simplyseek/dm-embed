const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const store = require('../utils/store');
const { buildEmbed } = require('../utils/embedData');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Turn the target text into a list of users to DM.
// Accepts: "everyone" / "@everyone", a role mention (<@&id>) or role ID,
// a user mention (<@id> / <@!id>) or a user ID.
async function resolveRecipients(guild, raw) {
    const v = String(raw || '').trim();
    const low = v.toLowerCase();

    if (low === 'everyone' || low === '@everyone') {
        const all = await guild.members.fetch();
        const users = [...all.values()].filter(m => !m.user.bot).map(m => m.user);
        return { label: 'everyone in this server', users };
    }

    const roleMention = v.match(/^<@&(\d{5,25})>$/);
    const roleId = roleMention ? roleMention[1]
        : (/^\d{5,25}$/.test(v) && guild.roles.cache.has(v) ? v : null);
    if (roleId) {
        const role = guild.roles.cache.get(roleId);
        await guild.members.fetch();
        const users = [...role.members.values()].filter(m => !m.user.bot).map(m => m.user);
        return { label: `members with the ${role.name} role`, users };
    }

    const userMention = v.match(/^<@!?(\d{5,25})>$/);
    const userId = userMention ? userMention[1] : (/^\d{5,25}$/.test(v) ? v : null);
    if (userId) {
        try {
            const user = await guild.client.users.fetch(userId);
            if (user.bot) return { error: 'That is a bot account — bots cannot receive DMs.' };
            return { label: user.tag, users: [user] };
        } catch {
            return { error: 'That user could not be found.' };
        }
    }

    return { error: 'I could not understand that target. Use a role mention or role ID, a user mention or user ID, or "everyone".' };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send a DM to a role, a user, or everyone in this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o => o
            .setName('target')
            .setDescription('A role mention/ID, a user mention/ID, or "everyone"')
            .setRequired(true))
        .addStringOption(o => o
            .setName('reason')
            .setDescription('The message text to send in the DM')
            .setRequired(false))
        .addStringOption(o => o
            .setName('embed')
            .setDescription('Name of a saved embed to send (works together with reason)')
            .setRequired(false)
            .setAutocomplete(true)),

    async autocomplete(client, interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const names = store.listEmbeds(interaction.guild.id).filter(n => n.includes(focused)).slice(0, 25);
        await interaction.respond(names.map(n => ({ name: n, value: n }))).catch(() => {});
    },

    async execute(client, interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetRaw = interaction.options.getString('target');
        const reason = interaction.options.getString('reason');
        const embedName = interaction.options.getString('embed');

        let savedEmbed = null;
        if (embedName) {
            savedEmbed = store.getEmbed(interaction.guild.id, embedName);
            if (!savedEmbed) {
                return interaction.editReply({ content: `No saved embed named "${embedName}" in this server. Create one with /embed create.` });
            }
        }
        if (!reason && !savedEmbed) {
            return interaction.editReply({ content: 'Give a reason (the message text) or pick a saved embed to send.' });
        }

        const resolved = await resolveRecipients(interaction.guild, targetRaw);
        if (resolved.error) return interaction.editReply({ content: resolved.error });
        if (!resolved.users.length) {
            return interaction.editReply({ content: `Nobody to DM for that target (${resolved.label}) — no matching members, or only bots.` });
        }

        const payload = {};
        if (reason) payload.content = reason.slice(0, 2000);
        if (savedEmbed) {
            payload.embeds = [buildEmbed(savedEmbed)];
            if (savedEmbed.content && !payload.content) payload.content = savedEmbed.content.slice(0, 2000);
        }

        let sent = 0, failed = 0;
        const total = resolved.users.length;
        for (let i = 0; i < total; i++) {
            try { await resolved.users[i].send(payload); sent++; }
            catch { failed++; }
            if (total > 1 && i < total - 1) {
                if ((i + 1) % 15 === 0) {
                    await interaction.editReply({ content: `Sending DMs to ${resolved.label}… ${i + 1}/${total}` }).catch(() => {});
                }
                await sleep(1100); // stay under Discord's DM rate limits
            }
        }

        return interaction.editReply({
            content: `DM sent to ${sent} of ${total} (${resolved.label}).` +
                (failed ? `\nFailed: ${failed} — those members likely have their DMs closed.` : '')
        });
    }
};
