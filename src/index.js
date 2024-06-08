const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  Permissions,
  MessageManager,
  Embed,
  Collection,
  ActivityType,
} = require("discord.js");
const fs = require("fs");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
const cron = require("node-cron");
const { downloadAndInsertPuzzles } = require("./downloadpuzzles");
const sequelize = require("../utils/database");
const { syncSheet } = require("./syncSheet");

client.commands = new Collection();
require("dotenv").config();

const functions = fs
  .readdirSync("./src/functions")
  .filter((file) => file.endsWith(".js"));
const eventFiles = fs
  .readdirSync("./src/events")
  .filter((file) => file.endsWith(".js"));
const commandFolders = fs.readdirSync("./src/commands");

// Array of statuses to cycle through
const statuses = [
  { name: "void furniture destroy the servers.", type: ActivityType.Watching },
  { name: "ffxiv.ju.mp", type: ActivityType.Playing },
  { name: "people fall.", type: ActivityType.Watching },
  { name: "message book signing.", type: ActivityType.Competing },
  { name: "4★ btw!", type: ActivityType.Playing },
  {
    name: "trainerhol.github.io/Strange-Housing/",
    type: ActivityType.Playing,
  },
  { name: "ankles breaking.", type: ActivityType.Listening },
  { name: "with blue vases.", type: ActivityType.Playing },
  { name: "Hell on High.", type: ActivityType.Competing },
  { name: "your /badgelist.", type: ActivityType.Watching },
  { name: "people get nucked.", type: ActivityType.Watching },
  { name: "Heavensward Diadem.", type: ActivityType.Competing },
  { name: "FINAL FANTASY XIV", type: ActivityType.Playing },
  { name: "move to Front Door.", type: ActivityType.Playing },
  // What else?
];

let currentStatusIndex = 0;

function cycleStatus() {
  const status = statuses[currentStatusIndex];
  client.user.setPresence({ activities: [status], status: "online" });

  currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
}

async function downloadPuzzles() {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    console.log("Downloading puzzles from the sheet...");
    await downloadAndInsertPuzzles();
    console.log("Puzzle download completed.");
  } catch (error) {
    console.error(
      "Unable to connect to the database or download puzzles:",
      error,
    );
  }
}

client.once("ready", () => {
  // Set initial status
  cycleStatus();

  // Cycle through statuses every 15 seconds
  setInterval(cycleStatus, 15000);
});

(async () => {
  try {
    // Download puzzles at startup
    //await downloadPuzzles();

    // Schedule the puzzle download every 12 hours
    cron.schedule("0 0 */6 * * *", downloadPuzzles);
    // Schedule the puzzle download every 3 minutes for testing
    // cron.schedule("*/3 * * * *", downloadPuzzles);

    // Schedule the syncSheet function every 12 hours
    cron.schedule("0 0 */6 * * *", syncSheet);

    for (const file of functions) {
      require(`./functions/${file}`)(client);
    }

    client.handleEvents(eventFiles, "./src/events");
    client.handleCommands(commandFolders, "./src/commands");

    client.login(process.env.token);
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
