const { program } = require("commander");
const path = require("path");
const fs = require("fs");
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");
const swagerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Сервіс для керування нотатками",
      version: "1.0.0",
    },
  },
  apis: ["./index.js"],
};
const openapiSpecification = swaggerJSDoc(swagerOptions);

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

app.use(express.text());
app.use(express.json());
app.use("/docs", swaggerUI.serve, swaggerUI.setup(openapiSpecification));

/**
 * @swagger
 * /notes/{note_name}:
 *  get:
 *   summary: Отримати нотатку за ім'ям
 *   tags:
 *    - notes
 *   parameters:
 *    - name: note_name
 *      in : path
 *      required: true
 *      schema:
 *        type: string
 *   responses:
 *    '200':
 *      description: Успішна операція
 *      content:
 *        text:
 *         schema:
 *          example: "Hello from text note"
 *    '404':
 *       description: Нотатки не знайдено
 */

app.get("/notes/:name", (req, res) => {
  const filePath = path.join(cache, `${req.params.name}.txt`);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("Not found");
    return;
  }
  res.status(200).send(fs.readFileSync(filePath, "utf8"));
});

/**
 * @swagger
 * /notes/{note_name}:
 *   put:
 *     summary: Змінити текст нотатки
 *     tags:
 *       - notes
 *     parameters:
 *       - name: note_name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Оновити наявну нотатку
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Оновлений текст нотатки"
 *     responses:
 *       '200':
 *         description: Успішна операція
 *       '404':
 *         description: Нотатку не знайдено
 */

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

/**
 * @swagger
 * /notes/{note_name}:
 *   delete:
 *     summary: Видалити нотатку за ім'ям
 *     tags:
 *       - notes
 *     parameters:
 *       - name: note_name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *      '200':
 *        description: Успішна операція
 *      '404':
 *        description: Нотатку не знайдено
 */

app.delete("/notes/:name", (req, res) => {
  const filePath = path.join(cache, `${req.params.name}.txt`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.status(200).send("Deleted successfully");
    return;
  }
  res.status(404).send("Not found");
});

/**
 * @swagger
 * /notes:
 *   get:
 *     tags:
 *       - notes
 *     summary: Отримати всі нотатки
 *     operationId: getNotes
 *     responses:
 *       '200':
 *         description: Успішна операція
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "note1"
 *                   text:
 *                     type: string
 *                     example: "text1"
 *             example:
 *               - name: "note1"
 *                 text: "text1"
 *               - name: "note2"
 *                 text: "text2"
 */

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

/**
 * @swagger
 * /notes/write:
 *   post:
 *     tags:
 *       - notes
 *     summary: Створити нотатку
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               note_name:
 *                 type: string
 *               note:
 *                 type: string
 *       responses:
 *         '201':
 *           description: Успішна операція
 *         '400':
 *           description: Поганий запит
 */

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

/**
 * @swagger
 * /UploadForm.html:
 *   get:
 *     tags:
 *       - forms
 *     summary: Отримати форму для надсилання нової нотатки
 *     responses:
 *       '200':
 *         description: Успішна операція
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */

app.get("/UploadForm.html", (req, res) => {
  res.sendFile(path.join(__dirname, "UploadForm.html"));
});

app.listen(port, host, () => {
  console.log(`Сервер запущений на ${host}:${port}`);
});

// app.listen(3000, "127.0.0.1");
