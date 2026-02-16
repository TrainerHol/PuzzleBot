const { SlashCommandBuilder } = require("discord.js");
const Puzzles = require("../../../models/puzzles");
const PuzzleRatings = require("../../../models/puzzleRatings");
const {
  getPlayerRatingByPuzzleId,
  formatPlayerRating,
} = require("../../lib/playerRatings");

function isMissingTableError(error) {
  if (!error || typeof error !== "object") return false;
  const message = typeof error.message === "string" ? error.message : "";
  if (message.includes("no such table: puzzleRatings")) return true;
  if (message.includes("SQLITE_ERROR") && message.includes("puzzleRatings")) return true;
  if (error.original && typeof error.original.message === "string") {
    const inner = error.original.message;
    if (inner.includes("no such table: puzzleRatings")) return true;
  }
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("rate")
    .setDescription("Rate a puzzle's difficulty (player rating)")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("The puzzle ID")
        .setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName("rating")
        .setDescription("Difficulty rating (1-5, decimals allowed)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5),
    ),
  async execute(interaction) {
    const puzzleIdRaw = interaction.options.getString("id");
    const rating = interaction.options.getNumber("rating");

    if (!puzzleIdRaw || !/^\d{1,5}$/.test(puzzleIdRaw)) {
      await interaction.reply({
        content: "Please provide a valid puzzle ID (1 to 5 digits).",
        ephemeral: true,
      });
      return;
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      await interaction.reply({
        content: "Please provide a valid rating between 1 and 5.",
        ephemeral: true,
      });
      return;
    }

    const puzzleId = puzzleIdRaw.padStart(5, "0");
    const userId = interaction.user.id;

    const puzzle = await Puzzles.findOne({
      where: { ID: puzzleId },
      attributes: ["ID", "PuzzleName", "Builder"],
    });

    if (!puzzle) {
      await interaction.reply({ content: "Puzzle not found.", ephemeral: true });
      return;
    }

    try {
      const existing = await PuzzleRatings.findOne({
        where: { userId, puzzleId },
        attributes: ["id"],
      });

      if (existing) {
        await PuzzleRatings.update({ rating }, { where: { userId, puzzleId } });
      } else {
        await PuzzleRatings.create({ userId, puzzleId, rating });
      }
    } catch (error) {
      if (isMissingTableError(error)) {
        await interaction.reply({
          content:
            "Player ratings are not initialized yet. Run `node src/syncdb.js` once to create the table, then try again.",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content:
          "An error occurred while saving your rating. Please try again later.",
        ephemeral: true,
      });
      return;
    }

    let playerRatingText = "PR —";
    try {
      const ratingsById = await getPlayerRatingByPuzzleId([puzzleId]);
      const summary = ratingsById.get(puzzleId);
      playerRatingText = formatPlayerRating(summary) ?? playerRatingText;
    } catch {
      playerRatingText = "PR —";
    }

    const name = puzzle.PuzzleName ? ` **${puzzle.PuzzleName}**` : "";
    const builder = puzzle.Builder ? ` by ${puzzle.Builder}` : "";
    const ratingText = `${Math.round(rating * 10) / 10}`;

    await interaction.reply({
      content: `Saved your rating for \`${puzzleId}\`${name}${builder}: **${ratingText}/5**. ${playerRatingText}.`,
      ephemeral: true,
    });
  },
};

