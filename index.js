const { program } = require("commander");
const path = require("path");
const fs = require("fs");

const express = require("express");
const app = express();

program
  .option("-h, --host <server address>", "server address")
  .option("-p, --port <server port>", "server port number")
  .option("-c, --cache <path>", "path to the directory with cached files");

program.parse(process.argv);
const options = program.opts();
const host = options.host;
const port = options.port;
const cache = options.cache;
// const cache = "./cache";

if (!host) {
  console.error("Please, specify server address (host)");
  process.exit(1);
}
if (!port) {
  console.error("Please, specify server port number");
  process.exit(1);
}
if (!cache) {
  console.error("Please, specify the path to the directory with cached files");
  process.exit(1);
}

if (!fs.existsSync(cache)) {
  fs.mkdirSync(cache);
}
// парсер для текстових запитів
app.use(express.text());
app.use(express.json());

app.get("/notes/:name", (req, res) => {
  const filePath = path.join(cache, `${req.params.name}.txt`);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("Not found");
    return;
  }
  res.status(200).send(fs.readFileSync(filePath, "utf8"));
});

app.put("/notes/:name", (req, res) => {
  const filePath = path.join(cache, `${req.params.name}.txt`);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("Not found");
    return;
  }
  const text = req.body;
  fs.writeFileSync(filePath, text);
  res.status(200).send("File content changed");
});

app.delete("/notes/:name", (req, res) => {
  const filePath = path.join(cache, `${req.params.name}.txt`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.status(200).send("Deleted successfully");
    return;
  }
  res.status(404).send("Not found");
});

app.get("/notes", (req, res) => {
  res.status(200);
  const jsonlist = [];
  const files = fs.readdirSync(cache);
  //   console.log(files, cache);

  files.forEach((file) => {
    jsonlist.push({
      name: file,
      text: fs.readFileSync(`${cache}/${file}`, "utf8"),
    });
  });
  res.send(JSON.stringify(jsonlist));
});

app.post("/write", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    console.log(body);

    const boundary = "--" + req.headers["content-type"].split("boundary=")[1];

    const parts = body.split(boundary).slice(1, -1);

    const noteName = parts[0].split("\r\n\r\n")[1].trim();
    const note = parts[1].split("\r\n\r\n")[1].trim();

    const filePath = path.join(cache, `${noteName}.txt`);
    if (fs.existsSync(filePath)) {
      res.status(400).send("Bad request");
      return;
    }
    fs.writeFileSync(filePath, note);
    res.status(201).send("Created");
  });
});

app.get("/UploadForm.html", (req, res) => {
  res.sendFile(path.join(__dirname, "UploadForm.html"));
});

app.listen(port, host, () => {
  console.log(`Сервер запущений на ${host}:${port}`);
});

// app.listen(3000, "127.0.0.1");
