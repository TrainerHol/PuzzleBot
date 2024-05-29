const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Badges = require("../../../models/badges");
const Puzzles = require("../../../models/puzzles");
const Clears = require("../../../models/clears");

module.exports = {
  data: new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("mybadges")
    .setDescription("List all the badges you currently have"),
  async execute(interaction) {
    const userBadges = await Badges.findAll({
      where: {
        "$puzzles.clears.jumper$": interaction.user.id,
      },
      include: [
        {
          model: Puzzles,
          as: "puzzles",
          include: [
            {
              model: Clears,
              as: "clears",
            },
          ],
        },
      ],
    });

    if (userBadges.length === 0) {
      await interaction.reply({
        content: "You don't have any badges yet.",
        ephemeral: true,
      });
      return;
    }

    const badgeList = userBadges
      .map((badge, index) => `${index + 1}. ${badge.name}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Badges`)
      .setDescription(badgeList)
      .setColor("#0099ff")
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
