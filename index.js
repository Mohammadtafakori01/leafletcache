import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import morgan from "morgan";
import sharp from "sharp";

const app = express();
const PORT = 3016;

// Cache directory
const CACHE_DIR = path.join(process.cwd(), "tile-cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// Jawg Maps access token
const ACCESS_TOKEN = "I386DWaILL5kmhLxTaogYBl9mFQR3TzqHSCmzfNtPCGqEC6c08ZIC1WURPiXzFZ8";

// Logging middleware
app.use(morgan("dev"));

// Color replacement config
const TARGET_RGB = [16, 78, 55];     // #104e37
const REPLACE_RGB = [0, 255, 255];   // Neon blue #00ffff

// Replace color function using Sharp
async function replaceColor(buffer) {
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r === TARGET_RGB[0] && g === TARGET_RGB[1] && b === TARGET_RGB[2]) {
      data[i] = REPLACE_RGB[0];
      data[i + 1] = REPLACE_RGB[1];
      data[i + 2] = REPLACE_RGB[2];
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  }).png().toBuffer();
}

// Main tile handler
app.get("/tiles/:z/:x/:y", async (req, res) => {
  const { z, x, y } = req.params;
  const filePath = path.join(CACHE_DIR, z, x);
  const fileName = path.join(filePath, `${y}.png`);

  if (fs.existsSync(fileName)) {
    return res.sendFile(fileName);
  }

  try {
    const url = `https://tile.jawg.io/jawg-matrix/${z}/${x}/${y}.png?access-token=${ACCESS_TOKEN}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`Tile request failed: ${response.status}`);

    const originalBuffer = await response.buffer();

    // Replace target color with neon blue
    const processedBuffer = await replaceColor(originalBuffer);

    fs.mkdirSync(filePath, { recursive: true });
    fs.writeFileSync(fileName, processedBuffer);

    res.setHeader("Content-Type", "image/png");
    res.send(processedBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing tile");
  }
});

app.listen(PORT, () => {
  console.log(`Tile cache server running at http://localhost:${PORT}`);
});
