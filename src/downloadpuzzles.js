const axios = require("axios");
const sequelize = require("../utils/database");
const Puzzles = require("../models/puzzles");
require("dotenv").config();

const apiUrl = process.env.sheet;

async function downloadAndInsertPuzzles() {
  try {
    const response = await axios.get(apiUrl);
    const puzzlesData = response.data;

    for (const puzzle of puzzlesData) {
      if (puzzle["Puzzle Name"] && puzzle["Puzzle Name"].trim() !== "") {
        try {
          await Puzzles.upsert({
            ID: puzzle.ID,
            Rating: puzzle.Rating,
            PuzzleName: puzzle["Puzzle Name"],
            Builder: puzzle.Builder,
            World: puzzle.World,
            M: puzzle.M,
            E: puzzle.E,
            S: puzzle.S,
            P: puzzle.P,
            V: puzzle.V,
            J: puzzle.J,
            G: puzzle.G,
            L: puzzle.L,
            X: puzzle.X,
            GoalsRules: puzzle["Goals/Rules"],
            District: puzzle.District,
            Ward: puzzle.Ward,
            Plot: puzzle.Plot,
            Room: puzzle.Room,
            Status: puzzle.Status,
            Datacenter: puzzle.Datacenter,
            LeagueDivision: puzzle["League Division"],
            Season: puzzle.Season,
            Address: puzzle.Address,
          });
          //console.log(`Upserted puzzle with ID: ${puzzle.ID}`);
        } catch (error) {
          console.error(`Error upserting puzzle with ID: ${puzzle.ID}`, error);
        }
      } else {
        //console.log(`Skipping puzzle with empty name: ${puzzle.ID}`);
      }
    }

    console.log("Puzzles data downloaded and upserted successfully.");
  } catch (error) {
    console.error("Error downloading puzzles data:", error);
  }
}

module.exports = {
  downloadAndInsertPuzzles,
};
