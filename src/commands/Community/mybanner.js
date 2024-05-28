const { SlashCommandBuilder } = require("@discordjs/builders");
const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");
const Clears = require("../../../models/clears");
const Puzzles = require("../../../models/puzzles");
const CardSettings = require("../../../models/cardSettings");
const Badges = require("../../../models/badges");
const { Op } = require("sequelize");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mybanner")
    .setDescription("Retrieve user banner with puzzle clear stats")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to retrieve the banner for")
        .setRequired(false),
    ),
  async execute(interaction) {
    await interaction.reply({
      content: "Generating your banner...",
      ephemeral: true,
    });

    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);

    const cardSettings = await CardSettings.findOne({
      where: { userId: user.id },
    });

    const characterName =
      cardSettings?.characterName || member.displayName || user.tag;

    const canvas = createCanvas(680, 240);
    const ctx = canvas.getContext("2d");

    // Register fonts
    registerFont(path.join(__dirname, "../../../src/fonts/font2.ttf"), {
      family: "Miedinger",
    });

    // Load images
    const template = await loadImage(
      path.join(__dirname, "../../../src/img/BannerTemplate.png"),
    );

    // Calculate the pseudorandom image index based on the user's ID
    const userIdNumber = parseInt(user.id);
    const stampIndex = (userIdNumber % 24) + 1;
    const stampImage = await loadImage(
      path.join(__dirname, `../../../src/img/stamp${stampIndex}.png`),
    );

    // Retrieve the favorite badge from card settings
    const favoriteBadgeId = cardSettings?.favoriteBadge;
    const favoriteBadge = await Badges.findByPk(favoriteBadgeId);

    // Draw template
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    // Draw stamp image
    ctx.drawImage(stampImage, 553, 5, 100, 100);

    // Draw character name
    ctx.font = '24px "Miedinger"';
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.fillText(characterName, 187.281, 21.1 + 24);

    // Draw favorite badge title
    if (favoriteBadge) {
      ctx.font = '16px "Miedinger"';
      ctx.fillStyle = "rgb(255, 255, 255)";
      ctx.fillText(`<< ${favoriteBadge.title} >>`, 187.594, 56.9 + 16);
    }

    // Retrieve the puzzle IDs cleared by the user
    const clearedPuzzleIds = await Clears.findAll({
      attributes: ["puzzleId"],
      where: { jumper: user.id },
    });

    // Extract the puzzle IDs into an array
    const puzzleIds = clearedPuzzleIds.map((clear) => clear.puzzleId);

    // Retrieve the puzzles with the specified IDs and their ratings
    const clearedPuzzles = await Puzzles.findAll({
      attributes: ["Rating"],
      where: { ID: puzzleIds },
    });

    const starCounts = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    clearedPuzzles.forEach((puzzle) => {
      const rating = puzzle.Rating;
      if (starCounts[rating] !== undefined) {
        starCounts[rating]++;
      }
    });

    // Calculate the total star count
    const totalStarCount = Object.entries(starCounts).reduce(
      (sum, [rating, count]) => sum + rating * count,
      0,
    );

    // Draw star count
    ctx.font = '18px "Miedinger"';
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.fillText(`${totalStarCount.toString()} STARS`, 316.828, 92.7 + 18);

    // Draw puzzles cleared count
    const totalClearedPuzzles = clearedPuzzles.length;
    ctx.font = '18px "Miedinger"';
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.fillText(`${totalClearedPuzzles} Puzzles Cleared`, 317.125, 125.7 + 18);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), {
      name: "user-banner.png",
    });

    await interaction.editReply({
      content: "",
      files: [attachment],
      ephemeral: false,
    });
  },
};
