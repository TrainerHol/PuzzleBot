const Sequelize = require("sequelize");
const sequelize = require("../utils/database");

const LeagueSeasons = sequelize.define(
  "leagueSeasons",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    seasonNumber: {
      type: Sequelize.INTEGER,
      allowNull: false,
      unique: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    startsAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  },
  {
    indexes: [{ unique: true, fields: ["seasonNumber"] }],
  },
);

module.exports = LeagueSeasons;

