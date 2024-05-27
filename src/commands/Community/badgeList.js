const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Badges = require("../../../models/badges");
const Puzzles = require("../../../models/puzzles");

const BADGES_PER_PAGE = 15;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("badgelist")
    .setDescription("Lists all the badges with their details"),
  async execute(interaction) {
    const badges = await Badges.findAll({
      include: [
        {
          model: Puzzles,
          through: { attributes: [] },
          as: "puzzles",
        },
      ],
    });

    if (badges.length === 0) {
      await interaction.reply({
        content: "No badges found.",
        ephemeral: true,
      });
      return;
    }

    const totalPages = Math.ceil(badges.length / BADGES_PER_PAGE);
    let currentPage = 1;

    const generateEmbed = (pageNumber) => {
      const startIndex = (pageNumber - 1) * BADGES_PER_PAGE;
      const endIndex = startIndex + BADGES_PER_PAGE;
      const badgesOnPage = badges.slice(startIndex, endIndex);

      const badgeList = badgesOnPage
        .map((badge) => {
          const puzzleIds = badge.puzzles.map((puzzle) => puzzle.ID).join(", ");
          return `#${badge.id} ${badge.name} << ${badge.title} >>\n**Description:** ${badge.description}\n**Required Puzzle IDs:** ${puzzleIds}\n`;
        })
        .join("\n");

      return new EmbedBuilder()
        .setTitle("Badge List")
        .setDescription(badgeList)
        .setFooter({ text: `Page ${pageNumber} of ${totalPages}` });
    };

    const generateButtons = (pageNumber) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("previous")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageNumber === 1),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageNumber === totalPages),
      );
    };

    const embed = generateEmbed(currentPage);
    const buttons = generateButtons(currentPage);

    await interaction.reply({
      embeds: [embed],
      components: [buttons],
      ephemeral: true,
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "previous") {
        currentPage--;
      } else if (i.customId === "next") {
        currentPage++;
      }

      const newEmbed = generateEmbed(currentPage);
      const newButtons = generateButtons(currentPage);

      await i.update({ embeds: [newEmbed], components: [newButtons] });
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] });
    });
  },
};
