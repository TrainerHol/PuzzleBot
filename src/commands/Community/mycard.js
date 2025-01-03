const { SlashCommandBuilder } = require("@discordjs/builders");
const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");
const Clears = require("../../../models/clears");
const Puzzles = require("../../../models/puzzles");
const CardSettings = require("../../../models/cardSettings");
const Badges = require("../../../models/badges");
const { Op } = require("sequelize");
require("dotenv").config();

const cdn = process.env.DISCORD_CDN;

async function loadImageWithFallback(url, fallbackImage, useCDN = false) {
  try {
    console.log(
      `Attempting to load image from: ${useCDN ? `${cdn}${url}` : url}`,
    );
    const imageUrl = useCDN ? `${cdn}${url}` : url;
    const image = await loadImage(imageUrl);
    console.log("Successfully loaded image");
    return image;
  } catch (error) {
    console.error(`Failed to load image: ${url}. Using fallback image.`);
    console.log(error);
    return fallbackImage;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mycard")
    .setDescription("Retrieve user card with puzzle clear stats")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to retrieve the card for")
        .setRequired(false),
    ),
  async execute(interaction) {
    try {
      console.log("Starting mycard command execution");
      await interaction.deferReply({ ephemeral: false });

      const user = interaction.options.getUser("user") || interaction.user;
      const member = await interaction.guild.members.fetch(user.id);
      console.log(`Processing card for user: ${user.tag}`);

      console.log("Fetching card settings");
      const cardSettings = await CardSettings.findOne({
        where: { userId: user.id },
      });

      const avatarURL = cardSettings?.cardPhotoUrl
        ? cardSettings.cardPhotoUrl
        : user.displayAvatarURL({ extension: "png", size: 256 });
      console.log(`Using avatar URL: ${avatarURL}`);

      const characterName =
        cardSettings?.characterName || member.displayName || user.tag;

      const canvas = createCanvas(953, 624);
      const ctx = canvas.getContext("2d");

      registerFont(path.join(__dirname, "../../../src/fonts/font1.otf"), {
        family: "Jupiter Pro",
      });
      registerFont(path.join(__dirname, "../../../src/fonts/font2.ttf"), {
        family: "Miedinger",
      });
      registerFont(path.join(__dirname, "../../../src/fonts/font3.ttf"), {
        family: "OpenSans",
      });

      console.log("Loading template and basic images");
      const template = await loadImage(
        path.join(__dirname, "../../../src/img/Template.png"),
      );
      console.log("Template loaded");
      const expBarFill = await loadImage(
        path.join(__dirname, "../../../src/img/ExpBarFill.png"),
      );
      const blankImage = await loadImage(
        path.join(__dirname, "../../../src/img/blank.png"),
      );

      const userIdNumber = parseInt(user.id);
      const stampIndex = (userIdNumber % 24) + 1;
      const stampImage = await loadImage(
        path.join(__dirname, `../../../src/img/stamp${stampIndex}.png`),
      );

      const favoriteBadgeId = cardSettings?.favoriteBadge;
      const displayBadgeIds = cardSettings?.displayBadges || [];

      const [favoriteBadge, displayBadges] = await Promise.all([
        favoriteBadgeId ? Badges.findByPk(favoriteBadgeId) : null,
        displayBadgeIds.length > 0
          ? Badges.findAll({ where: { id: displayBadgeIds }, limit: 8 })
          : [],
      ]);

      ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = "multiply";
      ctx.filter = "hue-rotate(-30deg)";
      ctx.globalAlpha = 0.75;
      ctx.drawImage(stampImage, 0, 5, 64, 64);
      ctx.drawImage(stampImage, canvas.width - 64, 5, 64, 64);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      const avatar = await loadImageWithFallback(
        avatarURL,
        blankImage,
        cardSettings?.cardPhotoUrl,
      );
      ctx.drawImage(avatar, 24, 78, 128, 128);

      let padding = 100;
      ctx.font = '22px "Jupiter Pro"';
      ctx.fillStyle = "rgb(118, 92, 73)";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(characterName, 186.847 + padding, 96.3);

      if (favoriteBadge) {
        const favBadgeImage = await loadImageWithFallback(
          favoriteBadge.imageUrl,
          blankImage,
          true,
        );
        ctx.drawImage(favBadgeImage, 269, 285, 145, 145);

        ctx.font = '22px "OpenSans"';
        ctx.fillStyle = "rgb(118, 92, 73)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`«${favoriteBadge.title}»`, 190 + padding, 129.44);

        ctx.font = '16px "OpenSans"';
        ctx.fillStyle = "rgb(106, 76, 58)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(favoriteBadge.name, 340, 434.258);
      }

      const badgePositions = [
        { x: 572, y: 99 },
        { x: 768, y: 99 },
        { x: 573, y: 208 },
        { x: 769, y: 208 },
        { x: 572, y: 318 },
        { x: 768, y: 318 },
        { x: 572, y: 426 },
        { x: 768, y: 426 },
      ];

      const badgeTextPositions = [
        { x: 611, y: 179.78 },
        { x: 806.5, y: 179.78 },
        { x: 612, y: 288.78 },
        { x: 807.5, y: 288.78 },
        { x: 611, y: 397.78 },
        { x: 806.5, y: 397.78 },
        { x: 611, y: 505.78 },
        { x: 806.5, y: 505.78 },
      ];

      for (let i = 0; i < displayBadges.length; i++) {
        const badge = displayBadges[i];
        const badgeImage = await loadImageWithFallback(
          badge.imageUrl,
          blankImage,
          true,
        );
        ctx.drawImage(
          badgeImage,
          badgePositions[i].x,
          badgePositions[i].y,
          78,
          78,
        );

        ctx.font = '14px "OpenSans"';
        ctx.fillStyle = "rgb(106, 76, 58)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(
          badge.name,
          badgeTextPositions[i].x,
          badgeTextPositions[i].y,
        );
      }

      console.log("Starting database queries for puzzle stats");
      const clearedPuzzleIds = await Clears.findAll({
        attributes: ["puzzleId"],
        where: { jumper: user.id },
      });
      console.log(`Found ${clearedPuzzleIds.length} cleared puzzles`);

      const puzzleIds = clearedPuzzleIds.map((clear) => clear.puzzleId);

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

      let starPadding = 15;
      ctx.font = '22px "Miedinger"';
      ctx.fillStyle = "rgb(155, 129, 115)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(starCounts["1"], 159.094, 274.8 + starPadding);
      ctx.fillText(starCounts["2"], 159.094, 317.8 + starPadding);
      ctx.fillText(starCounts["3"], 158.094, 359.8 + starPadding);
      ctx.fillText(starCounts["4"], 158.094, 400.8 + starPadding);
      ctx.fillText(starCounts["5"], 158.094, 442.8 + starPadding);

      const totalClears = Object.values(starCounts).reduce(
        (sum, count) => sum + count,
        0,
      );
      const totalPuzzles = await Puzzles.count({
        where: {
          Rating: { [Op.ne]: "" },
          Status: "Active",
        },
      });
      const globalPercentage = ((totalClears / totalPuzzles) * 100).toFixed(2);

      const expBarWidth = (globalPercentage / 100) * 419;
      ctx.drawImage(expBarFill, 26, 516, expBarWidth, 28);

      console.log("Generating final image");
      const attachment = new AttachmentBuilder(canvas.toBuffer(), {
        name: "user-card.png",
      });

      console.log("Sending reply");
      await interaction.editReply({
        content: "",
        files: [attachment],
        ephemeral: false,
      });
      console.log("Command completed successfully");
    } catch (error) {
      console.error("An error occurred while generating the user card:", error);
      await interaction.editReply({
        content:
          "An error occurred while generating your card. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
