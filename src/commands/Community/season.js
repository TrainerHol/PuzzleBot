const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const Puzzles = require("../../../models/puzzles");
const {
  LeagueSeasons,
  LeagueTiers,
  LeagueTierPuzzles,
} = require("../../../models/league");

function normalizePuzzleIds(input) {
  const rawIds = String(input)
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter((id) => id !== "");

  const uniqueIds = [];
  const seen = new Set();
  for (const rawId of rawIds) {
    const id = rawId.padStart(5, "0");
    if (seen.has(id)) continue;
    seen.add(id);
    uniqueIds.push(id);
  }

  return uniqueIds;
}

function chunkArray(items, chunkSize) {
  if (chunkSize <= 0) return [items];
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function trim(str, max) {
  if (str.length <= max) return str;
  return `${str.slice(0, Math.max(0, max - 3))}...`;
}

function isUniqueConstraintError(error) {
  if (!error || typeof error !== "object") return false;
  if (error.name === "SequelizeUniqueConstraintError") return true;
  if (error.original && error.original.code === "SQLITE_CONSTRAINT") return true;
  return false;
}

function parseOptionalDate(input) {
  if (!input) return null;
  const date = new Date(String(input));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
    .setName("season")
    .setDescription("Manage jump puzzle league seasons")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a league season")
        .addIntegerOption((option) =>
          option
            .setName("season")
            .setDescription("Season number (e.g. 1)")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("name").setDescription("Optional season name"),
        )
        .addStringOption((option) =>
          option
            .setName("startsat")
            .setDescription("Optional start date/time (ISO string)"),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("rename")
        .setDescription("Rename a season")
        .addIntegerOption((option) =>
          option
            .setName("season")
            .setDescription("Season number")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("New season name")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("addtier")
        .setDescription("Add a tier to a season")
        .addIntegerOption((option) =>
          option
            .setName("season")
            .setDescription("Season number")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("tier")
            .setDescription('Tier name (e.g. "NA 1-Star")')
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option.setName("order").setDescription("Optional sort order"),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("setpuzzles")
        .setDescription("Set or append the puzzle list for a tier")
        .addIntegerOption((option) =>
          option
            .setName("season")
            .setDescription("Season number")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("tier")
            .setDescription('Tier name (e.g. "NA 1-Star")')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("mode")
            .setDescription("Replace or append puzzles")
            .setRequired(true)
            .addChoices(
              { name: "replace", value: "replace" },
              { name: "append", value: "append" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("puzzleids")
            .setDescription("Puzzle IDs, separated by spaces or commas")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List seasons or tiers in a season")
        .addIntegerOption((option) =>
          option.setName("season").setDescription("Season number (optional)"),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      const seasonNumber = interaction.options.getInteger("season");
      const name = interaction.options.getString("name");
      const startsAtRaw = interaction.options.getString("startsat");
      const startsAt = parseOptionalDate(startsAtRaw) ?? new Date();

      if (startsAtRaw && parseOptionalDate(startsAtRaw) === null) {
        await interaction.editReply({
          content: "Invalid `startsat`. Provide an ISO date string (e.g. 2026-02-15T00:00:00Z).",
        });
        return;
      }

      try {
        const season = await LeagueSeasons.create({
          seasonNumber,
          name: name || null,
          startsAt,
        });

        const embed = new EmbedBuilder()
          .setTitle("Season Created")
          .setDescription(
            `Created season **${season.seasonNumber}**${season.name ? ` — **${season.name}**` : ""}.`,
          )
          .addFields({ name: "Starts At", value: `${season.startsAt.toISOString()}` });

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          await interaction.editReply({
            content: `Season **${seasonNumber}** already exists.`,
          });
          return;
        }
        await interaction.editReply({
          content: "An error occurred while creating the season.",
        });
      }
      return;
    }

    if (subcommand === "rename") {
      const seasonNumber = interaction.options.getInteger("season");
      const newName = interaction.options.getString("name");

      const season = await LeagueSeasons.findOne({ where: { seasonNumber } });
      if (!season) {
        await interaction.editReply({ content: `Season **${seasonNumber}** was not found.` });
        return;
      }

      const oldName = season.name;
      await season.update({ name: newName });

      const embed = new EmbedBuilder()
        .setTitle("Season Renamed")
        .setDescription(`Season **${seasonNumber}** name updated.`)
        .addFields(
          { name: "Old Name", value: oldName ? oldName : "(none)", inline: true },
          { name: "New Name", value: newName, inline: true },
        );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "addtier") {
      const seasonNumber = interaction.options.getInteger("season");
      const tierName = interaction.options.getString("tier");
      const sortOrder = interaction.options.getInteger("order");

      const season = await LeagueSeasons.findOne({ where: { seasonNumber } });
      if (!season) {
        await interaction.editReply({ content: `Season **${seasonNumber}** was not found.` });
        return;
      }

      try {
        const tier = await LeagueTiers.create({
          seasonId: season.id,
          name: tierName,
          sortOrder: sortOrder ?? null,
        });

        const embed = new EmbedBuilder()
          .setTitle("Tier Added")
          .setDescription(`Added tier **${tier.name}** to season **${seasonNumber}**.`);

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          await interaction.editReply({
            content: `Tier **${tierName}** already exists in season **${seasonNumber}**.`,
          });
          return;
        }
        await interaction.editReply({
          content: "An error occurred while adding the tier.",
        });
      }
      return;
    }

    if (subcommand === "setpuzzles") {
      const seasonNumber = interaction.options.getInteger("season");
      const tierName = interaction.options.getString("tier");
      const mode = interaction.options.getString("mode");
      const puzzleIdsRaw = interaction.options.getString("puzzleids");
      const puzzleIds = normalizePuzzleIds(puzzleIdsRaw);

      if (puzzleIds.length === 0) {
        await interaction.editReply({ content: "No valid puzzle IDs provided." });
        return;
      }

      const season = await LeagueSeasons.findOne({ where: { seasonNumber } });
      if (!season) {
        await interaction.editReply({ content: `Season **${seasonNumber}** was not found.` });
        return;
      }

      const tier = await LeagueTiers.findOne({
        where: { seasonId: season.id, name: tierName },
      });
      if (!tier) {
        await interaction.editReply({
          content: `Tier **${tierName}** was not found in season **${seasonNumber}**.`,
        });
        return;
      }

      const existingIdSet = new Set();
      for (const idChunk of chunkArray(puzzleIds, 900)) {
        const puzzles = await Puzzles.findAll({
          where: { ID: { [Op.in]: idChunk } },
          attributes: ["ID"],
        });
        for (const puzzle of puzzles) existingIdSet.add(puzzle.ID);
      }

      const notFound = puzzleIds.filter((id) => !existingIdSet.has(id));
      if (notFound.length > 0) {
        await interaction.editReply({
          content: `Puzzle ID(s) not found: ${notFound.slice(0, 50).map((id) => `\`${id}\``).join(", ")}${
            notFound.length > 50 ? `, and ${notFound.length - 50} more` : ""
          }`,
        });
        return;
      }

      if (mode === "replace") {
        await LeagueTierPuzzles.destroy({ where: { tierId: tier.id } });
      }

      const rows = puzzleIds.map((puzzleId) => ({ tierId: tier.id, puzzleId }));
      const totalBefore = await LeagueTierPuzzles.count({ where: { tierId: tier.id } });

      try {
        for (const rowsChunk of chunkArray(rows, 500)) {
          if (rowsChunk.length === 0) continue;
          await LeagueTierPuzzles.bulkCreate(rowsChunk, {
            ignoreDuplicates: true,
          });
        }
      } catch (error) {
        if (mode === "replace") {
          await interaction.editReply({
            content: "An error occurred while replacing the tier puzzle list.",
          });
        } else {
          await interaction.editReply({
            content: "An error occurred while appending to the tier puzzle list.",
          });
        }
        return;
      }

      const totalNow = await LeagueTierPuzzles.count({ where: { tierId: tier.id } });
      const inserted = mode === "replace" ? totalNow : Math.max(0, totalNow - totalBefore);
      const embed = new EmbedBuilder()
        .setTitle("Tier Puzzles Updated")
        .setDescription(
          `Season **${seasonNumber}** → **${tier.name}** updated (**${mode}**).`,
        )
        .addFields(
          { name: "Provided", value: `${puzzleIds.length}`, inline: true },
          { name: "Inserted", value: `${inserted}`, inline: true },
          { name: "Total in tier", value: `${totalNow}`, inline: true },
        );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "list") {
      const seasonNumber = interaction.options.getInteger("season");

      if (seasonNumber === null) {
        const seasons = await LeagueSeasons.findAll({
          order: [["seasonNumber", "ASC"]],
        });

        if (seasons.length === 0) {
          await interaction.editReply({ content: "No seasons found." });
          return;
        }

        const lines = [];
        for (const season of seasons) {
          const tierCount = await LeagueTiers.count({ where: { seasonId: season.id } });
          lines.push(
            `Season **${season.seasonNumber}**${season.name ? ` — **${season.name}**` : ""} (tiers: ${tierCount}, starts: ${season.startsAt.toISOString()})`,
          );
        }

        const embed = new EmbedBuilder()
          .setTitle("Seasons")
          .setDescription(trim(lines.join("\n"), 4096));
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const season = await LeagueSeasons.findOne({ where: { seasonNumber } });
      if (!season) {
        await interaction.editReply({ content: `Season **${seasonNumber}** was not found.` });
        return;
      }

      const tiers = await LeagueTiers.findAll({
        where: { seasonId: season.id },
        order: [
          ["sortOrder", "ASC"],
          ["name", "ASC"],
        ],
      });

      if (tiers.length === 0) {
        await interaction.editReply({
          content: `Season **${seasonNumber}** has no tiers.`,
        });
        return;
      }

      const tierIds = tiers.map((t) => t.id);
      const counts = await LeagueTierPuzzles.findAll({
        attributes: [
          "tierId",
          [Sequelize.fn("COUNT", Sequelize.col("puzzleId")), "puzzleCount"],
        ],
        where: { tierId: { [Op.in]: tierIds } },
        group: ["tierId"],
      });

      const countByTierId = new Map();
      for (const row of counts) {
        const tierId = row.tierId;
        const valueRaw = row.get("puzzleCount");
        const value = typeof valueRaw === "number" ? valueRaw : Number(valueRaw);
        countByTierId.set(tierId, Number.isNaN(value) ? 0 : value);
      }

      const lines = tiers.map((tier) => {
        const count = countByTierId.get(tier.id) ?? 0;
        const order = tier.sortOrder === null ? "-" : String(tier.sortOrder);
        return `**${tier.name}** (order: ${order}) — puzzles: ${count}`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`Season ${seasonNumber} Tiers`)
        .setDescription(trim(lines.join("\n"), 4096))
        .addFields({ name: "Starts At", value: `${season.startsAt.toISOString()}` });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    await interaction.editReply({ content: "Unknown subcommand." });
  },
};

