const sequelize = require("../utils/database");
const Clears = require("../models/clears");
const Puzzles = require("../models/puzzles");
const axios = require("axios");
require("dotenv").config();

async function migrateDataFromJson() {
  try {
    const migrationURL = process.env.migrationURL;
    const response = await axios.get(migrationURL);
    const data = response.data;

    for (const record of data) {
      try {
        await Clears.create(record);
        console.log(`Record inserted: ${JSON.stringify(record)}`);
      } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
          console.log(`Duplicate record skipped: ${JSON.stringify(record)}`);
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

    await Clears.sync({ alter: true });
    console.log("Clears table has been synced.");

    await Puzzles.sync({ alter: true });
    console.log("Puzzles table has been synced.");

    const count = await Clears.count();
    if (count === 0) {
      console.log("Database is empty. Migrating data from JSON...");
      await migrateDataFromJson();
    } else {
      console.log("Database is not empty. Skipping data migration.");
    }
  } catch (error) {
    console.error("Unable to connect to the database or sync tables:", error);
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
