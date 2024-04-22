const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder().setName("4star").setDescription("4 star btw"),
  async execute(interaction, name) {
    await interaction.reply({ content: "4 star btw" });
  },
};
