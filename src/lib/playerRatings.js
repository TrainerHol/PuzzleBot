const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const PuzzleRatings = require("../../models/puzzleRatings");

function normalizePuzzleIds(puzzleIds) {
  if (!Array.isArray(puzzleIds)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of puzzleIds) {
    const id = String(raw).padStart(5, "0");
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function chunkArray(items, chunkSize) {
  if (chunkSize <= 0) return [items];
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function isMissingTableError(error) {
  if (!error || typeof error !== "object") return false;
  const message = typeof error.message === "string" ? error.message : "";
  if (message.includes("no such table: puzzleRatings")) return true;
  if (message.includes("SQLITE_ERROR") && message.includes("puzzleRatings")) return true;
  if (error.original && typeof error.original.message === "string") {
    const inner = error.original.message;
    if (inner.includes("no such table: puzzleRatings")) return true;
  }
  return false;
}

async function getPlayerRatingByPuzzleId(puzzleIds) {
  const ids = normalizePuzzleIds(puzzleIds);
  if (ids.length === 0) return new Map();

  const out = new Map();

  for (const idChunk of chunkArray(ids, 900)) {
    try {
      const rows = await PuzzleRatings.findAll({
        attributes: [
          "puzzleId",
          [Sequelize.fn("AVG", Sequelize.col("rating")), "avg"],
          [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
        ],
        where: { puzzleId: { [Op.in]: idChunk } },
        group: ["puzzleId"],
      });

      for (const row of rows) {
        const puzzleId = row.puzzleId;
        const avgRaw = row.get("avg");
        const countRaw = row.get("count");
        const avg = typeof avgRaw === "number" ? avgRaw : Number(avgRaw);
        const count = typeof countRaw === "number" ? countRaw : Number(countRaw);
        if (!Number.isFinite(avg) || !Number.isFinite(count)) continue;
        out.set(puzzleId, { avg, count });
      }
    } catch (error) {
      if (isMissingTableError(error)) return new Map();
      throw error;
    }
  }

  return out;
}

function formatAvg(avg) {
  if (!Number.isFinite(avg)) return null;
  const rounded = Math.round(avg * 10) / 10;
  return rounded.toFixed(1);
}

function formatPlayerRating(summary) {
  if (!summary || typeof summary !== "object") return null;
  const { avg, count } = summary;
  if (!Number.isFinite(avg) || !Number.isFinite(count) || count <= 0) return null;
  const avgText = formatAvg(avg);
  if (!avgText) return null;
  return `PR ${avgText}/5 (${count})`;
}

function formatPlayerRatingShort(summary) {
  if (!summary || typeof summary !== "object") return null;
  const { avg, count } = summary;
  if (!Number.isFinite(avg) || !Number.isFinite(count) || count <= 0) return null;
  const avgText = formatAvg(avg);
  if (!avgText) return null;
  return `PR ${avgText}`;
}

module.exports = {
  getPlayerRatingByPuzzleId,
  formatPlayerRating,
  formatPlayerRatingShort,
};

