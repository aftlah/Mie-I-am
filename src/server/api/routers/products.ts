import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const productsRouter = createTRPCRouter({
  quickJobs: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.product.findMany({
      where: { is_quick_job: true, is_available: true },
      orderBy: { name: "asc" },
      take: 10,
    });
  }),

  byIds: publicProcedure
    .input(z.array(z.number()))
    .query(async ({ ctx, input }) => {
      if (input.length === 0) return [];
      return ctx.db.product.findMany({ where: { id: { in: input } } });
    }),
});
