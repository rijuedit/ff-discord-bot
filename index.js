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

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("✅ Prefix commands are ready!");
});

function makeEmbed(title, description, color = 0x00bfff) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "FF Discord Bot" })
    .setTimestamp();
}

async function sendApiRequest(url, options = {}) {
  if (!url) {
    throw new Error("এই কমান্ডের API সেট করা নেই।");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(process.env.FF_API_KEY
        ? { Authorization: `Bearer ${process.env.FF_API_KEY}` }
        : {}),
      ...options.headers
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`API error: HTTP ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { result: text };
  }
}

function formatData(data) {
  if (typeof data === "string") return data;
  return JSON.stringify(data, null, 2);
}

async function showApiResult(message, title, apiUrl, uid) {
  if (!apiUrl) {
    return message.reply({
      embeds: [
        makeEmbed(
          "⚠️ API সেট করা নেই",
          "এই কমান্ড চালাতে একটি কার্যকর API URL দরকার। Render-এর Environment Variables-এ API URL সেট করো।",
          0xffa500
        )
      ]
    });
  }

  try {
    const url = apiUrl.replaceAll("{uid}", encodeURIComponent(uid));
    const data = await sendApiRequest(url);

    const result = formatData(data);
    const safeResult =
      result.length > 3500 ? result.slice(0, 3500) + "\n..." : result;

    return message.reply({
      embeds: [
        makeEmbed(title, `**UID:** \`${uid}\`\n\`\`\`json\n${safeResult}\n\`\`\``)
      ]
    });
  } catch (error) {
    console.error(`${title} error:`, error.message);

    return message.reply({
      embeds: [
        makeEmbed(
          "❌ API কাজ করেনি",
          "API URL, API access বা UID চেক করো। API সঠিকভাবে সেট করা না থাকলে আসল তথ্য দেখানো সম্ভব নয়।",
          0xff3333
        )
      ]
    });
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = (args.shift() || "").toLowerCase();

  // !help
  if (command === "help") {
    const embed = makeEmbed(
      "📜 FF Bot Commands",
      [
        "`!check UID` — Free Fire ban status চেক",
        "`!duo UID` — Duo তথ্য দেখানো",
        "`!info UID` — অ্যাকাউন্টের তথ্য",
        "`!freelike REGION UID` — Like API ব্যবহার",
        "`!ping` — বট অনলাইন কি না",
        "`!help` — কমান্ড লিস্ট"
      ].join("\n")
    );

    return message.reply({ embeds: [embed] });
  }

  // !ping
  if (command === "ping") {
    return message.reply({
      embeds: [makeEmbed("🏓 Pong!", "Bot is online!")]
    });
  }

  // !check UID
  if (command === "check") {
    const uid = args[0];

    if (!uid || !/^\d+$/.test(uid)) {
      return message.reply("❗ ব্যবহার: `!check 18810639172`");
    }

    return showApiResult(
      message,
      "🛡️ Free Fire Ban Check",
      process.env.CHECK_API_URL,
      uid
    );
  }

  // !duo UID
  if (command === "duo") {
    const uid = args[0];

    if (!uid || !/^\d+$/.test(uid)) {
      return message.reply("❗ ব্যবহার: `!duo 1439534081`");
    }

    return showApiResult(
      message,
      "🤝 Free Fire Duo Info",
      process.env.DUO_API_URL,
      uid
    );
  }

  // !info UID
  if (command === "info") {
    const uid = args[0];

    if (!uid || !/^\d+$/.test(uid)) {
      return message.reply("❗ ব্যবহার: `!info 7961652175`");
    }

    return showApiResult(
      message,
      "👤 Free Fire Account Info",
      process.env.INFO_API_URL,
      uid
    );
  }

  // !freelike BD UID
  if (command === "freelike") {
    const region = (args[0] || "").toUpperCase();
    const uid = args[1];

    if (!region || !uid || !/^[A-Z]{2,5}$/.test(region) || !/^\d+$/.test(uid)) {
      return message.reply("❗ ব্যবহার: `!freelike BD 2331990551`");
    }

    const apiUrl = process.env.LIKE_API_URL;

    if (!apiUrl) {
      return message.reply({
        embeds: [
          makeEmbed(
            "⚠️ Like API সেট করা নেই",
            "লাইক পাঠানোর জন্য কার্যকর API URL দরকার। API ছাড়া লাইক পাঠানো যাবে না।",
            0xffa500
          )
        ]
      });
    }

    try {
      const data = await sendApiRequest(apiUrl, {
        method: "POST",
        body: JSON.stringify({ region, uid })
      });

      const result = formatData(data);
      const safeResult =
        result.length > 3000 ? result.slice(0, 3000) + "\n..." : result;

      return message.reply({
        embeds: [
          makeEmbed(
            "❤️ Free Fire Like API Result",
            `**Region:** \`${region}\`\n**UID:** \`${uid}\`\n\n\`\`\`json\n${safeResult}\n\`\`\``
          )
        ]
      });
    } catch (error) {
      console.error("Like API error:", error.message);

      return message.reply({
        embeds: [
          makeEmbed(
            "❌ Like API কাজ করেনি",
            "API URL, API access এবং Region সঠিক আছে কি না চেক করো।",
            0xff3333
          )
        ]
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
