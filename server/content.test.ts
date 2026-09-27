import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("content procedures", () => {
  it("requires authentication to list private content", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.content.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires authentication to create private content", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.content.create({ type: "note", title: "Idea privada" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
