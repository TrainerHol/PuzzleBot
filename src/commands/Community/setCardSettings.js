const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
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

    const favoriteBadgeMenu = new StringSelectMenuBuilder()
      .setCustomId("favorite_badge")
      .setPlaceholder("Select your favorite badge");

    const displayBadgesMenu = new StringSelectMenuBuilder()
      .setCustomId("display_badges")
      .setPlaceholder("Select badges to display on your card (up to 10)")
      .setMinValues(0);

    if (userBadges.length > 0) {
      favoriteBadgeMenu.addOptions(
        new StringSelectMenuOptionBuilder().setLabel("None").setValue("none"),
        ...userBadges.map((badge) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(badge.name)
            .setValue(badge.id.toString()),
        ),
      );

      displayBadgesMenu
        .setMaxValues(Math.min(userBadges.length, 10))
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel("None").setValue("none"),
          ...userBadges.map((badge) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(badge.name)
              .setValue(badge.id.toString()),
          ),
        );
    }

    const actionRow1 = new ActionRowBuilder().addComponents(favoriteBadgeMenu);
    const actionRow2 = new ActionRowBuilder().addComponents(displayBadgesMenu);

    const existingSettings = await CardSettings.findOne({
      where: { userId: interaction.user.id },
    });

    await interaction.reply({
      content:
        "Please select your favorite badge and badges to display on your card:",
      components: userBadges.length > 0 ? [actionRow1, actionRow2] : [],
      ephemeral: true,
    });

    const collector = interaction.channel.createMessageComponentCollector({
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
    });

    collector.on("end", async () => {
      await CardSettings.upsert({
        userId: interaction.user.id,
        characterName: characterName || existingSettings?.characterName || "",
        cardPhotoUrl: cardPhoto
          ? cardPhoto.url
          : existingSettings?.cardPhotoUrl || "",
        favoriteBadge: favoriteBadge,
        displayBadges: displayBadges,
      });

      await interaction.editReply("Card settings updated successfully!");
    });
  },
};
