const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  Permissions,
  MessageManager,
  Embed,
  Collection,
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

client.commands = new Collection();
require("dotenv").config();

const functions = fs
  .readdirSync("./src/functions")
  .filter((file) => file.endsWith(".js"));
const eventFiles = fs
  .readdirSync("./src/events")
  .filter((file) => file.endsWith(".js"));
const commandFolders = fs.readdirSync("./src/commands");

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

(async () => {
  try {
    // Download puzzles at startup
    //await downloadPuzzles();

    // Schedule the puzzle download every 12 hours
    cron.schedule("0 */12 * * *", downloadPuzzles);
    // Schedule the puzzle download every 3 minutes for testing
    // cron.schedule("*/3 * * * *", downloadPuzzles);

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
