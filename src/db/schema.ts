import {
    pgTable, uuid, varchar, text, boolean, timestamp
} from "drizzle-orm/pg-core";

export const todos = pgTable("todos", {
    id: uuid("id").defaultRandom().primaryKey(),
    task: varchar("task", { length: 255 }).notNull(),
    description: text("description"),
    dueData: timestamp("due_date"),
    isDone: boolean("is_done").default(false),
    doneAt: timestamp("done_at"),
    creatAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("update_at").defaultNow(),
});