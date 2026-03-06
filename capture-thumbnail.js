const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function captureThumbnail(url, outputName) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Wait for main content to load
  await new Promise(r => setTimeout(r, 2000));

  // Find the article heading to start the screenshot from there
  const headingBox = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (h1) {
      const rect = h1.getBoundingClientRect();
      return { x: rect.x, y: rect.y };
    }
    return null;
  });

  const startY = headingBox ? Math.max(0, headingBox.y - 20) : 150;

  const outputPath = path.join(__dirname, 'images', 'thumbnails', outputName + '.png');
  fs.mkdirSync(path.join(__dirname, 'images', 'thumbnails'), { recursive: true });

  await page.screenshot({
    path: outputPath,
    clip: { x: 0, y: startY, width: 800, height: 700 }
  });

  await browser.close();
  console.log('Saved thumbnail to:', outputPath);
  return outputPath;
}

// Run from command line: node capture-thumbnail.js <url> <name>
const [,, url, name] = process.argv;
if (!url || !name) {
  console.log('Usage: node capture-thumbnail.js <article-url> <complaint-id>');
  process.exit(1);
}
captureThumbnail(url, name);
