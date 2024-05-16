const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const Badges = require("../../../models/badges");
const Puzzles = require("../../../models/puzzles");
const { Op } = require("sequelize");

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
        await interaction.reply("No badge found matching the provided query.");
        return;
      }

      const puzzleList = badge.puzzles
        .map((puzzle) => {
          const { ID, PuzzleName, Address, World, Datacenter, Rating } = puzzle;
          const formattedRating = Rating.match(/^[A-Z]$/)
            ? `${Rating}★`
            : `${"★".repeat(parseInt(Rating))}`;
          return `\`${ID}\` **${PuzzleName}** (${Address} <${World}/${Datacenter}>) ${formattedRating}`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(badge.name)
        .setDescription(badge.description)
        .setThumbnail(badge.imageUrl)
        .addFields(
          { name: "Title Awarded", value: badge.title },
          { name: "Name", value: badge.name },
          { name: "Required Puzzles", value: puzzleList },
        )
        .setFooter({ text: `ID: ${badge.id}` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error retrieving badge information:", error);
      await interaction.reply(
        "An error occurred while retrieving badge information. Please try again later.",
      );
    }
  },
};
