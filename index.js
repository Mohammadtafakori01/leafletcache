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

// Thunderforest API key (replace with your real key)
const THUNDERFOREST_APIKEY = "0dd82b85e41a44c58057afd7e1a25ed9";

// Middleware: logging
app.use(morgan("dev"));

// Serve cached tiles or fetch from Thunderforest
app.get("/tiles/:z/:x/:y", async (req, res) => {
  const { z, x, y } = req.params;
  const filePath = path.join(CACHE_DIR, z, x);
  const fileName = path.join(filePath, `${y}.png`);

  if (fs.existsSync(fileName)) {
    return res.sendFile(fileName);
  }

  try {
    const url = `https://tile.thunderforest.com/transport/${z}/${x}/${y}.png?apikey=${THUNDERFOREST_APIKEY}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`Tile request failed: ${response.status}`);

    const buffer = await response.buffer();

    // Optional: apply processing (blue tone shift)
    const processedBuffer = await sharp(buffer)
      .modulate({
        hue: 120, // hue shift
        saturation: 1.3,
        brightness: 1,
      })
      .toBuffer();

    // Save to cache
    fs.mkdirSync(filePath, { recursive: true });
    fs.writeFileSync(fileName, processedBuffer);

    res.setHeader("Content-Type", "image/png");
    res.send(processedBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching or processing tile");
  }
});

app.listen(PORT, () => {
  console.log(`Tile cache server running at http://localhost:${PORT}`);
});
