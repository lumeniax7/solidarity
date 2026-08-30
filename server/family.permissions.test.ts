import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function memberContext(): TrpcContext {
  return {
    user: { id: 2, openId: "member", name: "Member", email: "member@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Caisse Familiale permissions", () => {
  it("rejects a MEMBER attempting to create a member", async () => {
    const caller = appRouter.createCaller(memberContext());
    await expect(caller.family.addMember({ fullName: "Should Fail" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
