const LeagueSeasons = require("./leagueSeasons");
const LeagueTiers = require("./leagueTiers");
const LeagueTierPuzzles = require("./leagueTierPuzzles");
const Puzzles = require("./puzzles");

LeagueSeasons.hasMany(LeagueTiers, { foreignKey: "seasonId", as: "tiers" });
LeagueTiers.belongsTo(LeagueSeasons, { foreignKey: "seasonId", as: "season" });

LeagueTiers.belongsToMany(Puzzles, {
  through: LeagueTierPuzzles,
  foreignKey: "tierId",
  otherKey: "puzzleId",
  as: "puzzles",
});

Puzzles.belongsToMany(LeagueTiers, {
  through: LeagueTierPuzzles,
  foreignKey: "puzzleId",
  otherKey: "tierId",
  as: "leagueTiers",
});

module.exports = {
  LeagueSeasons,
  LeagueTiers,
  LeagueTierPuzzles,
};

