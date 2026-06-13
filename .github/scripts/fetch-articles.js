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

    const imgM = block.match(/src="\/images\/articles\/[^/]+\/([^"]+\.webp)"/);
    const defaultImg = slug + "-hero-lg.webp";
    const imageFile = imgM ? imgM[1] : defaultImg;

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

    const article = { title, slug, category, readTime, date, author };
    if (imageFile !== defaultImg) article.image = imageFile;

    articles.push(article);
  }

  return articles.slice(0, 5);
}

async function main() {
  console.log("Fetching articles page...");
  const html = await get("https://ai-checker.webcoda.com.au/articles");
  const articles = parseArticles(html);

  if (!articles.length) {
    throw new Error("Parsed 0 articles — aborting to avoid wiping the file");
  }

  // Preserve manually-set image overrides from existing articles.json
  const outPath = path.join(__dirname, "../../articles.json");
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    const imageMap = {};
    existing.forEach(function(a) { if (a.image) imageMap[a.slug] = a.image; });
    articles.forEach(function(a) { if (!a.image && imageMap[a.slug]) a.image = imageMap[a.slug]; });
  } catch (e) { /* no existing file, skip */ }

  console.log(`Found ${articles.length} articles`);

  fs.writeFileSync(outPath, JSON.stringify(articles, null, 2) + "\n", "utf8");
  console.log("articles.json updated");
}

main().catch((err) => { console.error(err); process.exit(1); });
