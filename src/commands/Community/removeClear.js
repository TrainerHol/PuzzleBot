const { SlashCommandBuilder } = require("discord.js");
const Clears = require("../../../models/clears");

module.exports = {
  data: new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("removeclear")
    .setDescription("Removes the clear for the specified puzzle IDs")
    .addStringOption((option) =>
      option
        .setName("puzzle_ids")
        .setDescription("The IDs of the puzzles to remove the clear for")
        .setRequired(true),
    ),
  async execute(interaction) {
    const puzzleIdsInput = interaction.options.getString("puzzle_ids");
    const puzzleIds = puzzleIdsInput
      .split(/[\s,]+/)
      .filter((id) => id.trim() !== "");
    const userId = interaction.user.id;

    let removedClears = 0;
    let notFoundIds = [];

    for (const puzzleId of puzzleIds) {
      const paddedPuzzleId = puzzleId.padStart(5, "0");
      const clear = await Clears.findOne({
        where: { puzzleId: paddedPuzzleId, jumper: userId },
      });

      if (clear) {
        await clear.destroy();
        removedClears++;
      } else {
        notFoundIds.push(paddedPuzzleId);
      }
    }

    let replyMessage = `Successfully removed clear for ${removedClears} puzzle(s)`;

    if (notFoundIds.length > 0) {
      const displayedNotFoundIds = notFoundIds.slice(0, 25).join(", ");
      const remainingNotFoundIds = notFoundIds.length - 25;

      replyMessage += `\nNo clear found for puzzle ID(s): ${displayedNotFoundIds}`;

      if (remainingNotFoundIds > 0) {
        replyMessage += ` and ${remainingNotFoundIds} more`;
      }
    }

    await interaction.reply({
      content: replyMessage,
      ephemeral: true,
    });
  },
};
