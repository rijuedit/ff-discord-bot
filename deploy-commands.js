require("dotenv").config();

const { REST, Routes } = require("discord.js");

const commands = [
  {
    name: "player",
    description: "Get Free Fire player information",
    options: [{
      name: "uid",
      description: "Free Fire Player UID",
      type: 3,
      required: true
    }]
  },
  {
    name: "duo",
    description: "Check duo information",
    options: [
      {
        name: "uid1",
        description: "First player's UID",
        type: 3,
        required: true
      },
      {
        name: "uid2",
        description: "Second player's UID",
        type: 3,
        required: true
      }
    ]
  },
  {
    name: "ban",
    description: "Check player ban status",
    options: [{
      name: "uid",
      description: "Free Fire Player UID",
      type: 3,
      required: true
    }]
  },
  {
    name: "level",
    description: "Check player level",
    options: [{
      name: "uid",
      description: "Free Fire Player UID",
      type: 3,
      required: true
    }]
  },
  {
    name: "likes",
    description: "Check or send likes if supported by your API",
    options: [{
      name: "uid",
      description: "Free Fire Player UID",
      type: 3,
      required: true
    }]
  },
  {
    name: "help",
    description: "Show bot commands"
  },
  {
    name: "ping",
    description: "Check bot response time"
  }
];

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId || !guildId) {
    throw new Error(
      "Set DISCORD_TOKEN, DISCORD_CLIENT_ID and DISCORD_GUILD_ID"
    );
  }

  const rest = new REST({ version: "10" }).setToken(token);

  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );

  console.log("Slash commands registered successfully!");
}

main().catch(console.error);
