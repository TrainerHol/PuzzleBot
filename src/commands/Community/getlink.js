const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('getlink')
    .setDescription('Get the link to the puzzle submission form'),
    async execute(interaction, client) {
        await interaction.reply({ content: 'Link tree: <https://ffxiv.ju.mp> \nSubmission form: https://forms.gle/LHR9uoLWo1e4K7DT8', ephemeral: true});
    }
}