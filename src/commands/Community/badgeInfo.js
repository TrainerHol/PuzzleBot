const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Badges = require("../../../models/badges");
const Puzzles = require("../../../models/puzzles");
const { Op } = require("sequelize");

const PUZZLES_PER_PAGE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("badgeinfo")
    .setDescription("Get information about a badge")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("The ID or name of the badge")
        .setRequired(true),
    ),
  async execute(interaction) {
    const query = interaction.options.getString("query");

    try {
      const badge = await Badges.findOne({
        where: {
          [Op.or]: [{ id: query }, { name: { [Op.like]: `%${query}%` } }],
        },
        include: [
          {
            model: Puzzles,
            through: { attributes: [] },
            as: "puzzles",
          },
        ],
      });

      if (!badge) {
        await interaction.reply({
          content: "No badge found matching the provided query.",
          ephemeral: true,
        });
        return;
      }

      const totalPages = Math.ceil(badge.puzzles.length / PUZZLES_PER_PAGE);
      let currentPage = 1;

      const generateEmbed = (pageNumber) => {
        const startIndex = (pageNumber - 1) * PUZZLES_PER_PAGE;
        const endIndex = startIndex + PUZZLES_PER_PAGE;
        const puzzlesOnPage = badge.puzzles.slice(startIndex, endIndex);

        const puzzleList = puzzlesOnPage
          .map((puzzle) => {
            const { ID, PuzzleName, Address, World, Datacenter, Rating } =
              puzzle;
            const formattedRating = Rating.match(/^[A-Z]$/)
              ? `${Rating}★`
              : `${"★".repeat(parseInt(Rating))}`;
            return `\`${ID}\` **${PuzzleName}** (${Address} <${World}/${Datacenter}>) ${formattedRating}`;
          })
          .join("\n");

        return new EmbedBuilder()
          .setTitle(badge.name)
          .setDescription(badge.description)
          .setThumbnail(badge.imageUrl)
          .addFields(
            { name: "Title Awarded", value: badge.title },
            { name: "Name", value: badge.name },
            { name: "Required Puzzles", value: puzzleList },
            { name: "Page", value: `${pageNumber} / ${totalPages}` },
          )
          .setFooter({ text: `ID: ${badge.id}` });
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

      const message = await interaction.reply({
        embeds: [embed],
        components: [buttons],
        ephemeral: true,
        fetchReply: true,
      });

      const collector = message.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
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
        try {
          await message.edit({ components: [] });
        } catch (error) {
          if (error.code !== 10008) {
            console.error("Error editing message:", error);
          }
        }
      });
    } catch (error) {
      console.error("Error retrieving badge information:", error);
      await interaction.reply({
        content:
          "An error occurred while retrieving badge information. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
