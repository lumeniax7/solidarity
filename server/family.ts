import { and, desc, eq, inArray } from "drizzle-orm";
import {
  announcements,
  auditLogs,
  cashTransactions,
  members,
  paymentAllocations,
  paymentTransactions,
  settings,
  withdrawals,
} from "../drizzle/schema";
import { getDb, getFamilyRows, getMonthlyContribution } from "./db";
import { TRPCError } from "@trpc/server";

export type MemberSituation = {
  memberId: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  joinedAt: Date;
  paidAmount: number;
  dueAmount: number;
  paidMonths: number;
  lateMonths: number;
  advanceMonths: number;
  partialMonths: number;
  upToMonth: string | null;
  status: "A_JOUR" | "RETARD" | "AVANCE";
};

export function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(key: string, amount: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return monthKey(date);
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

function monthRange(start: string, end: string) {
  const result: string[] = [];
  let cursor = start;
  while (cursor <= end && result.length < 240) {
    result.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return result;
}

function paidMap(memberId: number, allocations: Array<typeof paymentAllocations.$inferSelect>) {
  const map = new Map<string, number>();
  for (const allocation of allocations) {
    if (allocation.memberId === memberId) map.set(allocation.monthKey, (map.get(allocation.monthKey) ?? 0) + allocation.amount);
  }
  return map;
}

export function computeSituation(
  member: typeof members.$inferSelect,
  allocations: Array<typeof paymentAllocations.$inferSelect>,
  contribution: number,
  asOf: string,
): MemberSituation {
  const start = monthKey(member.joinedAt);
  const dueMonths = start <= asOf ? monthRange(start, asOf) : [];
  const map = paidMap(member.id, allocations);
  let dueAmount = 0;
  let lateMonths = 0;
  let paidMonths = 0;
  let partialMonths = 0;
  for (const key of dueMonths) {
    const paid = map.get(key) ?? 0;
    if (paid >= contribution) paidMonths += 1;
    else if (paid > 0) partialMonths += 1;
    if (paid < contribution) {
      dueAmount += contribution - paid;
      lateMonths += 1;
    }
  }
  const futureMonths = Array.from(map.entries()).filter(([key, amount]) => key > asOf && amount >= contribution);
  const fullMonths = Array.from(map.entries()).filter(([, amount]) => amount >= contribution);
  const paidAmount = Array.from(map.values()).reduce((sum, amount) => sum + amount, 0);
  const upToMonth = fullMonths.sort(([a], [b]) => a.localeCompare(b)).at(-1)?.[0] ?? null;
  return {
    memberId: member.id,
    fullName: member.fullName,
    phone: member.phone,
    email: member.email,
    isActive: Boolean(member.isActive),
    joinedAt: member.joinedAt,
    paidAmount,
    dueAmount,
    paidMonths,
    lateMonths,
    advanceMonths: futureMonths.length,
    partialMonths,
    upToMonth,
    status: dueAmount > 0 ? "RETARD" : futureMonths.length > 0 ? "AVANCE" : "A_JOUR",
  };
}

function getExistingPaid(allocations: Array<typeof paymentAllocations.$inferSelect>, memberId: number, key: string) {
  return allocations.filter((item) => item.memberId === memberId && item.monthKey === key).reduce((sum, item) => sum + item.amount, 0);
}

export function calculateAllocations(
  member: typeof members.$inferSelect,
  existingAllocations: Array<typeof paymentAllocations.$inferSelect>,
  amount: number,
  contribution: number,
  asOf: string,
  forcedMonth?: string,
) {
  if (!Number.isInteger(amount) || amount <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Le montant doit être un entier positif." });
  const allocation: Array<{ monthKey: string; amount: number }> = [];
  let remaining = amount;
  const start = monthKey(member.joinedAt);
  const candidates = forcedMonth
    ? [forcedMonth]
    : [...monthRange(start, asOf), ...Array.from({ length: 120 }, (_, index) => addMonths(asOf, index + 1))];
  for (const key of candidates) {
    if (remaining <= 0) break;
    const alreadyPaid = getExistingPaid(existingAllocations, member.id, key);
    const capacity = Math.max(contribution - alreadyPaid, 0);
    if (capacity === 0) continue;
    const applied = Math.min(capacity, remaining);
    allocation.push({ monthKey: key, amount: applied });
    remaining -= applied;
  }
  if (remaining > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Impossible d'affecter le montant aux échéances disponibles." });
  }
  return { allocation, remainder: remaining };
}

function serialize(value: unknown) {
  return JSON.stringify(value, (_key, item) => (item instanceof Date ? item.toISOString() : item));
}

async function writeAudit(tx: any, userId: number, action: string, entityType: string, entityId: number | null, newValue: unknown, oldValue?: unknown) {
  await tx.insert(auditLogs).values({
    action,
    entityType,
    entityId,
    userId,
    oldValue: oldValue === undefined ? null : serialize(oldValue),
    newValue: newValue === undefined ? null : serialize(newValue),
  });
}

export async function getSnapshot(asOf = monthKey(new Date())) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de données indisponible." });
  const contribution = await getMonthlyContribution(db);
  const { memberRows, paymentRows, allocationRows, cashRows, withdrawalRows, announcementRows, auditRows } = await getFamilyRows(db);
  const situations = memberRows.map((member) => computeSituation(member, allocationRows, contribution, asOf));
  const active = situations.filter((item) => item.isActive);
  const monthAllocations = allocationRows.filter((item) => item.monthKey === asOf);
  const paidMemberIds = new Set(monthAllocations.filter((item) => item.amount >= contribution).map((item) => item.memberId));
  const totalIn = cashRows.filter((item) => item.direction === "IN").reduce((sum, item) => sum + item.amount, 0);
  const totalOut = cashRows.filter((item) => item.direction === "OUT").reduce((sum, item) => sum + item.amount, 0);
  const monthPayments = paymentRows.filter(({ payment }) => monthKey(payment.paymentDate) === asOf);
  return {
    asOf,
    asOfLabel: monthLabel(asOf),
    contribution,
    members: situations,
    payments: paymentRows.slice(0, 40).map(({ payment, memberName }) => ({ ...payment, memberName: memberName ?? "Membre supprimé" })),
    allocations: allocationRows,
    withdrawals: withdrawalRows.slice(0, 40),
    announcements: announcementRows.slice(0, 12),
    auditLogs: auditRows.slice(0, 80),
    summary: {
      totalMembers: memberRows.length,
      activeMembers: active.length,
      inactiveMembers: memberRows.length - active.length,
      expectedThisMonth: active.length * contribution,
      collectedThisMonth: monthPayments.reduce((sum, { payment }) => sum + payment.amount, 0),
      paidMembersThisMonth: paidMemberIds.size,
      unpaidMembersThisMonth: Math.max(active.length - paidMemberIds.size, 0),
      arrears: active.reduce((sum, item) => sum + item.dueAmount, 0),
      advances: active.reduce((sum, item) => sum + item.advanceMonths * contribution, 0),
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      lateMembers: active.filter((item) => item.status === "RETARD").length,
      upToDateMembers: active.filter((item) => item.status === "A_JOUR").length,
      membersWithAdvance: active.filter((item) => item.advanceMonths > 0).length,
    },
  };
}

export async function previewPayment(memberId: number, amount: number, paymentDate: Date) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de données indisponible." });
  const contribution = await getMonthlyContribution(db);
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Membre introuvable." });
  const existing = await db.select().from(paymentAllocations).where(eq(paymentAllocations.memberId, memberId));
  const result = calculateAllocations(member, existing, amount, contribution, monthKey(paymentDate));
  return { ...result, memberName: member.fullName, contribution, asOf: monthKey(paymentDate), labels: result.allocation.map((item) => ({ ...item, label: monthLabel(item.monthKey) })) };
}

export async function recordPayment(input: {
  memberId: number;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  reference?: string;
  observation?: string;
  recordedBy: number;
  forcedMonth?: string;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de données indisponible." });
  const contribution = await getMonthlyContribution(db);
  const [member] = await db.select().from(members).where(eq(members.id, input.memberId)).limit(1);
  if (!member || !member.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Ce membre est inactif ou introuvable." });
  const existing = await db.select().from(paymentAllocations).where(eq(paymentAllocations.memberId, input.memberId));
  const plan = calculateAllocations(member, existing, input.amount, contribution, monthKey(input.paymentDate), input.forcedMonth);
  if (input.forcedMonth && getExistingPaid(existing, input.memberId, input.forcedMonth) > 0) {
    throw new TRPCError({ code: "CONFLICT", message: "Cette échéance possède déjà un paiement." });
  }
  return db.transaction(async (tx) => {
    const inserted: any = await tx.insert(paymentTransactions).values({
      memberId: input.memberId,
      paymentDate: input.paymentDate,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      reference: input.reference ?? null,
      observation: input.observation ?? null,
      recordedBy: input.recordedBy,
    });
    const paymentId = Number(inserted.insertId);
    for (const item of plan.allocation) {
      await tx.insert(paymentAllocations).values({ paymentTransactionId: paymentId, memberId: input.memberId, monthKey: item.monthKey, amount: item.amount });
    }
    await tx.insert(cashTransactions).values({
      direction: "IN",
      sourceType: "PAYMENT",
      sourceId: paymentId,
      amount: input.amount,
      transactionDate: input.paymentDate,
      description: `Cotisation de ${member.fullName}`,
      createdBy: input.recordedBy,
    });
    await writeAudit(tx, input.recordedBy, "PAYMENT", "payment_transaction", paymentId, { memberId: input.memberId, amount: input.amount, allocations: plan.allocation });
    return { paymentId, allocation: plan.allocation, memberName: member.fullName };
  });
}

export async function deleteWithdrawal(withdrawalId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de données indisponible." });
  const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId)).limit(1);
  if (!withdrawal) throw new TRPCError({ code: "NOT_FOUND", message: "Sortie introuvable." });
  await db.transaction(async (tx) => {
    await tx.delete(cashTransactions).where(and(eq(cashTransactions.sourceType, "WITHDRAWAL"), eq(cashTransactions.sourceId, withdrawalId)));
    await tx.delete(withdrawals).where(eq(withdrawals.id, withdrawalId));
    await writeAudit(tx, userId, "DELETE", "withdrawal", withdrawalId, null, withdrawal);
  });
  return { success: true };
}

export { announcements, auditLogs, cashTransactions, members, paymentAllocations, paymentTransactions, settings, withdrawals };
