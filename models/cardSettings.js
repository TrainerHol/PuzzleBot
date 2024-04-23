const Sequelize = require("sequelize");
const sequelize = require("../utils/database");

const CardSettings = sequelize.define("cardSettings", {
  userId: {
    type: Sequelize.STRING,
    primaryKey: true,
  },
  characterName: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  cardPhotoUrl: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  favoriteBadge: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: "badges",
      key: "id",
    },
  },
  displayBadges: {
    type: Sequelize.JSON,
    allowNull: true,
  },
});

module.exports = CardSettings;
