const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Badges = require("../../../models/badges");
const Puzzles = require("../../../models/puzzles");
const Clears = require("../../../models/clears");
const { Op } = require("sequelize");

module.exports = {
  data: new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("mybadges")
    .setDescription("List all the badges you currently have"),
  async execute(interaction) {
    const userClears = await Clears.findAll({
      where: {
        jumper: interaction.user.id,
      },
      attributes: ["puzzleId"],
    });

    const userClearedPuzzleIds = userClears.map((clear) => clear.puzzleId);

    const userBadges = await Badges.findAll({
      include: [
        {
          model: Puzzles,
          as: "puzzles",
          attributes: ["ID"],
          through: { attributes: [] },
        },
      ],
    });

    const earnedBadges = userBadges.filter((badge) => {
      const requiredPuzzleIds = badge.puzzles.map((puzzle) => puzzle.ID);
      return requiredPuzzleIds.every((puzzleId) =>
        userClearedPuzzleIds.includes(puzzleId),
      );
    });

    if (earnedBadges.length === 0) {
      await interaction.reply({
        content: "You don't have any badges yet.",
        ephemeral: true,
      });
      return;
    }

    const itemsPerPage = 25;
    const totalPages = Math.ceil(earnedBadges.length / itemsPerPage);
    let currentPage = 1;

    const generateEmbed = () => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const currentBadges = earnedBadges.slice(startIndex, endIndex);

      const badgeList = currentBadges
        .map((badge, index) => `${startIndex + index + 1}. ${badge.name}`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Badges`)
        .setDescription(badgeList)
        .setColor("#0099ff")
        .setTimestamp()
        .setFooter({ text: `Page ${currentPage} of ${totalPages}` });

      return embed;
    };

    const generateButtons = () => {
      const buttons = new ActionRowBuilder();

      if (totalPages > 1) {
        if (currentPage > 1) {
          buttons.addComponents(
            new ButtonBuilder()
              .setCustomId("prev")
              .setLabel("Previous")
              .setStyle(ButtonStyle.Primary),
          );
        }

        if (currentPage < totalPages) {
          buttons.addComponents(
            new ButtonBuilder()
              .setCustomId("next")
              .setLabel("Next")
              .setStyle(ButtonStyle.Primary),
          );
        }
      }

      return buttons;
    };

    const initialEmbed = generateEmbed();
    const initialButtons = generateButtons();

    const messageOptions = {
      embeds: [initialEmbed],
    };

    if (initialButtons.components.length > 0) {
      messageOptions.components = [initialButtons];
    }

    const message = await interaction.reply({
      ...messageOptions,
      fetchReply: true,
    });

    if (totalPages <= 1) {
      return;
    }

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 180000, // 3 minutes
    });

    collector.on("collect", async (i) => {
      if (i.customId === "prev") {
        currentPage--;
      } else if (i.customId === "next") {
        currentPage++;
      }

      const newEmbed = generateEmbed();
      const newButtons = generateButtons();

      await i.update({ embeds: [newEmbed], components: [newButtons] });
    });

    collector.on("end", async () => {
      const disabledButtons = new ActionRowBuilder();
      initialButtons.components.forEach((button) => {
        button.setDisabled(true);
        disabledButtons.addComponents(button);
      });

      await message.edit({ components: [disabledButtons] });
    });
  },
};
