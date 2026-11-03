const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

let config;
try {
    config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
} catch {
    console.error('Missing config.json — copy config.example.json to config.json and fill in your bot token and application (client) ID.');
    process.exit(1);
}
if (!config.token || config.token.includes('PUT_YOUR')) {
    console.error('config.json has no real bot token yet — fill in "token" first.');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers // needed to list role members / everyone for /dm
    ]
});

client.commands = new Collection();
for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(__dirname, 'commands', file));
    client.commands.set(cmd.data.name, cmd);
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    const payload = [...client.commands.values()].map(c => c.data.toJSON());
    try {
        if (config.testGuildId) {
            const guild = await client.guilds.fetch(config.testGuildId);
            await guild.commands.set(payload);
            console.log(`Registered ${payload.length} commands in test guild ${guild.name} (instant).`);
        } else {
            await client.application.commands.set(payload);
            console.log(`Registered ${payload.length} commands globally (can take a while to appear).`);
        }
    } catch (e) {
        console.error('Command registration failed:', e.message);
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isAutocomplete()) {
            const cmd = client.commands.get(interaction.commandName);
            if (cmd && cmd.autocomplete) await cmd.autocomplete(client, interaction);
            return;
        }
        if (interaction.isModalSubmit() && interaction.customId.startsWith('embededit_')) {
            const cmd = client.commands.get('embed');
            if (cmd && cmd.handleModal) await cmd.handleModal(client, interaction);
            return;
        }
        if (interaction.isChatInputCommand()) {
            const cmd = client.commands.get(interaction.commandName);
            if (!cmd) return;
            await cmd.execute(client, interaction);
        }
    } catch (e) {
        console.error('Interaction error:', e);
        const msg = { content: 'Something went wrong running that command.', ephemeral: true };
        if (interaction.deferred || interaction.replied) await interaction.followUp(msg).catch(() => {});
        else await interaction.reply(msg).catch(() => {});
    }
});

client.login(config.token);
