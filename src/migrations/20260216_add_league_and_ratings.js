const path = require("path");
const Sequelize = require("sequelize");

process.chdir(path.resolve(__dirname, "../.."));

const sequelize = require("../../utils/database");
const Clears = require("../../models/clears");
const PuzzleRatings = require("../../models/puzzleRatings");
const LeagueSeasons = require("../../models/leagueSeasons");
const LeagueTiers = require("../../models/leagueTiers");
const LeagueTierPuzzles = require("../../models/leagueTierPuzzles");

const MIGRATION_NAME = "20260216_add_league_and_ratings";

function normalizeTableName(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    if (typeof value.tableName === "string") return value.tableName;
    if (typeof value.name === "string") return value.name;
  }
  return String(value);
}

async function ensureSchemaMigrationsTable(queryInterface, existingTables) {
  if (existingTables.has("schema_migrations")) return;

  await queryInterface.createTable("schema_migrations", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    appliedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  existingTables.add("schema_migrations");
}

async function isMigrationApplied() {
  const [rows] = await sequelize.query(
    "SELECT name FROM schema_migrations WHERE name = ? LIMIT 1",
    { replacements: [MIGRATION_NAME] },
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function recordMigration(queryInterface) {
  await queryInterface.bulkInsert("schema_migrations", [
    { name: MIGRATION_NAME, appliedAt: new Date() },
  ]);
}

async function main() {
  await sequelize.authenticate();

  const queryInterface = sequelize.getQueryInterface();
  const rawTables = await queryInterface.showAllTables();
  const existingTables = new Set(
    rawTables.map(normalizeTableName).map((t) => t.toLowerCase()),
  );

  await ensureSchemaMigrationsTable(queryInterface, existingTables);

  if (await isMigrationApplied()) return;

  if (!existingTables.has("puzzles")) {
    throw new Error("Missing required table: puzzles");
  }
  if (!existingTables.has("clears")) {
    throw new Error("Missing required table: clears");
  }

  const clearsDesc = await queryInterface.describeTable("clears");
  if (!Object.prototype.hasOwnProperty.call(clearsDesc, "lastClearedAt")) {
    await queryInterface.addColumn("clears", "lastClearedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }

  await Clears.update(
    { lastClearedAt: Sequelize.col("createdAt") },
    { where: { lastClearedAt: null } },
  );

  await LeagueSeasons.sync();
  await LeagueTiers.sync();
  await LeagueTierPuzzles.sync();
  await PuzzleRatings.sync();

  await recordMigration(queryInterface);
}

main()
  .then(async () => {
    await sequelize.close();
  })
  .catch(async (err) => {
    process.exitCode = 1;
    try {
      await sequelize.close();
    } catch {}
    throw err;
  });

