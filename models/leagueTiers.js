const Sequelize = require("sequelize");
const sequelize = require("../utils/database");

const LeagueTiers = sequelize.define(
  "leagueTiers",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    seasonId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "leagueSeasons",
        key: "id",
      },
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    sortOrder: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  },
  {
    indexes: [
      { fields: ["seasonId"] },
      { unique: true, fields: ["seasonId", "name"] },
    ],
  },
);

module.exports = LeagueTiers;

