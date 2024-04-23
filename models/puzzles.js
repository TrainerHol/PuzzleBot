const Sequelize = require("sequelize");
const sequelize = require("../utils/database");
const Clears = require("./clears");

const Puzzles = sequelize.define("puzzles", {
  ID: {
    type: Sequelize.STRING,
    primaryKey: true,
    allowNull: false,
    set(value) {
      const formattedValue = String(value).padStart(5, "0");
      this.setDataValue("ID", formattedValue);
    },
  },
  Rating: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  PuzzleName: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  Builder: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  World: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  M: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  E: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  S: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  P: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  V: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  J: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  G: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  L: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  X: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  GoalsRules: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  District: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  Ward: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  Plot: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  Room: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  Status: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  Datacenter: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  LeagueDivision: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  Season: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  Address: {
    type: Sequelize.STRING,
    allowNull: true,
  },
});

Puzzles.hasMany(Clears, { foreignKey: "puzzleId", sourceKey: "ID" });

module.exports = Puzzles;
