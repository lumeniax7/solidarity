import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  isActive: int("isActive").default(1).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const paymentTransactions = mysqlTable("payment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  paymentDate: timestamp("paymentDate").notNull(),
  amount: int("amount").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 40 }).default("ESPECES").notNull(),
  reference: varchar("reference", { length: 120 }),
  observation: text("observation"),
  recordedBy: int("recordedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const paymentAllocations = mysqlTable(
  "payment_allocations",
  {
    id: int("id").autoincrement().primaryKey(),
    paymentTransactionId: int("paymentTransactionId").notNull(),
    memberId: int("memberId").notNull(),
    monthKey: varchar("monthKey", { length: 7 }).notNull(),
    amount: int("amount").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    transactionMonthUnique: unique("payment_allocation_transaction_month_unique").on(
      table.paymentTransactionId,
      table.monthKey,
    ),
  }),
);

export const cashTransactions = mysqlTable("cash_transactions", {
  id: int("id").autoincrement().primaryKey(),
  direction: mysqlEnum("direction", ["IN", "OUT"]).notNull(),
  sourceType: varchar("sourceType", { length: 40 }).notNull(),
  sourceId: int("sourceId"),
  amount: int("amount").notNull(),
  transactionDate: timestamp("transactionDate").notNull(),
  description: text("description"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const withdrawals = mysqlTable("withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  withdrawalDate: timestamp("withdrawalDate").notNull(),
  amount: int("amount").notNull(),
  category: mysqlEnum("category", [
    "SANTE",
    "URGENCE",
    "DECES",
    "EDUCATION",
    "EVENEMENT_FAMILIAL",
    "AIDE_FAMILIALE",
    "DEPLACEMENT",
    "AUTRE",
  ]).notNull(),
  beneficiary: varchar("beneficiary", { length: 160 }),
  motif: varchar("motif", { length: 255 }).notNull(),
  description: text("description"),
  paymentMethod: varchar("paymentMethod", { length: 40 }).default("ESPECES").notNull(),
  reference: varchar("reference", { length: 120 }),
  observation: text("observation"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  createdBy: int("createdBy").notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 40 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: int("entityId"),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 80 }).notNull().unique(),
  value: varchar("value", { length: 255 }).notNull(),
  updatedBy: int("updatedBy").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Member = typeof members.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
