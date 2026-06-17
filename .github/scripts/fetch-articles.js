"use strict";
const https = require("https");
const fs = require("fs");
const path = require("path");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function parseArticles(html) {
  const articles = [];
  const seen = new Set();

  const linkRe = /<a[^>]+href="\/articles\/([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;

  while ((m = linkRe.exec(html)) !== null) {
    const slug = m[1];
    if (seen.has(slug)) continue;
    seen.add(slug);

    const block = m[2];

    const titleM = block.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/);
    if (!titleM) continue;
    const title = titleM[1].replace(/<[^>]+>/g, "").trim();
    if (!title) continue;

    let category = "";
    const pTags = [...block.matchAll(/<(?:p|span)[^>]*>([\s\S]*?)<\/(?:p|span)>/g)];
    for (const p of pTags) {
      const text = p[1].replace(/<[^>]+>/g, "").trim();
      if (text && !text.includes("|") && !text.includes("min") && text.length < 60) {
        category = text;
        break;
      }
    }

    let author = "", date = "";
    for (const p of pTags) {
      const text = p[1].replace(/<[^>]+>/g, "").trim();
      if (text.includes("|")) {
        const parts = text.split("|");
        author = parts[0].trim();
        date = parts[1].trim();
        break;
      }
    }

    const timeM = block.match(/(\d+)\s*min/);
    const readTime = timeM ? timeM[1] + " min" : "";

    articles.push({ title, slug, category, readTime, date, author });
  }

  return articles.slice(0, 5);
}

// Fetch each article's own page to extract the hero image path
async function enrichWithImages(articles) {
  for (const article of articles) {
    try {
      const html = await get("https://ai-checker.webcoda.com.au/articles/" + article.slug);
      // Look for og:image or the hero <img> src
      const ogM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
      if (ogM) {
        // Convert absolute URL to path if on same domain
        const url = ogM[1];
        const pathOnly = url.replace(/^https?:\/\/[^/]+/, "");
        article.image = pathOnly;
        continue;
      }
      // Fallback: first .webp img src in the page
      const imgM = html.match(/src="(\/images\/articles\/[^"]+\.webp)"/);
      if (imgM) article.image = imgM[1];
    } catch (e) {
      console.warn("Could not fetch article page for " + article.slug + ": " + e.message);
    }
  }
  return articles;
}

async function main() {
  console.log("Fetching articles listing...");
  const html = await get("https://ai-checker.webcoda.com.au/articles");
  const articles = parseArticles(html);

  if (!articles.length) {
    throw new Error("Parsed 0 articles — aborting to avoid wiping the file");
  }

  console.log("Found " + articles.length + " articles, fetching image paths...");
  await enrichWithImages(articles);

  const outPath = path.join(__dirname, "../../articles.json");
  fs.writeFileSync(outPath, JSON.stringify(articles, null, 2) + "\n", "utf8");
  console.log("articles.json updated");
}

main().catch((err) => { console.error(err); process.exit(1); });
