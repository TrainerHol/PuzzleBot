const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage, registerFont } = require("canvas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName(`mycard`)
    .setDescription(`Retrieve user card`),
  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);
    const avatarURL = user.displayAvatarURL({ extension: "png", size: 256 });
    const tag = user.tag;

    const canvas = createCanvas(400, 200);
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
    //ctx.fillText(`ID: ${user.id}`, canvas.width - 10, 60);
    ctx.fillText(`USER NAENUCKED SUCCESSFULLY`, canvas.width - 10, 60);
    const attachment = new AttachmentBuilder(canvas.toBuffer(), {
      name: "user-info.png",
    });

    await interaction.reply({ files: [attachment], ephemeral: false });
  },
};
