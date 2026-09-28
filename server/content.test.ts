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

  it("requires authentication to upload a file", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.content.upload({ fileName: "foto.jpg", contentType: "image/jpeg", dataBase64: "ZmFrZQ==" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires authentication to record a link opening", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.content.recordOpen({ id: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns no data for an invalid public share token", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.share.public({ token: "token-no-existe-123" })).resolves.toBeNull();
  });

  it("requires authentication to manage publication profiles", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.profiles.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires authentication to publish to Instagram", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.instagram.publish({ contentId: 1, mediaType: "IMAGE" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
