import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  announcements,
  auditLogs,
  cashTransactions,
  members,
  paymentAllocations,
  paymentTransactions,
  settings,
  users,
  withdrawals,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getMonthlyContribution(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const rows = await db.select().from(settings).where(eq(settings.settingKey, "monthly_contribution")).limit(1);
  return Number(rows[0]?.value ?? 1000);
}

export async function getFamilyRows(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const [memberRows, paymentRows, allocationRows, cashRows, withdrawalRows, announcementRows, auditRows] = await Promise.all([
    db.select().from(members).orderBy(members.fullName),
    db.select({ payment: paymentTransactions, memberName: members.fullName }).from(paymentTransactions).leftJoin(members, eq(paymentTransactions.memberId, members.id)).orderBy(desc(paymentTransactions.paymentDate)),
    db.select().from(paymentAllocations),
    db.select().from(cashTransactions).orderBy(desc(cashTransactions.transactionDate)),
    db.select().from(withdrawals).orderBy(desc(withdrawals.withdrawalDate)),
    db.select().from(announcements).orderBy(desc(announcements.publishedAt)),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)),
  ]);
  return { memberRows, paymentRows, allocationRows, cashRows, withdrawalRows, announcementRows, auditRows };
}

export { announcements, auditLogs, cashTransactions, members, paymentAllocations, paymentTransactions, settings, withdrawals };
