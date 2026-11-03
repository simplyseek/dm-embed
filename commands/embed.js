const {
    SlashCommandBuilder, PermissionFlagsBits,
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder
} = require('discord.js');
const store = require('../utils/store');
const { buildEmbed, validColor, normColor, validUrl } = require('../utils/embedData');

function nameOption(o) {
    return o.setName('name').setDescription('Name for this saved embed').setRequired(true).setAutocomplete(true);
}

function collectFields(interaction) {
    const g = (n) => interaction.options.getString(n);
    const out = {};
    if (g('title')) out.title = g('title');
    if (g('description')) out.description = g('description');
    if (g('content')) out.content = g('content');
    if (g('author')) out.author = g('author');
    if (g('footer')) out.footer = g('footer');
    if (g('thumbnail')) out.thumbnail = g('thumbnail');
    if (g('image')) out.image = g('image');
    if (g('color')) out.color = normColor(g('color'));
    return out;
}

function validate(interaction, data) {
    const color = interaction.options.getString('color');
    if (color && !validColor(color)) return 'Color must be a 6-digit hex value like #0099ff.';
    for (const key of ['image', 'thumbnail']) {
        const v = interaction.options.getString(key);
        if (v && !validUrl(v)) return `The ${key} must be a full http(s) image URL.`;
    }
    if (!data.title && !data.description) return 'Give the embed at least a title or a description.';
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create and manage saved embeds')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sc => sc
            .setName('create')
            .setDescription('Create a saved embed')
            .addStringOption(o => o.setName('name').setDescription('Name for this saved embed').setRequired(true))
            .addStringOption(o => o.setName('title').setDescription('Embed title'))
            .addStringOption(o => o.setName('description').setDescription('Embed description (main text)'))
            .addStringOption(o => o.setName('color').setDescription('Hex color, like #0099ff'))
            .addStringOption(o => o.setName('content').setDescription('Plain text sent above the embed'))
            .addStringOption(o => o.setName('author').setDescription('Author name shown at the top'))
            .addStringOption(o => o.setName('footer').setDescription('Footer text'))
            .addStringOption(o => o.setName('image').setDescription('Large image URL'))
            .addStringOption(o => o.setName('thumbnail').setDescription('Small thumbnail image URL')))
        .addSubcommand(sc => sc
            .setName('edit')
            .setDescription('Edit all fields of a saved embed in one form')
            .addStringOption(nameOption))
        .addSubcommand(sc => sc
            .setName('show')
            .setDescription('Post a saved embed in this channel')
            .addStringOption(nameOption))
        .addSubcommand(sc => sc
            .setName('list')
            .setDescription('List this server\'s saved embeds'))
        .addSubcommand(sc => sc
            .setName('delete')
            .setDescription('Delete a saved embed')
            .addStringOption(nameOption)),

    async autocomplete(client, interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const names = store.listEmbeds(interaction.guild.id).filter(n => n.includes(focused)).slice(0, 25);
        await interaction.respond(names.map(n => ({ name: n, value: n }))).catch(() => {});
    },

    async execute(client, interaction) {
        const sub = interaction.options.getSubcommand();
        const gid = interaction.guild.id;

        if (sub === 'create') {
            const name = store.normName(interaction.options.getString('name'));
            if (!/^[a-z0-9][a-z0-9-_]{0,30}$/.test(name)) {
                return interaction.reply({ content: 'Embed names use lowercase letters, numbers, dashes and underscores (max 31 characters).', ephemeral: true });
            }
            const data = collectFields(interaction);
            const err = validate(interaction, data);
            if (err) return interaction.reply({ content: err, ephemeral: true });
            store.setEmbed(gid, name, data);
            return interaction.reply({ content: `Saved embed "${name}". Post it with /embed show, or send it with /dm (embed option).`, ephemeral: true });
        }

        if (sub === 'edit') {
            const name = store.normName(interaction.options.getString('name'));
            const data = store.getEmbed(gid, name);
            if (!data) return interaction.reply({ content: `No saved embed named "${name}" in this server.`, ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId(`embededit_${name}`)
                .setTitle(`Edit embed: ${name}`.slice(0, 45));
            const field = (id, label, style, value, required) => new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(!!required)
                    .setValue(value ? String(value).slice(0, style === TextInputStyle.Paragraph ? 4000 : 100) : '')
            );
            modal.addComponents(
                field('title', 'Title', TextInputStyle.Short, data.title, false),
                field('description', 'Description', TextInputStyle.Paragraph, data.description, false),
                field('color', 'Color (hex, like #0099ff)', TextInputStyle.Short, data.color, false),
                field('footer', 'Footer', TextInputStyle.Short, data.footer, false),
                field('image', 'Image URL', TextInputStyle.Short, data.image, false)
            );
            return interaction.showModal(modal);
        }

        if (sub === 'show') {
            const name = store.normName(interaction.options.getString('name'));
            const data = store.getEmbed(gid, name);
            if (!data) return interaction.reply({ content: `No saved embed named "${name}" in this server.`, ephemeral: true });
            return interaction.reply({ content: data.content || undefined, embeds: [buildEmbed(data)] });
        }

        if (sub === 'list') {
            const names = store.listEmbeds(gid);
            return interaction.reply({
                content: names.length ? `Saved embeds in this server (${names.length}):\n` + names.map(n => `- ${n}`).join('\n') : 'No saved embeds yet. Create one with /embed create.',
                ephemeral: true
            });
        }

        if (sub === 'delete') {
            const name = store.normName(interaction.options.getString('name'));
            const ok = store.deleteEmbed(gid, name);
            return interaction.reply({ content: ok ? `Deleted the saved embed "${name}".` : `No saved embed named "${name}" in this server.`, ephemeral: true });
        }
    },

    // Called by index.js when the edit modal is submitted.
    async handleModal(client, interaction) {
        const name = store.normName(interaction.customId.slice('embededit_'.length));
        const current = store.getEmbed(interaction.guild.id, name);
        if (!current) return interaction.reply({ content: `The embed "${name}" no longer exists.`, ephemeral: true });

        const next = { ...current };
        const title = interaction.fields.getTextInputValue('title').trim();
        const description = interaction.fields.getTextInputValue('description').trim();
        const color = interaction.fields.getTextInputValue('color').trim();
        const footer = interaction.fields.getTextInputValue('footer').trim();
        const image = interaction.fields.getTextInputValue('image').trim();

        if (color && !validColor(color)) return interaction.reply({ content: 'Color must be a 6-digit hex value like #0099ff.', ephemeral: true });
        if (image && !validUrl(image)) return interaction.reply({ content: 'The image must be a full http(s) image URL.', ephemeral: true });
        if (!title && !description) return interaction.reply({ content: 'The embed needs at least a title or a description.', ephemeral: true });

        next.title = title || undefined;
        next.description = description || undefined;
        next.color = color ? normColor(color) : undefined;
        next.footer = footer || undefined;
        next.image = image || undefined;
        for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];

        store.setEmbed(interaction.guild.id, name, next);
        return interaction.reply({ content: `Embed "${name}" updated.`, ephemeral: true });
    }
};
