import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb, getMonthlyContribution } from "./db";
import {
  addMonths,
  getSnapshot,
  monthKey,
  monthLabel,
  previewPayment,
  recordPayment,
  deleteWithdrawal,
} from "./family";
import { announcements, auditLogs, cashTransactions, members, notifications, settings, users, withdrawals } from "../drizzle/schema";
import { and, desc, eq } from "drizzle-orm";

const positiveInt = z.number().int().positive();
const dateInput = z.string().min(1).transform((value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Date invalide." });
  return date;
});
const monthInput = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide.");

function ensureDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de données indisponible." });
  return db;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  family: router({
    snapshot: protectedProcedure.input(z.object({ asOf: monthInput.optional() }).optional()).query(({ input }) => getSnapshot(input?.asOf ?? monthKey(new Date()))),
    previewPayment: protectedProcedure.input(z.object({ memberId: positiveInt, amount: positiveInt, paymentDate: dateInput })).query(({ input }) => previewPayment(input.memberId, input.amount, input.paymentDate)),
    addMember: adminProcedure.input(z.object({ fullName: z.string().min(2).max(160), phone: z.string().max(40).optional(), email: z.string().email().optional(), joinedAt: dateInput.optional(), notes: z.string().max(2000).optional() })).mutation(async ({ input, ctx }) => {
      const db = ensureDb(await getDb());
      return db.transaction(async (tx) => {
        const result: any = await tx.insert(members).values({ fullName: input.fullName, phone: input.phone ?? null, email: input.email ?? null, joinedAt: input.joinedAt ?? new Date(), notes: input.notes ?? null, isActive: 1 });
        const id = Number(result.insertId);
        await tx.insert(auditLogs).values({ action: "CREATE", entityType: "member", entityId: id, userId: ctx.user.id, oldValue: null, newValue: JSON.stringify(input) });
        return { id };
      });
    }),
    updateMember: adminProcedure.input(z.object({ id: positiveInt, fullName: z.string().min(2).max(160), phone: z.string().max(40).optional(), email: z.string().email().optional(), joinedAt: dateInput, notes: z.string().max(2000).optional(), isActive: z.boolean() })).mutation(async ({ input, ctx }) => {
      const db = ensureDb(await getDb());
      const [old] = await db.select().from(members).where(eq(members.id, input.id)).limit(1);
      if (!old) throw new TRPCError({ code: "NOT_FOUND", message: "Membre introuvable." });
      await db.transaction(async (tx) => {
        await tx.update(members).set({ fullName: input.fullName, phone: input.phone ?? null, email: input.email ?? null, joinedAt: input.joinedAt, notes: input.notes ?? null, isActive: input.isActive ? 1 : 0 }).where(eq(members.id, input.id));
        await tx.insert(auditLogs).values({ action: "UPDATE", entityType: "member", entityId: input.id, userId: ctx.user.id, oldValue: JSON.stringify(old), newValue: JSON.stringify(input) });
      });
      return { success: true };
    }),
    recordPayment: adminProcedure.input(z.object({ memberId: positiveInt, amount: positiveInt, paymentDate: dateInput, paymentMethod: z.string().min(2).max(40), reference: z.string().max(120).optional(), observation: z.string().max(2000).optional(), forcedMonth: monthInput.optional() })).mutation(({ input, ctx }) => recordPayment({ ...input, recordedBy: ctx.user.id })),
    recordGroupPayments: adminProcedure.input(z.object({ month: monthInput, memberIds: z.array(positiveInt).min(1), paymentDate: dateInput, paymentMethod: z.string().min(2).max(40) })).mutation(async ({ input, ctx }) => {
      const db = ensureDb(await getDb());
      const contribution = await getMonthlyContribution(db);
      const results = [];
      for (const memberId of input.memberIds) {
        results.push(await recordPayment({ memberId, amount: contribution, paymentDate: input.paymentDate, paymentMethod: input.paymentMethod, recordedBy: ctx.user.id, forcedMonth: input.month }));
      }
      return { count: results.length, results };
    }),
    createWithdrawal: adminProcedure.input(z.object({ withdrawalDate: dateInput, amount: positiveInt, category: z.enum(["SANTE", "URGENCE", "DECES", "EDUCATION", "EVENEMENT_FAMILIAL", "AIDE_FAMILIALE", "DEPLACEMENT", "AUTRE"]), beneficiary: z.string().max(160).optional(), motif: z.string().min(2).max(255), description: z.string().max(2000).optional(), paymentMethod: z.string().min(2).max(40), reference: z.string().max(120).optional(), observation: z.string().max(2000).optional() })).mutation(async ({ input, ctx }) => {
      const db = ensureDb(await getDb());
      const rows = await db.select().from(cashTransactions);
      const balance = rows.reduce((sum, row) => sum + (row.direction === "IN" ? row.amount : -row.amount), 0);
      if (input.amount > balance) throw new TRPCError({ code: "BAD_REQUEST", message: "Le solde disponible est insuffisant pour cette sortie." });
      return db.transaction(async (tx) => {
        const result: any = await tx.insert(withdrawals).values({ ...input, beneficiary: input.beneficiary ?? null, description: input.description ?? null, reference: input.reference ?? null, observation: input.observation ?? null, createdBy: ctx.user.id });
        const id = Number(result.insertId);
        await tx.insert(cashTransactions).values({ direction: "OUT", sourceType: "WITHDRAWAL", sourceId: id, amount: input.amount, transactionDate: input.withdrawalDate, description: input.motif, createdBy: ctx.user.id });
        await tx.insert(auditLogs).values({ action: "WITHDRAWAL", entityType: "withdrawal", entityId: id, userId: ctx.user.id, oldValue: null, newValue: JSON.stringify(input) });
        return { id };
      });
    }),
    deleteWithdrawal: adminProcedure.input(z.object({ id: positiveInt })).mutation(({ input, ctx }) => deleteWithdrawal(input.id, ctx.user.id)),
    createAnnouncement: adminProcedure.input(z.object({ title: z.string().min(2).max(180), body: z.string().min(2).max(5000) })).mutation(async ({ input, ctx }) => {
      const db = ensureDb(await getDb());
      const result: any = await db.insert(announcements).values({ ...input, createdBy: ctx.user.id });
      await db.insert(auditLogs).values({ action: "CREATE", entityType: "announcement", entityId: Number(result.insertId), userId: ctx.user.id, oldValue: null, newValue: JSON.stringify(input) });
      return { id: Number(result.insertId) };
    }),
    updateContribution: adminProcedure.input(z.object({ amount: positiveInt })).mutation(async ({ input, ctx }) => {
      const db = ensureDb(await getDb());
      const [existing] = await db.select().from(settings).where(eq(settings.settingKey, "monthly_contribution")).limit(1);
      if (existing) await db.update(settings).set({ value: String(input.amount), updatedBy: ctx.user.id }).where(eq(settings.id, existing.id));
      else await db.insert(settings).values({ settingKey: "monthly_contribution", value: String(input.amount), updatedBy: ctx.user.id });
      await db.insert(auditLogs).values({ action: "UPDATE", entityType: "setting", entityId: existing?.id ?? null, userId: ctx.user.id, oldValue: existing?.value ?? null, newValue: String(input.amount) });
      return { amount: input.amount };
    }),
    markNotificationRead: protectedProcedure.input(z.object({ id: positiveInt })).mutation(async ({ input, ctx }) => {
      const db = ensureDb(await getDb());
      await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { success: true };
    }),
    users: adminProcedure.query(async () => {
      const db = ensureDb(await getDb());
      return db.select().from(users).orderBy(desc(users.createdAt));
    }),
  }),
});

export type AppRouter = typeof appRouter;
