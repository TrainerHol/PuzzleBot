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
    puzzle: {
      type: Sequelize.STRING,
      allowNull: false,
      set(value) {
        const formattedValue = String(value).padStart(5, "0");
        this.setDataValue("puzzle", formattedValue);
      },
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["jumper", "puzzle"],
      },
    ],
  },
);

module.exports = Clears;
