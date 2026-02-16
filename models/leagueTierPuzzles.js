const Sequelize = require("sequelize");
const sequelize = require("../utils/database");

const LeagueTierPuzzles = sequelize.define(
  "leagueTierPuzzles",
  {
    tierId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "leagueTiers",
        key: "id",
      },
    },
    puzzleId: {
      type: Sequelize.STRING,
      allowNull: false,
      references: {
        model: "puzzles",
        key: "ID",
      },
    },
  },
  {
    indexes: [
      { fields: ["tierId"] },
      { fields: ["puzzleId"] },
      { unique: true, fields: ["tierId", "puzzleId"] },
    ],
  },
);

module.exports = LeagueTierPuzzles;

