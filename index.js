import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import morgan from "morgan";

const app = express();
const PORT = 3016;

// Cache folder
const CACHE_DIR = path.join(process.cwd(), "tile-cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// Stadia Maps API key
const API_KEY = "c625a4aa-cc16-4753-99db-464a2f2613ce"; // Replace

// Middleware for logging
app.use(morgan("dev"));

// Serve cached tiles
app.get("/tiles/:z/:x/:y", async (req, res) => {
  const { z, x, y } = req.params;
  const filePath = path.join(CACHE_DIR, z, x);
  const fileName = path.join(filePath, `${y}.jpg`);

  // If exists in cache
  if (fs.existsSync(fileName)) {
    return res.sendFile(fileName);
  }

  // Fetch from Stadia Maps
  try {
    const url = `https://tiles.stadiamaps.com/tiles/alidade_satellite/${z}/${x}/${y}.jpg?api_key=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`Tile request failed: ${response.status}`);

    const buffer = await response.buffer();

    // Save to cache
    fs.mkdirSync(filePath, { recursive: true });
    fs.writeFileSync(fileName, buffer);

    res.setHeader("Content-Type", "image/jpeg");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching tile");
  }
});

app.listen(PORT, () => {
  console.log(`Tile cache server running at http://localhost:${PORT}`);
});
