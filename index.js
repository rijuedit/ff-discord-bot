const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const http = require('http');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('Error: Set DISCORD_TOKEN, DISCORD_CLIENT_ID and DISCORD_GUILD_ID');
  process.exit(1);
}

// Render Web Service health-check server
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Discord bot is running!');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Web server listening on port ${PORT}`);
});

// Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Example slash command
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check whether the bot is online')
    .toJSON()
];

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong! Bot is online.');
  }
});

client.on('error', error => {
  console.error('Discord client error:', error);
});

// Register commands and start the bot
async function startBot() {
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('Slash commands registered successfully!');

    await client.login(TOKEN);
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

startBot();
