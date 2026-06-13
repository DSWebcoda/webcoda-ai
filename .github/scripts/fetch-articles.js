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

function getImageFromArticlePage(slug) {
  return get("https://ai-checker.webcoda.com.au/articles/" + slug).then(function(html) {
    const m = html.match(/src="\/images\/articles\/[^/]+\/([^"]+\.webp)"/);
    return m ? m[1] : null;
  }).catch(function() { return null; });
}

async function main() {
  console.log("Fetching articles page...");
  const html = await get("https://ai-checker.webcoda.com.au/articles");
  const articles = parseArticles(html);

  if (!articles.length) {
    throw new Error("Parsed 0 articles — aborting to avoid wiping the file");
  }

  // Fetch each article page in parallel to get the exact image filename
  console.log("Fetching article pages for image filenames...");
  const images = await Promise.all(articles.map(function(a) { return getImageFromArticlePage(a.slug); }));
  articles.forEach(function(a, i) {
    const imgFile = images[i];
    const defaultImg = a.slug + "-hero-lg.webp";
    if (imgFile && imgFile !== defaultImg) a.image = imgFile;
  });

  console.log("Found " + articles.length + " articles");

  const outPath = path.join(__dirname, "../../articles.json");
  fs.writeFileSync(outPath, JSON.stringify(articles, null, 2) + "\n", "utf8");
  console.log("articles.json updated");
}

main().catch((err) => { console.error(err); process.exit(1); });
