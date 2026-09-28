import { COOKIE_NAME } from "@shared/const";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createContentItem, createPublicationProfile, createShareLink, deactivateShareLink, deleteContentItem, deletePublicationProfile, getContentItem, getSharedContent, recordContentOpen, getShareLinkByToken, listContentItems, listPublicationProfiles, listShareLinks, updateContentItem, updatePublicationProfile } from "./db";
import { storagePut } from "./storage";
import { instagramConfigStatus, publishToInstagram } from "./instagram";

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
  profileId: z.number().optional(),
  isFavorite: z.boolean().optional(),
  scheduledAt: z.string().optional(),
});

const toDate = (value?: string) => value ? new Date(value) : null;

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
    create: protectedProcedure.input(contentInput).mutation(({ ctx, input }) => {
      const { scheduledAt, ...rest } = input;
      return createContentItem({ ...rest, userId: ctx.user.id, category: input.category ?? "Sin organizar", status: input.status ?? "idea", isFavorite: input.isFavorite ?? false, scheduledAt: toDate(scheduledAt) });
    }),
    upload: protectedProcedure.input(z.object({ fileName: z.string().min(1).max(180), contentType: z.string().regex(/^(image|video)\//), dataBase64: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.dataBase64, "base64");
      if (buffer.byteLength > 45 * 1024 * 1024) throw new Error("El archivo supera el límite de 45 MB");
      const stored = await storagePut(`${ctx.user.id}-uploads/${input.fileName}`, buffer, input.contentType);
      const type = input.contentType.startsWith("video/") ? "video" : "image";
      return createContentItem({ userId: ctx.user.id, type, title: input.fileName, fileUrl: stored.url, category: "Sin organizar", status: "idea", isFavorite: false });
    }),
    update: protectedProcedure.input(z.object({ id: z.number(), values: contentInput.partial() })).mutation(({ ctx, input }) => {
      const { scheduledAt, ...rest } = input.values;
      return updateContentItem(input.id, ctx.user.id, { ...rest, ...(scheduledAt !== undefined ? { scheduledAt: toDate(scheduledAt) } : {}) });
    }),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deleteContentItem(input.id, ctx.user.id)),
    recordOpen: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => recordContentOpen(input.id, ctx.user.id)),
  }),
  profiles: router({
    list: protectedProcedure.query(({ ctx }) => listPublicationProfiles(ctx.user.id)),
    create: protectedProcedure.input(z.object({ name: z.string().min(1).max(100), contentType: z.enum(["image", "video", "publication", "all"]).default("all"), platform: z.string().max(80).default("Instagram"), tone: z.string().max(80).optional(), captionTemplate: z.string().optional(), hashtags: z.string().optional(), videoQuality: z.enum(["original", "1080p", "720p", "480p"]).default("1080p"), isDefault: z.boolean().default(false) })).mutation(({ ctx, input }) => createPublicationProfile({ ...input, userId: ctx.user.id })),
    update: protectedProcedure.input(z.object({ id: z.number(), values: z.object({ name: z.string().min(1).max(100).optional(), contentType: z.enum(["image", "video", "publication", "all"]).optional(), platform: z.string().max(80).optional(), tone: z.string().max(80).optional(), captionTemplate: z.string().optional(), hashtags: z.string().optional(), videoQuality: z.enum(["original", "1080p", "720p", "480p"]).optional(), isDefault: z.boolean().optional() }) })).mutation(({ ctx, input }) => updatePublicationProfile(input.id, ctx.user.id, input.values)),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deletePublicationProfile(input.id, ctx.user.id)),
  }),
  instagram: router({
    status: protectedProcedure.query(() => instagramConfigStatus()),
    publish: protectedProcedure.input(z.object({ contentId: z.number(), caption: z.string().max(2200).optional(), mediaType: z.enum(["IMAGE", "REELS"]) })).mutation(async ({ ctx, input }) => {
      const content = await getContentItem(input.contentId, ctx.user.id);
      if (!content?.fileUrl) throw new Error("El contenido debe tener un archivo público para publicarse en Instagram.");
      const result = await publishToInstagram({ mediaUrl: content.fileUrl, mediaType: input.mediaType, caption: input.caption || content.body || content.description || content.title });
      await updateContentItem(content.id, ctx.user.id, { status: "published", platform: "Instagram" });
      return result;
    }),
  }),
  share: router({
    mine: protectedProcedure.query(({ ctx }) => listShareLinks(ctx.user.id)),
    create: protectedProcedure.input(z.object({ kind: z.enum(["content", "collection"]), contentId: z.number().optional(), collectionName: z.string().max(120).optional(), title: z.string().min(1).max(180), expiresAt: z.string().optional() })).mutation(async ({ ctx, input }) => {
      if (input.kind === "content" && !input.contentId) throw new Error("Falta el contenido a compartir");
      if (input.kind === "collection" && !input.collectionName) throw new Error("Falta la colección a compartir");
      const link = await createShareLink({ userId: ctx.user.id, token: nanoid(32), kind: input.kind, contentId: input.contentId, collectionName: input.collectionName, title: input.title, expiresAt: toDate(input.expiresAt) });
      return { ...link, url: `/share/${link.token}` };
    }),
    deactivate: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deactivateShareLink(input.id, ctx.user.id)),
    public: publicProcedure.input(z.object({ token: z.string().min(10) })).query(async ({ input }) => {
      const link = await getShareLinkByToken(input.token);
      if (!link || !link.isActive || (link.expiresAt && link.expiresAt.getTime() < Date.now())) return null;
      const items = await getSharedContent(link);
      return { title: link.title, kind: link.kind, collectionName: link.collectionName, items };
    }),
  }),
});

export type AppRouter = typeof appRouter;
