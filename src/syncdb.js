const sequelize = require("../utils/database");
const Clears = require("../models/clears");
const Puzzles = require("../models/puzzles");
const Badges = require("../models/badges");
const BadgePuzzles = require("../models/badgePuzzles");
const CardSettings = require("../models/cardSettings");
const axios = require("axios");
const { downloadAndInsertPuzzles } = require("./downloadpuzzles");
require("dotenv").config();

async function migrateDataFromJson() {
  try {
    const migrationURL = process.env.migrationURL;
    const response = await axios.get(migrationURL);
    const data = response.data;

    for (const record of data) {
      try {
        const paddedPuzzleId = record.puzzle.padStart(5, "0");
        await Clears.create({
          jumper: record.jumper,
          puzzleId: paddedPuzzleId,
        });
        //console.log(`Record inserted: ${JSON.stringify(record)}`);
      } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
          //console.log(`Duplicate record skipped: ${JSON.stringify(record)}`);
        } else {
          console.error(
            `Error inserting record: ${JSON.stringify(record)}`,
            error,
          );
        }
      }
    }

    console.log("Data migration completed.");
  } catch (error) {
    console.error("Error fetching data from JSON URL:", error);
  }
}

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    await Puzzles.sync({ alter: true });
    await Clears.sync({ alter: true });
    await Badges.sync({ alter: true });
    await BadgePuzzles.sync({ alter: true });
    await CardSettings.sync({ alter: true });

    // Call the downloadAndInsertPuzzles function from downloadpuzzles.js
    await downloadAndInsertPuzzles();

    const count = await Clears.count();
    if (count === 0) {
      console.log("Database is empty. Migrating data from JSON...");
      await migrateDataFromJson();
    } else {
      console.log("Database is not empty. Skipping data migration.");
    }
  } catch (error) {
    console.error("Unable to connect to the database or sync tables:", error);
  } finally {
    // Close the database connection when done
    await sequelize.close();
  }
}

initializeDatabase()
  .then(() => {
    console.log("Database initialization completed.");
    // Perform any other necessary tasks or start the server
  })
  .catch((error) => {
    console.error("Failed to initialize the database:", error);
  });
