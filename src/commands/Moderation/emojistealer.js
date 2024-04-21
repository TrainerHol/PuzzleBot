const { ContextMenuInteraction, ContextMenuCommandBuilder, ApplicationCommandType, PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName("• Steal emoji")  
        .setType(ApplicationCommandType.Message)
        .setDMPermission(false),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) return await interaction.reply({ content: "You must be a Administrator and your role must have the **Administrator** permission to perform this action.", ephemeral: true});

        let message = await interaction.channel.messages.fetch(interaction.targetId);
 
        let emojiRegex = /<(a?):(\w{2,}):(\d{10,})>/;
        let emoji = message.content.match(emojiRegex);
        
        if (!emoji) {
            return await interaction.reply({ content: "Invalid emoji. Please use this command on a message containing a custom emoji.", ephemeral: true });
        }
        
        let id = emoji.pop();
        let name = emoji.pop();
        let animated = emoji.pop() === 'a' // true/false, optional use depending on your use case
 
        let url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`
 
        try {
            let newEmoji = await interaction.guild.emojis.create({ attachment: url, name: name })
            let embed = new EmbedBuilder()
                .setColor("Blue")
                .setDescription(`Added ${newEmoji}, with the name ${name}`)
            return interaction.reply({ embeds: [embed] });            
        } catch (error) {
            console.log(error.stack);
            interaction.reply({ content: "You cannot add this emoji because you have reached your server emoji limit", ephemeral: true})
        }
    }
}