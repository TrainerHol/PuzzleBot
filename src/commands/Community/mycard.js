const { SlashCommandBuilder } = require("@discordjs/builders");
const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");
const Clears = require("../../../models/clears");
const Puzzles = require("../../../models/puzzles");
const { Op } = require("sequelize");

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
    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);
    const avatarURL = user.displayAvatarURL({ extension: "png", size: 256 });

    const tag = member.displayName || user.tag;

    const canvas = createCanvas(400, 300);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const radius = 80;
    const x = canvas.width / 2;
    const y = radius + 10;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.save();
    ctx.clip();

    const avatar = await loadImage(avatarURL);
    ctx.drawImage(avatar, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();

    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "right";
    ctx.fillText(tag, canvas.width - 10, 30);
    ctx.font = "18px Arial";
    ctx.fillText(`ID: ${user.id}`, canvas.width - 10, 60);

    // Retrieve the number of puzzles cleared by the user for each star rating
    const clearCounts = await Clears.findAll({
      attributes: ["puzzleId"],
      where: { jumper: user.id },
      include: [
        {
          model: Puzzles,
          attributes: ["Rating"],
          required: true,
        },
      ],
    });

    const starCounts = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    clearCounts.forEach((clear) => {
      const rating = clear.puzzle.Rating;
      if (starCounts[rating] !== undefined) {
        starCounts[rating]++;
      }
    });

    // Display the star counts on the card
    ctx.textAlign = "left";
    ctx.fillText("5-stars cleared: " + starCounts["5"], 20, 200);
    ctx.fillText("4-stars cleared: " + starCounts["4"], 20, 225);
    ctx.fillText("3-stars cleared: " + starCounts["3"], 20, 250);
    ctx.fillText("2-stars cleared: " + starCounts["2"], 20, 275);
    ctx.fillText("1-stars cleared: " + starCounts["1"], 20, 300);

    // Calculate and display the global percentage
    const totalClears = Object.values(starCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const totalPuzzles = await Puzzles.count({
      where: { Rating: { [Op.ne]: "" } },
    });
    const globalPercentage = ((totalClears / totalPuzzles) * 100).toFixed(2);
    ctx.fillText(`Global Percentage: ${globalPercentage}%`, 20, 325);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), {
      name: "user-card.png",
    });

    await interaction.reply({ files: [attachment], ephemeral: false });
  },
};