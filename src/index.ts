import "dotenv/config";

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { randomUUID } from "crypto";
import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";

import { db, todos } from "./db";
import { errorHandler, logger as pino } from "./utils";
import { eq } from "drizzle-orm";
import pinoHttp from "pino-http";

const logger = pinoHttp({
    logger: pino,
    genReqId: function (req: Request, res: Response){
        const existingId = req.id ?? req.headers["x-request-id"];

        if(existingId){
            return existingId;
        }

        const id = randomUUID();
        res.setHeader("x-request-id", id);

        return id;
    },
});
const app = express();
app.use(bodyParser.json());
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(logger);

app.get("/", (req: Request, res: Response) => {
    res.send("hello world!")
})

app.get("/healthcheck", (req: Request, res: Response) => {
    try {
        res.status(200).send("OK");
    } catch (error) {
        res.status(500).send();
    }
});

app.get("/api/v1/todos", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = Number(req.query.limit) ?? 10;
        const result = await db.select({
            id: todos.id,
            task: todos.task,
            description: todos.description,
            isDone: todos.isDone
        }).from(todos).limit(limit >= 1 && limit <= 50 ? limit : 10);
        req.log.info({ result });
        res.json(result)
    } catch (error) {
        next(error)
    }
});

app.get("/api/v1/todos/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await db.select().from(todos).where(eq(todos.id, req.params.id));
        req.log.info({ result });
        res.status(result.length == 1 ? 200 : 404 ).json(result)
    } catch (error) {
        next(error)
    }
});

app.post("/api/v1/todos", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await db.insert(todos).values({
            id: randomUUID(),
            task: req.body.task,
            description: req.body.description,
            ...(req.body.dueDate && { dueDate: new Date(req.body.dueDate) })
        }).returning();
        req.log.info({ result });
        res.status(201).json(result)
    } catch (error) {
        next(error)
    }
});

app.patch("/api/v1/todos/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const today = new Date();
        const result = await db.update(todos).set({
            isDone: req.body.isDone,
            doneAt: today,
            updatedAt: today,
        }).where(eq(todos.id, req.params.id))
        req.log.info({ result });
        res.json(result)
    } catch (error) {
        next(error)
    }
});

app.delete("/api/v1/todos/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await db.delete(todos).where(eq(todos.id, req.params.id));
        req.log.info({ result });
        res.status(result.rowCount == 1 ? 200 : 404 ).json(result)
    } catch (error) {
        next(error)
    }
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    errorHandler.handle(err, res);
})
const server = createServer(app);

const port = process.env.PORT ?? 8080;
server.listen(port, () => {
    pino.info(`Server is running on port ${port}`);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error({ promise, reason }, "Unhandled Rejection")
});

process.on("uncaughtException", (error) => {
    console.error({ error }, "Uncaught Exception");

    server.close(() => {
        console.info("Server closed");
        process.exit(1);
    });

    // If the server hasn't finished in a reasonable time, give it 10 seconds and force exit
    setTimeout(() => process.exit(1), 10000).unref();
})