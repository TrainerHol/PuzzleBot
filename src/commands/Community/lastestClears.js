const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Puzzles = require("../../../models/puzzles");
const Clears = require("../../../models/clears");
const { Op } = require("sequelize");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("latestclears")
    .setDescription("Shows the most recent 10 clears of a puzzle")
    .addStringOption((option) =>
      option
        .setName("puzzle_id")
        .setDescription("The ID of the puzzle")
        .setRequired(true),
    ),
  async execute(interaction) {
    const puzzleId = interaction.options.getString("puzzle_id");

    const puzzle = await Puzzles.findOne({
      where: { ID: puzzleId },
    });

    if (!puzzle) {
      await interaction.reply({
        content: "Puzzle not found.",
        ephemeral: true,
      });
      return;
    }

    const clears = await Clears.findAll({
      where: { puzzleId },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    const clearsList = await Promise.all(
      clears.map(async (clear) => {
        const user = await interaction.client.users.fetch(clear.jumper);
        const time = clear.createdAt.toLocaleString();
        return `• ${user} ${time}`;
      }),
    );

    const embed = new EmbedBuilder()
      .setTitle(`Latest Clears for ${puzzle.PuzzleName} by ${puzzle.Builder}:`)
      .setDescription(clearsList.join("\n"))
      .setColor("#0099ff")
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
