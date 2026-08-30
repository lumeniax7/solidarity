import { describe, expect, it } from "vitest";
import { calculateAllocations, computeSituation } from "./family";
import type { Member } from "../drizzle/schema";

const member = (joinedAt = new Date("2026-01-15T00:00:00.000Z")) => ({
  id: 7,
  fullName: "Jean Test",
  phone: null,
  email: null,
  joinedAt,
  isActive: 1,
  notes: null,
  createdAt: joinedAt,
  updatedAt: joinedAt,
}) as Member;
const allocation = (monthKey: string, amount: number) => ({ id: Math.random(), paymentTransactionId: 1, memberId: 7, monthKey, amount, createdAt: new Date() });

describe("Caisse Familiale allocation rules", () => {
  it("covers one month with a normal payment", () => {
    const result = calculateAllocations(member(), [], 1000, 1000, "2026-01");
    expect(result.allocation).toEqual([{ monthKey: "2026-01", amount: 1000 }]);
  });

  it("allocates a five-month advance across future months", () => {
    const result = calculateAllocations(member(), [], 5000, 1000, "2026-01");
    expect(result.allocation.map((item) => item.monthKey)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]);
  });

  it("fills the oldest unpaid months before current and future months", () => {
    const existing = [allocation("2026-01", 1000), allocation("2026-02", 0)];
    const result = calculateAllocations(member(), existing, 3000, 1000, "2026-03");
    expect(result.allocation.map((item) => item.monthKey)).toEqual(["2026-02", "2026-03", "2026-04"]);
  });

  it("keeps partial payments and computes the remaining arrears", () => {
    const situation = computeSituation(member(), [allocation("2026-01", 500)], 1000, "2026-01");
    expect(situation.paidAmount).toBe(500);
    expect(situation.partialMonths).toBe(1);
    expect(situation.dueAmount).toBe(500);
    expect(situation.status).toBe("RETARD");
  });
});
