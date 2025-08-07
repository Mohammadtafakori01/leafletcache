import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import morgan from "morgan";
import sharp from "sharp"; // Add sharp for image processing

const app = express();
const PORT = 3016;

// Cache directory
const CACHE_DIR = path.join(process.cwd(), "tile-cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// Jawg Maps access token (replace with your real token)
const ACCESS_TOKEN = "I386DWaILL5kmhLxTaogYBl9mFQR3TzqHSCmzfNtPCGqEC6c08ZIC1WURPiXzFZ8";

// Middleware: logging
app.use(morgan("dev"));

// Serve cached tiles or fetch from Jawg Maps
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

    const buffer = await response.buffer();

    // Process the image to shift green tones to blue using sharp
    const processedBuffer = await sharp(buffer)
      .modulate({
        hue: 180, // Shift hues toward blue (hue rotation by 180 degrees)
        saturation: 1.2, // Slightly increase saturation for vibrancy
        brightness: 1, // Maintain brightness
      })
      .toBuffer();

    // Save the processed image to cache
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