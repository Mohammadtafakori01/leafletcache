import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import morgan from "morgan";
import sharp from "sharp";

const app = express();
const PORT = 3016;

const CACHE_DIR = path.join(process.cwd(), "tile-cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const ACCESS_TOKEN = "I386DWaILL5kmhLxTaogYBl9mFQR3TzqHSCmzfNtPCGqEC6c08ZIC1WURPiXzFZ8";

app.use(morgan("dev"));

// Check if pixel is greenish
function isGreen(r: number, g: number, b: number) {
  return g > 100 && g > r + 20 && g > b + 20;
}

// Convert greenish pixels to neon blue
async function convertGreenToBlue(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (isGreen(r, g, b)) {
      // Convert to neon blue (light cyan tone)
      data[i] = 0;     // R
      data[i + 1] = 255; // G (optional, for neon look)
      data[i + 2] = 255; // B
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

// Route handler
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
    const processedBuffer = await convertGreenToBlue(originalBuffer);

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
