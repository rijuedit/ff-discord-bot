require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Events
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const API_BASE_URL = process.env.FF_API_BASE_URL;
const API_KEY = process.env.FF_API_KEY;

async function getPlayerData(endpoint, params = {}) {
  if (!API_BASE_URL) {
    throw new Error("API_NOT_CONFIGURED");
  }

  const url = new URL(
    endpoint.replace(/^\/+/, "") + "",
    API_BASE_URL.replace(/\/?$/, "/")
  );

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const headers = {};
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`API_ERROR_${response.status}`);
  }

  return response.json();
}

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

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;

  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x00BFFF)
      .setTitle("🔥 Free Fire Bot Commands")
      .setDescription([
        "`/player uid:` Player information",
        "`/duo uid1 uid2:` Duo information",
        "`/ban uid:` Ban status",
        "`/level uid:` Player level",
        "`/likes uid:` Like feature (API required)",
        "`/ping:` Bot response time"
      ].join("\n"))
      .setFooter({ text: "Riju FF Discord Bot" });

    return interaction.reply({ embeds: [embed] });
  }

  if (command === "ping") {
    return interaction.reply(
      `🏓 Pong! WebSocket ping: ${client.ws.ping}ms`
    );
  }

  await interaction.deferReply();

  try {
    let endpoint;
    let params = {};

    if (command === "player") {
      endpoint = "player";
      params.uid = interaction.options.getString("uid", true);
    }

    if (command === "duo") {
      endpoint = "duo";
      params.uid1 = interaction.options.getString("uid1", true);
      params.uid2 = interaction.options.getString("uid2", true);
    }

    if (command === "ban") {
      endpoint = "ban";
      params.uid = interaction.options.getString("uid", true);
    }

    if (command === "level") {
      endpoint = "level";
      params.uid = interaction.options.getString("uid", true);
    }

    if (command === "likes") {
      endpoint = "likes";
      params.uid = interaction.options.getString("uid", true);
    }

    const data = await getPlayerData(endpoint, params);

    const embed = new EmbedBuilder()
      .setColor(0x00D084)
      .setTitle(`✅ ${command.toUpperCase()} RESULT`)
      .setDescription("```json\n" +
        JSON.stringify(data, null, 2).slice(0, 3500) +
        "\n```")
      .setFooter({ text: "Riju FF Discord Bot" });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error(error);

    let message = "❌ API থেকে তথ্য পাওয়া যায়নি। পরে আবার চেষ্টা করো।";

    if (error.message === "API_NOT_CONFIGURED") {
      message =
        "⚠️ Free Fire API এখনো সেট করা হয়নি। API URL যুক্ত করার পর এই কমান্ড কাজ করবে।";
    }

    await interaction.editReply(message);
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN environment variable.");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
