const Sequelize = require("sequelize");
const sequelize = require("../utils/database");
const Badges = require("./badges");
const Puzzles = require("./puzzles");

const BadgePuzzles = sequelize.define("badgePuzzles", {
  badgeId: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: Badges,
      key: "id",
    },
  },
  puzzleId: {
    type: Sequelize.STRING,
    allowNull: false,
    references: {
      model: Puzzles,
      key: "ID",
    },
  },
});

Badges.belongsToMany(Puzzles, { through: BadgePuzzles, foreignKey: "badgeId" });
Puzzles.belongsToMany(Badges, {
  through: BadgePuzzles,
  foreignKey: "puzzleId",
});

module.exports = BadgePuzzles;
