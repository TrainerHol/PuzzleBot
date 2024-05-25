const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const CardSettings = require("../../../models/cardSettings");
const Badges = require("../../../models/badges");
const Puzzles = require("../../../models/puzzles");
const Clears = require("../../../models/clears");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setcardsettings")
    .setDescription("Set your card settings")
    .addStringOption((option) =>
      option
        .setName("character_name")
        .setDescription("Your character name")
        .setRequired(false),
    )
    .addAttachmentOption((option) =>
      option
        .setName("card_photo")
        .setDescription("Upload an image for your card photo")
        .setRequired(false),
    ),
  async execute(interaction) {
    const characterName = interaction.options.getString("character_name");
    const cardPhoto = interaction.options.getAttachment("card_photo");

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

    const existingSettings = await CardSettings.findOne({
      where: { userId: interaction.user.id },
    });

    if (userBadges.length > 0) {
      const favoriteBadgeMenu = new StringSelectMenuBuilder()
        .setCustomId("favorite_badge")
        .setPlaceholder("Select your favorite badge")
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel("None").setValue("none"),
          ...userBadges.map((badge) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(badge.name)
              .setValue(badge.id.toString()),
          ),
        );

      const displayBadgesMenu = new StringSelectMenuBuilder()
        .setCustomId("display_badges")
        .setPlaceholder("Select badges to display on your card (up to 8)")
        .setMinValues(0)
        .setMaxValues(Math.min(userBadges.length, 8))
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel("None").setValue("none"),
          ...userBadges.map((badge) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(badge.name)
              .setValue(badge.id.toString()),
          ),
        );

      const saveButton = new ButtonBuilder()
        .setCustomId("save")
        .setLabel("Save")
        .setStyle(ButtonStyle.Success);

      const cancelButton = new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger);

      const actionRow1 = new ActionRowBuilder().addComponents(
        favoriteBadgeMenu,
      );
      const actionRow2 = new ActionRowBuilder().addComponents(
        displayBadgesMenu,
      );
      const actionRow3 = new ActionRowBuilder().addComponents(
        saveButton,
        cancelButton,
      );

      await interaction.reply({
        content:
          "Please select your favorite badge and badges to display on your card:",
        components: [actionRow1, actionRow2, actionRow3],
        ephemeral: true,
      });

      const collector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60000,
      });

      let favoriteBadge = existingSettings?.favoriteBadge || null;
      let displayBadges = existingSettings?.displayBadges || [];

      collector.on("collect", async (i) => {
        if (i.customId === "favorite_badge") {
          favoriteBadge = i.values[0] === "none" ? null : parseInt(i.values[0]);
          await i.deferUpdate();
        }

        if (i.customId === "display_badges") {
          displayBadges = i.values
            .filter((value) => value !== "none")
            .map((badgeId) => parseInt(badgeId));
          await i.deferUpdate();
        }

        if (i.customId === "save") {
          await CardSettings.upsert({
            userId: interaction.user.id,
            characterName:
              characterName || existingSettings?.characterName || "",
            cardPhotoUrl: cardPhoto
              ? cardPhoto.url
              : existingSettings?.cardPhotoUrl || "",
            favoriteBadge: favoriteBadge,
            displayBadges: displayBadges,
          });

          await i.update({
            content: "Card settings saved successfully!",
            components: [],
          });

          collector.stop();
        }

        if (i.customId === "cancel") {
          await i.update({
            content: "Card settings update canceled.",
            components: [],
          });

          collector.stop();
        }
      });

      collector.on("end", async (_, reason) => {
        if (reason === "time") {
          await interaction.editReply({
            content: "Card settings update timed out.",
            components: [],
          });
        }
      });
    } else {
      await CardSettings.upsert({
        userId: interaction.user.id,
        characterName: characterName || existingSettings?.characterName || "",
        cardPhotoUrl: cardPhoto
          ? cardPhoto.url
          : existingSettings?.cardPhotoUrl || "",
        favoriteBadge: null,
        displayBadges: [],
      });

      await interaction.reply({
        content: "Card settings updated successfully!",
        ephemeral: true,
      });
    }
  },
};
