import { URL } from 'url';
import puppeteer from 'puppeteer';
import HttpServer from './HttpServer.mjs';

const defaultViewport = {
    // Using a 16:9 ratio here by default to match Twitter's image card dimensions
    width: 1200,
    height: 675,
    deviceScaleFactor: 2,
};

export async function captureScreenshot(path, options = {}) {
  const httpServer = new HttpServer;
  await httpServer.start();

  // Launch a new Chrome instance
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox', // Allow running as root inside the Docker container
    ],
    // headless: false, // For testing
  });

  // Create a new page and set the viewport
  const page = await browser.newPage();
  const viewport = { ...defaultViewport, ...options.viewport };
  await page.setViewport(viewport);

  // Navigate to the URL
  let url = new URL(`http://localhost:${httpServer.port}/screenshots/`);
  url.hash = path;
  await page.goto(url, {
      waitUntil: 'networkidle0', // Wait until the network is idle
  });

  // Take the screenshot
  let result = await page.screenshot();

  // Close the browser and HTTP server
  await browser.close();
  await httpServer.stop();

  return result;
}
