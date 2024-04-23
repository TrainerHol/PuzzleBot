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
        .setName("puzzleid")
        .setDescription("The ID of the puzzle cleared")
        .setRequired(true),
    ),
  async execute(interaction) {
    let puzzleId = interaction.options.getString("puzzleid");

    // Pad the puzzle ID with leading zeros to a length of 5
    puzzleId = puzzleId.padStart(5, "0");

    try {
      // Find the puzzle by ID
      const puzzle = await Puzzles.findOne({ where: { ID: puzzleId } });

      if (!puzzle) {
        await interaction.reply(`Puzzle with ID ${puzzleId} not found.`);
        return;
      }

      // Create a new clear record
      await Clears.create({
        jumper: interaction.user.id,
        puzzleId: puzzleId, // Use the padded puzzleId value
      });

      const puzzleName = puzzle.PuzzleName;

      // Create an embed response
      const embed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("Clear Recorded")
        .setDescription(`Your clear of **${puzzleName}** has been recorded.`);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error recording clear:", error);
      await interaction.reply(
        "An error occurred while recording your clear. Please try again later.",
      );
    }
  },
};
