const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const Clears = require("../../../models/clears");
const Puzzles = require("../../../models/puzzles");

module.exports = {
  data: new SlashCommandBuilder()
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
    const puzzleIdsInput = interaction.options.getString("puzzleids");
    // Split the input into an array of IDs, trimming spaces and removing empty entries
    const puzzleIds = puzzleIdsInput
      .split(/[\s,]+/)
      .filter((id) => id.trim() !== "");

    let replyMessages = [];

    for (let puzzleId of puzzleIds) {
      // Pad the puzzle ID with leading zeros to a length of 5
      puzzleId = puzzleId.padStart(5, "0");

      try {
        // Find the puzzle by ID
        const puzzle = await Puzzles.findOne({ where: { ID: puzzleId } });

        if (!puzzle) {
          replyMessages.push(`❌Puzzle with ID ${puzzleId} not found.`);
          continue;
        }

        // Create a new clear record
        await Clears.create({
          jumper: interaction.user.id,
          puzzleId: puzzleId, // Use the padded puzzleId value
        });

        const puzzleName = puzzle.PuzzleName;
        replyMessages.push(
          `✅Your clear of **${puzzleName}** has been recorded.`,
        );
      } catch (error) {
        console.error(
          "❌Error recording clear for puzzle ID " + puzzleId + ":",
          error,
        );
        replyMessages.push(
          "❌An error occurred while recording your clear for puzzle ID " +
            puzzleId +
            ". Please try again later.",
        );
      }
    }

    // Combine all messages into a single reply
    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("Clear(s) Recorded")
      .setDescription(replyMessages.join("\n"));

    await interaction.reply({ embeds: [embed] });
  },
};
