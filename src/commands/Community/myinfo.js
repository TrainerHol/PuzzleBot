const { SlashCommandBuilder } = require(`@discordjs/builders`);
const {EmbedBuilder } = require(`discord.js`);

module.exports = {
    data: new SlashCommandBuilder()
    .setName(`myinfo`)
    .setDescription(`Retrieve user info`),
    async execute (interaction) {

        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id);
        const icon = user.displayAvatarURL();
        const tag = user.tag;

        const embed = new EmbedBuilder()
        .setColor("Blue")
        .setAuthor({ name: tag, iconURL: icon})
        .setFooter({ text: `${user.id}`})

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}