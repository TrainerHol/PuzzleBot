const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const Clears = require("../../../models/clears");
const Puzzles = require("../../../models/puzzles");

function normalizePuzzleIds(input) {
  const rawIds = input
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

function formatPuzzleName(puzzleName) {
  if (!puzzleName) return "";
  return trim(String(puzzleName), 80);
}

function classifyColor({ recordedCount, alreadyClearedCount, notFoundCount, otherErrorCount }) {
  if (otherErrorCount > 0) return 0xff3b30;
  if (notFoundCount > 0 || alreadyClearedCount > 0) return 0xffcc00;
  if (recordedCount > 0) return 0x34c759;
  return 0x8e8e93;
}

function buildCategoryLine(label, ids) {
  if (ids.length === 0) return null;

  const shown = ids.slice(0, 25).map((id) => `\`${id}\``).join(", ");
  const remaining = ids.length - Math.min(ids.length, 25);
  const suffix = remaining > 0 ? `, and ${remaining} more` : "";

  return `${label} (${ids.length}): ${shown}${suffix}`;
}

function buildCountsLine({ total, recordedCount, alreadyClearedCount, notFoundCount, otherErrorCount }) {
  const parts = [
    `${recordedCount} recorded`,
    `${alreadyClearedCount} already cleared`,
    `${notFoundCount} not found`,
  ];
  if (otherErrorCount > 0) parts.push(`${otherErrorCount} error(s)`);
  return `Processed ${total} puzzle ID(s): ${parts.join(", ")}.`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("clear")
    .setDescription("Record a clear for a puzzle")
    .addStringOption((option) =>
      option
        .setName("puzzleids")
        .setDescription(
          "The ID(s) of the puzzle(s) cleared, separated by spaces or commas",
        )
        .setRequired(true),
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply();
    } catch (error) {
      console.error("Error deferring interaction:", error);
      return;
    }

    const puzzleIdsInput = interaction.options.getString("puzzleids");
    const puzzleIds = normalizePuzzleIds(puzzleIdsInput);
    const userId = interaction.user.id;

    const notFoundIds = [];
    const alreadyClearedIds = [];
    const recordedIds = [];
    const otherErrorIds = [];

    const puzzleById = new Map();
    for (const idChunk of chunkArray(puzzleIds, 900)) {
      const puzzles = await Puzzles.findAll({
        where: { ID: idChunk },
        attributes: ["ID", "PuzzleName"],
      });
      for (const puzzle of puzzles) {
        puzzleById.set(puzzle.ID, puzzle);
      }
    }

    const foundIdsInOrder = [];
    for (const id of puzzleIds) {
      if (puzzleById.has(id)) {
        foundIdsInOrder.push(id);
      } else {
        notFoundIds.push(id);
      }
    }

    const existingClearSet = new Set();
    for (const foundChunk of chunkArray(foundIdsInOrder, 900)) {
      const clears = await Clears.findAll({
        where: { jumper: userId, puzzleId: foundChunk },
        attributes: ["puzzleId"],
      });
      for (const clear of clears) {
        existingClearSet.add(clear.puzzleId);
      }
    }

    const toCreateIds = [];
    for (const id of foundIdsInOrder) {
      if (existingClearSet.has(id)) {
        alreadyClearedIds.push(id);
      } else {
        toCreateIds.push(id);
      }
    }

    const createRows = toCreateIds.map((id) => ({ jumper: userId, puzzleId: id }));

    const isUniqueConstraintError = (error) => {
      if (!error || typeof error !== "object") return false;
      if (error.name === "SequelizeUniqueConstraintError") return true;
      if (error.original && error.original.code === "SQLITE_CONSTRAINT") return true;
      return false;
    };

    try {
      for (const rowsChunk of chunkArray(createRows, 500)) {
        if (rowsChunk.length === 0) continue;
        await Clears.bulkCreate(rowsChunk, { ignoreDuplicates: true });
      }
      for (const id of toCreateIds) recordedIds.push(id);
    } catch (error) {
      console.error("Error recording clears in bulk:", error);

      for (const id of toCreateIds) {
        try {
          await Clears.create({ jumper: userId, puzzleId: id });
          recordedIds.push(id);
        } catch (innerError) {
          if (isUniqueConstraintError(innerError)) {
            alreadyClearedIds.push(id);
            continue;
          }
          otherErrorIds.push(id);
        }
      }
    }

    const detailedMode = puzzleIds.length <= 10;
    const MAX_DESCRIPTION_CHARS = 3900;
    const descriptionLines = [];
    const appendLine = (line) => {
      const nextLen =
        descriptionLines.join("\n").length +
        (descriptionLines.length === 0 ? 0 : 1) +
        line.length;
      if (nextLen > MAX_DESCRIPTION_CHARS) return false;
      descriptionLines.push(line);
      return true;
    };

    const recordedSet = new Set(recordedIds);
    const alreadySet = new Set(alreadyClearedIds);
    const notFoundSet = new Set(notFoundIds);
    const otherErrorSet = new Set(otherErrorIds);

    if (detailedMode) {
      for (const id of puzzleIds) {
        if (recordedSet.has(id)) {
          const puzzleName = formatPuzzleName(puzzleById.get(id)?.PuzzleName);
          const namePart = puzzleName ? ` **${puzzleName}**` : "";
          if (!appendLine(`✅ \`${id}\`${namePart} recorded.`)) break;
          continue;
        }
        if (alreadySet.has(id)) {
          const puzzleName = formatPuzzleName(puzzleById.get(id)?.PuzzleName);
          const namePart = puzzleName ? ` **${puzzleName}**` : "";
          if (!appendLine(`ℹ️ \`${id}\`${namePart} already cleared.`)) break;
          continue;
        }
        if (notFoundSet.has(id)) {
          if (!appendLine(`❌ \`${id}\` puzzle not found.`)) break;
          continue;
        }
        if (otherErrorSet.has(id)) {
          if (!appendLine(`❌ \`${id}\` error recording clear.`)) break;
        }
      }
    } else {
      const categoryLines = [
        buildCategoryLine("Recorded", recordedIds),
        buildCategoryLine("Already cleared", alreadyClearedIds),
        buildCategoryLine("Not found", notFoundIds),
        buildCategoryLine("Other errors", otherErrorIds),
      ].filter((line) => line !== null);

      for (const line of categoryLines) {
        const safeLine = trim(line, 500);
        if (!appendLine(safeLine)) break;
      }
    }

    if (descriptionLines.length > 0) appendLine("");

    appendLine(
      buildCountsLine({
        total: puzzleIds.length,
        recordedCount: recordedIds.length,
        alreadyClearedCount: alreadyClearedIds.length,
        notFoundCount: notFoundIds.length,
        otherErrorCount: otherErrorIds.length,
      }),
    );

    const embed = new EmbedBuilder()
      .setColor(
        classifyColor({
          recordedCount: recordedIds.length,
          alreadyClearedCount: alreadyClearedIds.length,
          notFoundCount: notFoundIds.length,
          otherErrorCount: otherErrorIds.length,
        }),
      )
      .setTitle("Clear(s) Processed")
      .setDescription(trim(descriptionLines.join("\n"), 4096));

    try {
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error replying to interaction:", error);
    }
  },
};
