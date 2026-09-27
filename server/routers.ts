import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createContentItem, deleteContentItem, listContentItems, updateContentItem } from "./db";

const contentInput = z.object({
  type: z.enum(["image", "video", "note", "link", "publication"]),
  title: z.string().min(1).max(180),
  description: z.string().optional(),
  body: z.string().optional(),
  url: z.string().optional(),
  fileUrl: z.string().optional(),
  category: z.string().max(80).optional(),
  tags: z.string().optional(),
  status: z.enum(["idea", "draft", "ready", "published"]).optional(),
  platform: z.string().max(80).optional(),
  isFavorite: z.boolean().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  content: router({
    list: protectedProcedure.query(({ ctx }) => listContentItems(ctx.user.id)),
    create: protectedProcedure.input(contentInput).mutation(({ ctx, input }) =>
      createContentItem({ ...input, userId: ctx.user.id, category: input.category ?? "Sin organizar", status: input.status ?? "idea", isFavorite: input.isFavorite ?? false })
    ),
    update: protectedProcedure.input(z.object({ id: z.number(), values: contentInput.partial() })).mutation(({ ctx, input }) =>
      updateContentItem(input.id, ctx.user.id, input.values)
    ),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) =>
      deleteContentItem(input.id, ctx.user.id)
    ),
  }),
});

export type AppRouter = typeof appRouter;
