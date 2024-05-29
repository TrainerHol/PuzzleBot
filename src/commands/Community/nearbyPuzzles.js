const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Puzzles = require("../../../models/puzzles");
const { Op } = require("sequelize");

const PUZZLES_PER_PAGE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("nearbypuzzles")
    .setDescription(
      "Shows the list of puzzles given world/ward/server or puzzle ID",
    )
    .addStringOption((option) =>
      option
        .setName("world")
        .setDescription("The World of the puzzles")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("district")
        .setDescription("The District of the puzzles")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("ward")
        .setDescription("The Ward of the puzzles")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("puzzle_id")
        .setDescription("The ID of a specific puzzle")
        .setRequired(false),
    ),
  async execute(interaction) {
    const world = interaction.options.getString("world");
    const district = interaction.options.getString("district");
    const ward = interaction.options.getString("ward");
    const puzzleId = interaction.options.getString("puzzle_id");

    if (!((world && district && ward) || puzzleId)) {
      await interaction.reply({
        content:
          "Please provide either the World, District, and Ward combination or a specific puzzle ID.",
        ephemeral: true,
      });
      return;
    }

    let whereClause = {};

    if (puzzleId) {
      const paddedPuzzleId = puzzleId.padStart(5, "0");
      const puzzle = await Puzzles.findOne({
        where: {
          ID: paddedPuzzleId,
        },
      });

      if (!puzzle) {
        await interaction.reply({
          content: "Puzzle not found.",
          ephemeral: true,
        });
        return;
      }

      whereClause = {
        World: puzzle.World,
        District: puzzle.District,
        Ward: puzzle.Ward,
      };
    } else {
      const formattedDistrict = district.replace(/^the\s+/i, "");

      whereClause = {
        World: {
          [Op.like]: `%${world}%`,
        },
        District: {
          [Op.like]: `%${formattedDistrict}%`,
        },
        Ward: ward,
      };
    }

    const puzzles = await Puzzles.findAll({ where: whereClause });

    if (puzzles.length === 0) {
      await interaction.reply({
        content: "No puzzles found.",
        ephemeral: true,
      });
      return;
    }

    const totalPages = Math.ceil(puzzles.length / PUZZLES_PER_PAGE);
    let currentPage = 1;

    const generateEmbed = (pageNumber) => {
      const startIndex = (pageNumber - 1) * PUZZLES_PER_PAGE;
      const endIndex = startIndex + PUZZLES_PER_PAGE;
      const puzzlesOnPage = puzzles.slice(startIndex, endIndex);

      const puzzleList = puzzlesOnPage
        .map((puzzle) => {
          const address = puzzle.Address.replace("Apartment", "Apt");
          return `\`${puzzle.ID}\` ${puzzle.Rating}★ ${puzzle.PuzzleName} by ${puzzle.Builder} | ${address}`;
        })
        .join("\n");

      let worldValue, districtValue, wardValue;

      if (puzzleId) {
        worldValue = whereClause.World;
        districtValue = whereClause.District;
        wardValue = whereClause.Ward;
      } else {
        worldValue = world;
        districtValue = district.replace(/^the\s+/i, "");
        wardValue = ward;
      }

      worldValue = worldValue.charAt(0).toUpperCase() + worldValue.slice(1);
      districtValue =
        districtValue.charAt(0).toUpperCase() + districtValue.slice(1);

      return new EmbedBuilder()
        .setTitle(
          `Nearby Puzzles${puzzleId ? ` for Puzzle ${puzzleId}` : ""} in ${worldValue} ${districtValue} Ward ${wardValue}`,
        )
        .setDescription(puzzleList)
        .setFooter({ text: `Page ${pageNumber} of ${totalPages}` });
    };

    const generateButtons = (pageNumber) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("previous")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageNumber === 1),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageNumber === totalPages),
      );
    };

    const embed = generateEmbed(currentPage);
    const buttons = generateButtons(currentPage);

    const message = await interaction.reply({
      embeds: [embed],
      components: [buttons],
      fetchReply: true,
      ephemeral: true,
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "previous") {
        currentPage--;
      } else if (i.customId === "next") {
        currentPage++;
      }

      const newEmbed = generateEmbed(currentPage);
      const newButtons = generateButtons(currentPage);

      await i.update({
        embeds: [newEmbed],
        components: [newButtons],
        ephemeral: true,
      });
    });

    collector.on("end", async () => {
      try {
        await message.edit({ components: [] });
      } catch (error) {
        if (error.code === 10008) {
          console.log("Message interaction timed out.");
        } else {
          console.error("Error editing message:", error);
        }
      }
    });
  },
};
