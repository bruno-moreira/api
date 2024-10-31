"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const crypto_1 = require("crypto");
const body_parser_1 = __importDefault(require("body-parser"));
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const db_1 = require("./db");
const utils_1 = require("./utils");
const drizzle_orm_1 = require("drizzle-orm");
const pino_http_1 = __importDefault(require("pino-http"));
const logger = (0, pino_http_1.default)({
    logger: utils_1.logger,
    genReqId: function (req, res) {
        const existingId = req.id ?? req.headers["x-request-id"];
        if (existingId) {
            return existingId;
        }
        const id = (0, crypto_1.randomUUID)();
        res.setHeader("x-request-id", id);
        return id;
    },
});
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)());
app.use(logger);
app.get("/", (req, res) => {
    res.send("hello world!");
});
app.get("/healthcheck", (req, res) => {
    try {
        res.status(200).send("OK");
    }
    catch (error) {
        res.status(500).send();
    }
});
app.get("/api/v1/todos", async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) ?? 10;
        const result = await db_1.db.select({
            id: db_1.todos.id,
            task: db_1.todos.task,
            description: db_1.todos.description,
            isDone: db_1.todos.isDone
        }).from(db_1.todos).limit(limit >= 1 && limit <= 50 ? limit : 10);
        req.log.info({ result });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
app.get("/api/v1/todos/:id", async (req, res, next) => {
    try {
        const result = await db_1.db.select().from(db_1.todos).where((0, drizzle_orm_1.eq)(db_1.todos.id, req.params.id));
        req.log.info({ result });
        res.status(result.length == 1 ? 200 : 404).json(result);
    }
    catch (error) {
        next(error);
    }
});
app.post("/api/v1/todos", async (req, res, next) => {
    try {
        const result = await db_1.db.insert(db_1.todos).values({
            id: (0, crypto_1.randomUUID)(),
            task: req.body.task,
            description: req.body.description,
            ...(req.body.dueDate && { dueDate: new Date(req.body.dueDate) })
        }).returning();
        req.log.info({ result });
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
});
app.patch("/api/v1/todos/:id", async (req, res, next) => {
    try {
        const today = new Date();
        const result = await db_1.db.update(db_1.todos).set({
            isDone: req.body.isDone,
            doneAt: today,
            updatedAt: today,
        }).where((0, drizzle_orm_1.eq)(db_1.todos.id, req.params.id));
        req.log.info({ result });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
app.delete("/api/v1/todos/:id", async (req, res, next) => {
    try {
        const result = await db_1.db.delete(db_1.todos).where((0, drizzle_orm_1.eq)(db_1.todos.id, req.params.id));
        req.log.info({ result });
        res.status(result.rowCount == 1 ? 200 : 404).json(result);
    }
    catch (error) {
        next(error);
    }
});
app.use((err, req, res, next) => {
    utils_1.errorHandler.handle(err, res);
});
const server = (0, http_1.createServer)(app);
const port = process.env.PORT ?? 8080;
server.listen(port, () => {
    utils_1.logger.info(`Server is running on port ${port}`);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error({ promise, reason }, "Unhandled Rejection");
});
process.on("uncaughtException", (error) => {
    console.error({ error }, "Uncaught Exception");
    server.close(() => {
        console.info("Server closed");
        process.exit(1);
    });
    // If the server hasn't finished in a reasonable time, give it 10 seconds and force exit
    setTimeout(() => process.exit(1), 10000).unref();
});
//# sourceMappingURL=index.js.map