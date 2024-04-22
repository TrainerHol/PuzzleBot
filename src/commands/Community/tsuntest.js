const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tsuntest")
    .setDescription("Check if PuzzleBot is working, but get a tsun response."),
  async execute(interaction, client) {
    await interaction.reply({
      content: "今は働いています。ありがたく思いなさいよ。",
      ephemeral: true,
    });
  },
};
