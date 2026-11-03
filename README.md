# DM + Embed Bot

A small Discord bot with two jobs:

- **/dm** — send a DM to everyone with a role, to one user, or to everyone in the server, using your own message text and/or a saved embed.
- **/embed** — create saved embeds once, then show them in channels or attach them to a /dm.

## Commands

| Command | Who | What it does |
| --- | --- | --- |
| `/dm target:<role/user/everyone> [reason:<text>] [embed:<name>]` | Administrator | DMs the target. `target` takes a role mention or role ID (everyone with that role gets the DM), a user mention or user ID (that user gets the DM), or `everyone` (the whole server). `reason` is the message text. `embed` sends a saved embed — it works together with `reason` (the text goes above the embed). |
| `/embed create name:<name> [title] [description] [color] [content] [author] [footer] [image] [thumbnail]` | Manage Server | Saves an embed under a name. |
| `/embed edit name:<name>` | Manage Server | Opens a form with all fields (title, description, color, footer, image) prefilled — edit everything in one go. |
| `/embed show name:<name>` | Manage Server | Posts the saved embed in the current channel. |
| `/embed list` | Manage Server | Lists the server's saved embeds. |
| `/embed delete name:<name>` | Manage Server | Deletes a saved embed. |

DMs are sent one by one with a short pause between them to stay under Discord's rate limits, and the bot reports how many were delivered and how many failed (members with closed DMs fail). Bots never receive mass DMs. Saved embeds are stored per server in `data.json`.

## Setup

1. Create an application at https://discord.com/developers/applications and add a bot.
2. In the bot's settings, turn ON the **Server Members** privileged intent (Bot → Privileged Gateway Intents) — /dm needs it to find role members and everyone.
3. Invite the bot with scope `bot applications.commands` (Administrator permission is simplest; it only sends DMs and posts embeds).
4. `npm install`
5. Open `config.json` and fill in:
   - `token` — the bot token
   - `clientId` — the application ID
   - `testGuildId` — optional: a server ID to register commands in instantly while testing. Leave empty to register globally.
6. `npm start`

## Examples

- DM the Mods role: `/dm target:@Mods reason:Staff meeting in voice at 9 PM`
- DM one user by ID: `/dm target:1478418811030864003 reason:You won the giveaway — reply to claim`
- DM everyone with a saved embed: `/dm target:everyone embed:announcement`
- Create the embed first: `/embed create name:announcement title:Server Update description:We are back online! color:#0099ff`
