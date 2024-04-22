const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Check if PuzzleBot is working."),
  async execute(interaction, client) {
    await interaction.reply({
      content: "I am working, I promise!",
      ephemeral: true,
    });
  },
};
