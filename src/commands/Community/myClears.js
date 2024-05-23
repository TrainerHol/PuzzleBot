const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Clears = require("../../../models/clears");
const Puzzles = require("../../../models/puzzles");

const CLEARS_PER_PAGE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("myclears")
    .setDescription("Lists all clears by the user (default) or specified user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to list clears for")
        .setRequired(false),
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;

    const clears = await Clears.findAll({
      where: { jumper: user.id },
      include: [
        { model: Puzzles, attributes: ["ID", "PuzzleName", "Builder"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (clears.length === 0) {
      await interaction.reply({
        content: `No clears found for ${user.toString()}.`,
        ephemeral: true,
      });
      return;
    }

    const totalPages = Math.ceil(clears.length / CLEARS_PER_PAGE);
    let currentPage = 1;

    const generateEmbed = (pageNumber) => {
      const startIndex = (pageNumber - 1) * CLEARS_PER_PAGE;
      const endIndex = startIndex + CLEARS_PER_PAGE;
      const clearsOnPage = clears.slice(startIndex, endIndex);

      const clearsList = clearsOnPage
        .map(
          (clear) =>
            `\`${clear.puzzle.ID}\` - ${clear.puzzle.PuzzleName} by ${clear.puzzle.Builder}`,
        )
        .join("\n");

      return new EmbedBuilder()
        .setTitle(`Clears for ${user.username}`)
        .setDescription(clearsList)
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

    const message = await interaction.reply({
      embeds: [embed],
      components: [buttons],
      fetchReply: true,
      ephemeral: true,
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({
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

      await i.update({
        embeds: [newEmbed],
        components: [newButtons],
        ephemeral: true,
      });
    });

    collector.on("end", async () => {
      await message.edit({ components: [] });
    });
  },
};
