const {
  SlashCommandBuilder,
  ApplicationCommandOptionWithChoicesAndAutocompleteMixin,
} = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pclear")
    .setDescription(
      "Use this command to record your puzzle clears! Ping an admin if the clear is not recorded.",
    )
    .addStringOption((option) =>
      option
        .setName("puzzle")
        .setDescription("Type the 5-digit puzzle ID")
        .setRequired(true),
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);
    const jumper = `${user.id}`;
    const puzzle = interaction.options.getString("puzzle");

    await interaction.reply({
      content: `Your clear of puzzle #${puzzle} has been recorded!`,
      ephemeral: true,
    });

    axios.post("https://sheetdb.io/api/v1/zgofzlregwgyn", {
      data: {
        jumper: `${jumper}`,
        puzzle: `${puzzle}`,
      },
    });
  },
};
