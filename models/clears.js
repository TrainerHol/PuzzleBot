const Sequelize = require("sequelize");
const sequelize = require("../utils/database");
const Puzzles = require("./puzzles");

const Clears = sequelize.define(
  "clears",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    jumper: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    puzzleId: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["jumper", "puzzleId"], // Update the unique constraint fields
      },
    ],
  },
);

Clears.belongsTo(Puzzles, { foreignKey: "puzzleId", targetKey: "ID" });

module.exports = Clears;
