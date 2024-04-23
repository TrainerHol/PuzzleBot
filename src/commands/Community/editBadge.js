const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const Badges = require("../../../models/badges");
const Puzzles = require("../../../models/puzzles");
const BadgePuzzles = require("../../../models/badgePuzzles");
const { Op } = require("sequelize");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("editbadge")
    .setDescription("Edit an existing badge")
    .addIntegerOption((option) =>
      option
        .setName("badgeid")
        .setDescription("The ID of the badge to edit")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("name").setDescription("The new name of the badge"),
    )
    .addStringOption((option) =>
      option.setName("title").setDescription("The new title of the badge"),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("The new description of the badge"),
    )
    .addAttachmentOption((option) =>
      option.setName("image").setDescription("The new image of the badge"),
    )
    .addStringOption((option) =>
      option
        .setName("puzzleids")
        .setDescription(
          "The new comma or space separated list of puzzle IDs required for the badge",
        ),
    ),
  async execute(interaction) {
    const badgeId = interaction.options.getInteger("badgeid");
    const name = interaction.options.getString("name");
    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const imageAttachment = interaction.options.getAttachment("image");
    const puzzleIds = interaction.options.getString("puzzleids");

    try {
      const badge = await Badges.findByPk(badgeId);

      if (!badge) {
        await interaction.reply("The specified badge does not exist.");
        return;
      }

      const updateData = {};

      if (name) updateData.name = name;
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (imageAttachment) updateData.imageUrl = imageAttachment.url;

      await badge.update(updateData);

      if (puzzleIds) {
        const cleanedPuzzleIds = puzzleIds
          .replace(/,/g, " ")
          .split(" ")
          .map((id) => id.trim().padStart(5, "0"))
          .filter((id) => id.length === 5);

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

        await BadgePuzzles.destroy({
          where: {
            badgeId: badge.id,
          },
        });

        const badgePuzzleData = cleanedPuzzleIds.map((puzzleId) => ({
          badgeId: badge.id,
          puzzleId: puzzleId,
        }));

        await BadgePuzzles.bulkCreate(badgePuzzleData);
      }

      const embed = new EmbedBuilder()
        .setTitle("Badge Edited")
        .setDescription(`The badge **${badge.title}** has been edited.`);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error editing badge:", error);
      await interaction.reply(
        "An error occurred while editing the badge. Please try again later.",
      );
    }
  },
};
