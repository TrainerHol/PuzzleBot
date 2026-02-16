const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Op } = require("sequelize");
const Clears = require("../../../models/clears");
const {
  LeagueSeasons,
  LeagueTiers,
  LeagueTierPuzzles,
} = require("../../../models/league");

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

function formatMissingIds(ids) {
  if (ids.length === 0) return "All done.";
  const shown = ids.slice(0, 80).map((id) => `\`${id}\``).join(", ");
  const remaining = ids.length - Math.min(ids.length, 80);
  const suffix = remaining > 0 ? `, and ${remaining} more` : "";
  return trim(`Missing (${ids.length}): ${shown}${suffix}`, 1024);
}

function toPercent(done, total) {
  if (total <= 0) return 0;
  return Math.floor((done / total) * 100);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("myseason")
    .setDescription("Show your progress for a league season")
    .addIntegerOption((option) =>
      option
        .setName("season")
        .setDescription("Season number (e.g. 1)")
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Optional user to view")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const seasonNumber = interaction.options.getInteger("season");
    const user = interaction.options.getUser("user") || interaction.user;

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
        content: `Season **${seasonNumber}** has no tiers yet.`,
      });
      return;
    }

    const tierIds = tiers.map((t) => t.id);
    const tierPuzzles = await LeagueTierPuzzles.findAll({
      where: { tierId: { [Op.in]: tierIds } },
      attributes: ["tierId", "puzzleId"],
      order: [["puzzleId", "ASC"]],
    });

    const puzzleIdsByTierId = new Map();
    for (const tier of tiers) puzzleIdsByTierId.set(tier.id, []);
    for (const row of tierPuzzles) {
      const list = puzzleIdsByTierId.get(row.tierId);
      if (!list) continue;
      list.push(row.puzzleId);
    }

    const allPuzzleIdsSet = new Set();
    for (const list of puzzleIdsByTierId.values()) {
      for (const id of list) allPuzzleIdsSet.add(id);
    }
    const allPuzzleIds = Array.from(allPuzzleIdsSet);

    const effectiveByPuzzleId = new Map();
    for (const idChunk of chunkArray(allPuzzleIds, 900)) {
      const clears = await Clears.findAll({
        where: { jumper: user.id, puzzleId: { [Op.in]: idChunk } },
        attributes: ["puzzleId", "createdAt", "lastClearedAt"],
      });

      for (const clear of clears) {
        const effective = clear.lastClearedAt ?? clear.createdAt;
        if (!effective) continue;
        effectiveByPuzzleId.set(clear.puzzleId, effective);
      }
    }

    const startsAt = season.startsAt;
    const countedPuzzleIds = new Set();
    for (const [puzzleId, effective] of effectiveByPuzzleId.entries()) {
      if (effective >= startsAt) countedPuzzleIds.add(puzzleId);
    }

    const embeds = [];
    let currentEmbed = new EmbedBuilder()
      .setTitle(`Season ${seasonNumber} Progress — ${user.username}`)
      .setDescription(`Starts: ${season.startsAt.toISOString()}`);

    for (const tier of tiers) {
      const puzzleIds = puzzleIdsByTierId.get(tier.id) ?? [];
      const total = puzzleIds.length;
      const done = puzzleIds.filter((id) => countedPuzzleIds.has(id)).length;
      const percent = toPercent(done, total);
      const missing = puzzleIds.filter((id) => !countedPuzzleIds.has(id));

      const fieldName = `${tier.name} — ${percent}% (${done}/${total})`;
      const fieldValue = total === 0 ? "No puzzles in tier." : formatMissingIds(missing);

      if (currentEmbed.data.fields && currentEmbed.data.fields.length >= 25) {
        embeds.push(currentEmbed);
        currentEmbed = new EmbedBuilder()
          .setTitle(`Season ${seasonNumber} Progress — ${user.username}`)
          .setDescription(`Starts: ${season.startsAt.toISOString()}`);
      }

      currentEmbed.addFields({ name: trim(fieldName, 256), value: fieldValue });
    }

    embeds.push(currentEmbed);
    await interaction.editReply({ embeds });
  },
};

