"use strict";
const https = require("https");
const fs = require("fs");
const path = require("path");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function parseSitemap(xml) {
  const articles = [];
  const re = /<loc>(https:\/\/ai-checker\.webcoda\.com\.au\/articles\/([a-z0-9-]+))<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    articles.push({ slug: m[2], lastmod: m[3] });
  }
  articles.sort((a, b) => b.lastmod.localeCompare(a.lastmod));
  return articles.slice(0, 5);
}

async function fetchArticleDetails(slug) {
  const html = await get("https://ai-checker.webcoda.com.au/articles/" + slug);

  const titleM = html.match(/<meta property="og:title" content="([^"]+)"/) ||
                 html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const title = titleM ? titleM[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim() : slug;

  const dateM = html.match(/<time[^>]*>([^<]+)<\/time>/);
  const date = dateM ? dateM[1].trim() : "";

  const authorM = html.match(/"author"\s*:\s*\{"@type"\s*:\s*"Person"\s*,\s*"name"\s*:\s*"([^"]+)"/) ||
                  html.match(/"author"\s*:\s*\[\{"@type"\s*:\s*"Person"\s*,\s*"name"\s*:\s*"([^"]+)"/);
  const author = authorM ? authorM[1].trim() : "";

  const rtM = html.match(/aria-label="Reading time:\s*([^"]+)"/);
  const readTime = rtM ? rtM[1].trim() : "";

  const catM = html.match(/<meta name="category" content="([^"]+)"/);
  const category = catM ? catM[1].split(",")[0].trim() : "";

  const imgM = html.match(new RegExp('src="(/images/articles/' + slug + '/[^"]+\\.(?:webp|png|jpg))"'));
  const image = imgM ? imgM[1] : undefined;

  const article = { title, slug, category, readTime, date, author };
  if (image) article.image = image;
  return article;
}

async function main() {
  console.log("Fetching sitemap...");
  const xml = await get("https://ai-checker.webcoda.com.au/sitemap.xml");
  const top5 = parseSitemap(xml);

  if (!top5.length) {
    throw new Error("Parsed 0 articles from sitemap — aborting to avoid wiping the file");
  }

  console.log("Top 5 by lastmod:", top5.map(a => a.slug + " (" + a.lastmod + ")").join(", "));
  console.log("Fetching article details...");

  const articles = [];
  for (const { slug } of top5) {
    try {
      const details = await fetchArticleDetails(slug);
      articles.push(details);
      console.log("  ✓", slug);
    } catch (e) {
      console.warn("  ✗ Could not fetch " + slug + ": " + e.message);
    }
  }

  if (!articles.length) {
    throw new Error("Fetched 0 article details — aborting to avoid wiping the file");
  }

  const outPath = path.join(__dirname, "../../articles.json");
  fs.writeFileSync(outPath, JSON.stringify(articles, null, 2) + "\n", "utf8");
  console.log("articles.json updated with " + articles.length + " articles");
}

main().catch((err) => { console.error(err); process.exit(1); });
