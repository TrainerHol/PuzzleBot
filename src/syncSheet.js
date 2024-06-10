const Clears = require("../models/clears");
const axios = require("axios");
require("dotenv").config();

const migrationURL = process.env.migrationURL;
const migrationToken = process.env.migrationToken;

async function syncSheet() {
  try {
    // Delete all entries from the SheetDB
    await axios.delete(migrationURL + "/all", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${migrationToken}`,
      },
    });

    console.log("All entries deleted from SheetDB.");

    // Fetch all clear records from the database
    const clearRecords = await Clears.findAll();

    // Prepare the data for the API request
    const data = clearRecords.map((record) => ({
      jumper: record.jumper,
      puzzle: record.puzzleId,
    }));

    // Send the POST request to add clear records to the API
    await axios.post(
      migrationURL,
      {
        data: data,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${migrationToken}`,
        },
      },
    );

    console.log("Clear records synced successfully.");
  } catch (error) {
    console.error("Error syncing clear records:", error.message);
  }
}

module.exports = { syncSheet };
