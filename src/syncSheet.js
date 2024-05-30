const Clears = require("../models/clears");
const axios = require("axios");
require("dotenv").config();

const migrationURL = process.env.migrationURL;
const migrationToken = process.env.migrationToken;

async function syncSheet() {
  try {
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

    // Send the DELETE request to remove duplicates from the API
    await axios.delete(`${migrationURL}/duplicates`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${migrationToken}`,
      },
    });

    console.log("Duplicates removed successfully.");
  } catch (error) {
    console.error("Error syncing clear records:", error.message);
  }
}

module.exports = syncSheet;
