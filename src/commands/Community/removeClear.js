const { SlashCommandBuilder } = require("discord.js");
const Clears = require("../../../models/clears");

module.exports = {
  data: new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("removeclear")
    .setDescription("Removes the clear for the specified puzzle ID by the user")
    .addStringOption((option) =>
      option
        .setName("puzzle_id")
        .setDescription("The ID of the puzzle to remove the clear for")
        .setRequired(true),
    ),
  async execute(interaction) {
    const puzzleId = interaction.options
      .getString("puzzle_id")
      .padStart(5, "0");
    const userId = interaction.user.id;

    const clear = await Clears.findOne({
      where: { puzzleId, jumper: userId },
    });

    if (!clear) {
      await interaction.reply({
        content: `No clear found for puzzle ID ${puzzleId} by ${interaction.user.toString()}.`,
        ephemeral: true,
      });
      return;
    }

    await clear.destroy();

    await interaction.reply({
      content: `Successfully removed clear for puzzle ID ${puzzleId} by ${interaction.user.toString()}.`,
      ephemeral: true,
    });
  },
};
