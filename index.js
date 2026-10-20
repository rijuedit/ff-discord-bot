
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = "!";

const API_BASE = (process.env.FF_API_BASE_URL || "")
  .replace(/\/+$/, "");

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log("FF Discord Bot is ready!");
});

function makeEmbed(title, description, color = 0x00bfff) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "FF Discord Bot" })
    .setTimestamp();
}

function valueOrNA(value) {
  return value === undefined || value === null || value === ""
    ? "N/A"
    : String(value);
}

async function getPlayerInfo(uid, region) {
  if (!API_BASE || !process.env.FF_API_KEY) {
    throw new Error("API_SETUP_MISSING");
  }

  const url = new URL(`${API_BASE}/freefireinfo/bhau`);

  url.searchParams.set("uid", uid);
  url.searchParams.set("region", region);
  url.searchParams.set("key", process.env.FF_API_KEY);

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`API_HTTP_${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(String(data.error));
  }

  if (!data.basicInfo) {
    throw new Error("INVALID_API_RESPONSE");
  }

  return data;
}

async function handleInfo(message, uid, region) {
  await message.channel.sendTyping();

  try {
    const data = await getPlayerInfo(uid, region);

    const info = data.basicInfo;
    const clan = data.clanBasicInfo || {};
    const social = data.socialInfo || {};
    const pet = data.petInfo || {};

    const embed = new EmbedBuilder()
      .setColor(0x19c37d)
      .setTitle("🔥 FREE FIRE PLAYER INFO")
      .setDescription(
        `**Nickname:** ${valueOrNA(info.nickname)}\n` +
        `**UID:** \`${valueOrNA(info.accountId || uid)}\`\n` +
        `**Region:** ${valueOrNA(info.region || region)}`
      )
      .addFields(
        {
          name: "👤 ACCOUNT",
          value:
            `Level: **${valueOrNA(info.level)}**\n` +
            `EXP: **${valueOrNA(info.exp)}**\n` +
            `Likes: **${valueOrNA(info.liked)}**\n` +
            `Badges: **${valueOrNA(info.badgeCnt)}**`,
          inline: true
        },
        {
          name: "🏆 RANK",
          value:
            `BR Rank: **${valueOrNA(info.rank)}**\n` +
            `BR Points: **${valueOrNA(info.rankingPoints)}**\n` +
            `CS Rank: **${valueOrNA(info.csRank)}**\n` +
            `CS Points: **${valueOrNA(info.csRankingPoints)}**`,
          inline: true
        },
        {
          name: "🛡️ GUILD",
          value:
            `Name: **${valueOrNA(clan.clanName)}**\n` +
            `Level: **${valueOrNA(clan.clanLevel)}**\n` +
            `Members: **${valueOrNA(clan.memberNum)}**`,
          inline: true
        },
        {
          name: "🐾 PET",
          value:
            `Pet ID: **${valueOrNA(pet.id)}**\n` +
            `Pet Level: **${valueOrNA(pet.level)}**`,
          inline: true
        },
        {
          name: "🌐 SOCIAL",
          value:
            `Gender: **${valueOrNA(social.gender).replace("Gender_", "")}**\n` +
            `Signature: ${(social.signature || "N/A").slice(0, 300)}`,
          inline: false
        }
      )
      .setFooter({ text: "FF Discord Bot • Player Info" })
      .setTimestamp();

    return message.reply({ embeds: [embed] });

  } catch (error) {
    console.error("Player Info error:", error.message);

    let reason = "API থেকে তথ্য পাওয়া যায়নি। পরে আবার চেষ্টা করো।";

    if (error.message === "API_SETUP_MISSING") {
      reason =
        "Render-এর Environment Variables-এ FF_API_BASE_URL এবং FF_API_KEY সেট করো।";
    } else if (
      error.message.toLowerCase().includes("invalid uid") ||
      error.message.toLowerCase().includes("invalid region")
    ) {
      reason = "UID অথবা Region সঠিক নয়।";
    } else if (error.message === "INVALID_API_RESPONSE") {
      reason = "API থেকে Player Info পাওয়া যায়নি।";
    } else if (error.message.startsWith("API_HTTP_")) {
      reason =
        `API Error: HTTP ${error.message.replace("API_HTTP_", "")}. API URL ও Key পরীক্ষা করো।`;
    } else if (
      error.name === "TimeoutError" ||
      error.name === "AbortError"
    ) {
      reason = "API উত্তর দিতে দেরি হচ্ছে। একটু পরে আবার চেষ্টা করো।";
    }

    return message.reply({
      embeds: [
        makeEmbed("❌ PLAYER INFO ERROR", reason, 0xff3333)
      ]
    });
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = (args.shift() || "").toLowerCase();

  if (command === "ping") {
    return message.reply({
      embeds: [
        makeEmbed("🏓 PONG!", "Bot is online and working! 🟢")
      ]
    });
  }

  if (command === "help") {
    return message.reply({
      embeds: [
        makeEmbed(
          "📜 FF BOT COMMANDS",
          [
            "`!ping` — Bot status",
            "`!help` — Command list",
            "`!info BD UID` — Player profile",
            "`!check UID` — Ban check (API not connected)",
            "`!duo UID` — Duo info (API not connected)",
            "`!freelike BD UID` — Like service (API not connected)"
          ].join("\n")
        )
      ]
    });
  }

  // Usage: !info BD 2579249340
  if (command === "info") {
    const region = (args[0] || "").toUpperCase();
    const uid = args[1];

    if (!region || !uid || !/^[A-Z]{2,5}$/.test(region) || !/^\d+$/.test(uid)) {
      return message.reply(
        "❗ সঠিক ব্যবহার: `!info BD 2579249340`"
      );
    }

    return handleInfo(message, uid, region);
  }

  if (command === "check") {
    const uid = args[0];

    if (!uid || !/^\d+$/.test(uid)) {
      return message.reply("❗ ব্যবহার: `!check 2579249340`");
    }

    return message.reply({
      embeds: [
        makeEmbed(
          "⚠️ BAN CHECK API REQUIRED",
          "Ban status চেক করতে আলাদা Ban Check API দরকার। এখনো এই ফিচারটি সংযুক্ত করা হয়নি।"
        )
      ]
    });
  }

  if (command === "duo") {
    const uid = args[0];

    if (!uid || !/^\d+$/.test(uid)) {
      return message.reply("❗ ব্যবহার: `!duo 2579249340`");
    }

    return message.reply({
      embeds: [
        makeEmbed(
          "⚠️ DUO API REQUIRED",
          "Duo partner-এর তথ্য দেখানোর জন্য উপযুক্ত API দরকার। এই ফিচারটি এখনো সংযুক্ত নয়।"
        )
      ]
    });
  }

  if (command === "freelike") {
    const region = (args[0] || "").toUpperCase();
    const uid = args[1];

    if (!region || !uid || !/^[A-Z]{2,5}$/.test(region) || !/^\d+$/.test(uid)) {
      return message.reply(
        "❗ ব্যবহার: `!freelike BD 2579249340`"
      );
    }

    return message.reply({
      embeds: [
        makeEmbed(
          "⚠️ LIKE API REQUIRED",
          "Like পাঠানোর API এখনো সংযুক্ত নয়। তাই বট এখনো কোনো Like পাঠায়নি।"
        )
      ]
    });
  }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error("Discord login failed:", error.message);
  process.exit(1);
});
