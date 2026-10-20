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
const API_BASE = (process.env.FF_API_BASE_URL || "").replace(/\/+$/, "");

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("✅ FF Discord Bot is ready!");
});

function makeEmbed(title, description, color = 0x00bfff) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "FF Discord Bot" })
    .setTimestamp();
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
    throw new Error(data.error);
  }

  if (!data.basicInfo) {
    throw new Error("INVALID_API_RESPONSE");
  }

  return data;
}

function rankValue(value) {
  return value === undefined || value === null
    ? "N/A"
    : String(value);
}

async function handleInfo(message, uid, region = "BD") {
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
        `**Nickname:** ${info.nickname || "Unknown"}\n` +
        `**UID:** \`${info.accountId || uid}\`\n` +
        `**Region:** ${info.region || region}`
      )
      .addFields(
        {
          name: "👤 ACCOUNT",
          value:
            `Level: **${rankValue(info.level)}**\n` +
            `EXP: **${rankValue(info.exp)}**\n` +
            `Likes: **${rankValue(info.liked)}**\n` +
            `Badges: **${rankValue(info.badgeCnt)}**`,
          inline: true
        },
        {
          name: "🏆 RANK",
          value:
            `BR Rank: **${rankValue(info.rank)}**\n` +
            `BR Points: **${rankValue(info.rankingPoints)}**\n` +
            `CS Rank: **${rankValue(info.csRank)}**\n` +
            `CS Points: **${rankValue(info.csRankingPoints)}**`,
          inline: true
        },
        {
          name: "🛡️ GUILD",
          value:
            `Name: **${clan.clanName || "No data"}**\n` +
            `Guild Level: **${rankValue(clan.clanLevel)}**\n` +
            `Members: **${rankValue(clan.memberNum)}**`,
          inline: true
        },
        {
          name: "🐾 PET",
          value:
            `Pet ID: **${rankValue(pet.id)}**\n` +
            `Pet Level: **${rankValue(pet.level)}**`,
          inline: true
        },
        {
          name: "🌐 SOCIAL",
          value:
            `Gender: **${String(social.gender || "N/A").replace("Gender_", "")}**\n` +
            `Signature: ${(social.signature || "N/A").slice(0, 300)}`,
          inline: false
        }
      )
      .setFooter({ text: "FF Discord Bot • Data from API" })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Player Info error:", error.message);

    let reason = "API থেকে তথ্য পাওয়া যায়নি। পরে আবার চেষ্টা করো।";

    if (error.message === "API_SETUP_MISSING") {
      reason =
        "API সেট করা হয়নি। Render-এ FF_API_BASE_URL এবং FF_API_KEY যোগ করো।";
    } else if (error.message === "Invalid UID or Region. Please check and try again.") {
      reason = "UID অথবা Region সঠিক নয়।";
    } else if (error.message === "INVALID_API_RESPONSE") {
      reason = "API থেকে প্রত্যাশিত Player Info পাওয়া যায়নি।";
    } else if (error.message.startsWith("API_HTTP_")) {
      reason =
        `API HTTP error (${error.message.replace("API_HTTP_", "")})। API Key বা endpoint পরীক্ষা করো।`;
    } else if (error.name === "TimeoutError" || error.name === "AbortError") {
      reason = "API response দিতে দেরি হচ্ছে। পরে আবার চেষ্টা করো।";
    }

    return message.reply({
      embeds: [
        makeEmbed("❌ Player Info Error", reason, 0xff3333)
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
            "`!info UID` — Player profile",
            "`!info UID REGION` — Profile with region",
            "`!check UID` — Ban check (API not connected)",
            "`!duo UID` — Duo info (API not connected)",
            "`!freelike BD UID` — Like service (API not connected)"
          ].join("\n")
        )
      ]
    });
  }

  if (command === "info") {
    const uid = args[0];
    const region = (args[1] || "BD").toUpperCase();

    if (!uid || !/^\d+$/.test(uid)) {
      return message.reply("❗ ব্যবহার: `!info 2579249340 BD`");
    }

    if (!/^[A-Z]{2,5}$/.test(region)) {
      return message.reply("❗ Region সঠিকভাবে দাও। উদাহরণ: `BD`");
    }

    return handleInfo(message, uid, region);
  }

  if (command === "check") {
    if (!args[0] || !/^\d+$/.test(args[0])) {
      return message.reply("❗ ব্যবহার: `!check 18810639172`");
    }

    return message.reply({
      embeds: [
        makeEmbed(
          "⚠️ Ban Check API দরকার",
          "বর্তমানে Player Info API যুক্ত করা হয়েছে। Ban status চেক করার জন্য আলাদা Ban Check endpoint লাগবে।"
        )
      ]
    });
  }

  if (command === "duo") {
    if (!args[0] || !/^\d+$/.test(args[0])) {
      return message.reply("❗ ব্যবহার: `!duo 1439534081`");
    }

    return message.reply({
      embeds: [
        makeEmbed(
          "⚠️ Duo API দরকার",
          "বর্তমান API ডকুমেন্টেশনে Duo partner তথ্যের endpoint দেওয়া নেই।"
        )
      ]
    });
  }

  if (command === "freelike") {
    const region = (args[0] || "").toUpperCase();
    const uid = args[1];

    if (!region || !uid || !/^[A-Z]{2,5}$/.test(region) || !/^\d+$/.test(uid)) {
      return message.reply("❗ ব্যবহার: `!freelike BD 2331990551`");
    }

    return message.reply({
      embeds: [
        makeEmbed(
          "⚠️ Like API দরকার",
          "এখনো কোনো Like API সংযুক্ত করা হয়নি। তাই বট কোনো লাইক পাঠায়নি।"
        )
      ]
    });
  }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error("Discord login failed:", error.message);
  process.exit(1);
});
