const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const Badges = require("../../../models/badges");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deletebadge")
    .setDescription("Delete a badge")
    .addIntegerOption((option) =>
      option
        .setName("badgeid")
        .setDescription("The ID of the badge to delete")
        .setRequired(true),
    ),
  async execute(interaction) {
    const badgeId = interaction.options.getInteger("badgeid");

    try {
      const badge = await Badges.findByPk(badgeId);

      if (!badge) {
        await interaction.reply("The specified badge does not exist.");
        return;
      }

      await badge.destroy();

      const embed = new EmbedBuilder()
        .setTitle("Badge Deleted")
        .setDescription(`The badge **${badge.title}** has been deleted.`);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error deleting badge:", error);
      await interaction.reply(
        "An error occurred while deleting the badge. Please try again later.",
      );
    }
  },
};
