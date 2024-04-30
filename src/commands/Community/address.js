const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Op } = require("sequelize");
const Puzzles = require("../../../models/puzzles");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("address")
    .setDescription("Search for a puzzle by name or builder")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The puzzle name")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("builder")
        .setDescription("The builder name")
        .setRequired(false),
    ),
  async execute(interaction) {
    const puzzleName = interaction.options.getString("name");
    const builderName = interaction.options.getString("builder");

    if (!puzzleName && !builderName) {
      await interaction.reply(
        "Please provide either a puzzle name or a builder name.",
      );
      return;
    }

    try {
      const whereClause = {};
      if (puzzleName) {
        whereClause.PuzzleName = { [Op.like]: `%${puzzleName}%` };
      }
      if (builderName) {
        whereClause.Builder = { [Op.like]: `%${builderName}%` };
      }

      const limit = 3;
      const order = builderName && !puzzleName ? [["ID", "DESC"]] : undefined;

      const results = await Puzzles.findAll({
        where: whereClause,
        limit: limit,
        order: order,
      });

      if (results.length === 0) {
        await interaction.reply(
          "No puzzles found matching your search criteria.",
        );
        return;
      }

      let response = "";
      for (const puzzle of results) {
        const puzzleNameResult = puzzle.PuzzleName;
        const address = puzzle.Address;
        const rating = puzzle.Rating;
        const builder = puzzle.Builder;
        const world = puzzle.World;
        const datacenter = puzzle.Datacenter;
        const goals = puzzle.GoalsRules;
        const id = puzzle.ID;
        // puzzle.M E S P V J G L X
        const tags = `${puzzle.M}${puzzle.E}${puzzle.S}${puzzle.P}${puzzle.V}${puzzle.J}${puzzle.G}${puzzle.L}${puzzle.X}`;

        let stars = "";
        if (rating.match(/^[A-Z]$/)) {
          stars = "☆";
        } else {
          const numStars = parseInt(rating);
          stars = "★".repeat(numStars) + "☆".repeat(5 - numStars);
        }

        response += `- **__${id} ${puzzleNameResult}__** by ${builder} [${tags}]\n**Address:** (${address}, ${world}, ${datacenter}) ${stars}\n`;
        response += goals ? `**Goals/Rules:** ${goals}\n` : "";
      }
      response += "";

      await interaction.reply({ content: response, ephemeral: true });
    } catch (error) {
      console.error("Error searching for puzzle:", error);
      await interaction.reply(
        "An error occurred while searching for the puzzle. Please try again later.",
      );
    }
  },
};
