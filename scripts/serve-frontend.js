// Minimal static server for the demo frontend: node scripts/serve-frontend.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "frontend");
const port = process.env.PORT || 5173;
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(root, urlPath === "/" ? "index.html" : urlPath);
    if (!file.startsWith(root) || !fs.existsSync(file)) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Frontend at http://localhost:${port}`));
