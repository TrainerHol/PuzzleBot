const Sequelize = require("sequelize");
const sequelize = require("../utils/database");

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
        fields: ["jumper", "puzzleId"],
      },
    ],
  },
);

module.exports = Clears;
