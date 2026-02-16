const Sequelize = require("sequelize");
const sequelize = require("../utils/database");

const PuzzleRatings = sequelize.define(
  "puzzleRatings",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    puzzleId: {
      type: Sequelize.STRING,
      allowNull: false,
      set(value) {
        const formattedValue = String(value).padStart(5, "0");
        this.setDataValue("puzzleId", formattedValue);
      },
      references: {
        model: "puzzles",
        key: "ID",
      },
    },
    userId: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    rating: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
  },
  {
    indexes: [
      { fields: ["puzzleId"] },
      { fields: ["userId"] },
      { unique: true, fields: ["userId", "puzzleId"] },
    ],
  },
);

module.exports = PuzzleRatings;

