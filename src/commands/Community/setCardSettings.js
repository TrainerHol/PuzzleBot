const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const CardSettings = require("../../../models/cardSettings");
const Badges = require("../../../models/badges");
const Puzzles = require("../../../models/puzzles");
const Clears = require("../../../models/clears");
require("dotenv").config();

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

    if (cardPhoto) {
      const badgeImageChannelId = process.env.BADGE_IMAGE_CHANNEL_ID;
      const badgeImageChannel =
        interaction.client.channels.cache.get(badgeImageChannelId);

      const imageMessage = await badgeImageChannel.send({
        files: [cardPhoto],
      });

      existingSettings.cardPhotoUrl = imageMessage.attachments.first().url;
      await existingSettings.save();
    }

    if (userBadges.length < 25) {
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
            cardPhotoUrl: existingSettings?.cardPhotoUrl || "",
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
            content: "Card settings update cancelled.",
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
      const modal = new ModalBuilder()
        .setCustomId("card_settings_modal")
        .setTitle("Card Settings");

      const characterNameInput = new TextInputBuilder()
        .setCustomId("character_name")
        .setLabel("Character Name")
        .setStyle(TextInputStyle.Short)
        .setValue(existingSettings?.characterName || "");

      const favoriteBadgeInput = new TextInputBuilder()
        .setCustomId("favorite_badge")
        .setLabel("Favorite Badge ID")
        .setStyle(TextInputStyle.Short)
        .setValue(existingSettings?.favoriteBadge?.toString() || "");

      const displayBadgesInput = new TextInputBuilder()
        .setCustomId("display_badges")
        .setLabel("Display Badge IDs (comma-separated)")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(existingSettings?.displayBadges?.join(", ") || "")
        .setPlaceholder("Enter comma-separated badge IDs (max 8)");

      modal.addComponents(
        new ActionRowBuilder().addComponents(characterNameInput),
        new ActionRowBuilder().addComponents(favoriteBadgeInput),
        new ActionRowBuilder().addComponents(displayBadgesInput),
      );

      await interaction.showModal(modal);

      const submitted = await interaction
        .awaitModalSubmit({
          filter: (i) => i.customId === "card_settings_modal",
          time: 60000,
        })
        .catch((_) => null);

      if (submitted) {
        const characterName =
          submitted.fields.getTextInputValue("character_name");
        const favoriteBadge =
          submitted.fields.getTextInputValue("favorite_badge");
        const displayBadgesInput =
          submitted.fields.getTextInputValue("display_badges");

        const displayBadges = displayBadgesInput
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id));

        await CardSettings.upsert({
          userId: interaction.user.id,
          characterName: characterName,
          cardPhotoUrl: existingSettings?.cardPhotoUrl || "",
          favoriteBadge: favoriteBadge ? parseInt(favoriteBadge) : null,
          displayBadges: displayBadges.slice(0, 8),
        });

        await submitted.reply({
          content: "Card settings updated successfully!",
          ephemeral: true,
        });
      } else {
        try {
          await interaction.reply({
            content: "Card settings update cancelled.",
            ephemeral: true,
          });
        } catch (error) {
          if (error.code !== "InteractionAlreadyReplied") {
            console.error("Error replying to interaction:", error);
          }
        }
      }
    }
  },
};
