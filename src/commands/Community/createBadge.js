const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const Badges = require("../../../models/badges");
const Puzzles = require("../../../models/puzzles");
const BadgePuzzles = require("../../../models/badgePuzzles");
const { Op } = require("sequelize");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("createbadge")
    .setDescription("Create a new badge")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The name of the badge")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("The title of the badge")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("The description of the badge")
        .setRequired(true),
    )
    .addAttachmentOption((option) =>
      option
        .setName("image")
        .setDescription("The image of the badge")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("puzzleids")
        .setDescription(
          "The comma or space separated list of puzzle IDs required for the badge",
        )
        .setRequired(true),
    ),
  async execute(interaction) {
    const name = interaction.options.getString("name");
    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const imageAttachment = interaction.options.getAttachment("image");
    const puzzleIds = interaction.options.getString("puzzleids");

    const cleanedPuzzleIds = puzzleIds
      .replace(/,/g, " ")
      .split(" ")
      .map((id) => id.trim().padStart(5, "0"))
      .filter((id) => id.length === 5);

    try {
      const existingPuzzles = await Puzzles.findAll({
        where: {
          ID: {
            [Op.in]: cleanedPuzzleIds,
          },
        },
      });

      if (existingPuzzles.length !== cleanedPuzzleIds.length) {
        await interaction.reply(
          "One or more provided puzzle IDs do not exist. Please check the puzzle IDs and try again.",
        );
        return;
      }

      const badge = await Badges.create({
        name: name,
        title: title,
        description: description,
        imageUrl: imageAttachment.url,
      });

      const badgePuzzleData = cleanedPuzzleIds.map((puzzleId) => ({
        badgeId: badge.id,
        puzzleId: puzzleId,
      }));

      await BadgePuzzles.bulkCreate(badgePuzzleData);

      const embed = new EmbedBuilder()
        .setTitle("Badge Created")
        .setDescription(`A new badge has been created: **${title}**`)
        .setThumbnail(imageAttachment.url)
        .addFields(
          { name: "Name", value: name },
          { name: "Description", value: description },
          { name: "Required Puzzles", value: cleanedPuzzleIds.join(", ") },
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error creating badge:", error);
      await interaction.reply(
        "An error occurred while creating the badge. Please try again later.",
      );
    }
  },
};
