import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const productsRouter = createTRPCRouter({
  quickJobs: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.product.findMany({
      where: { is_quick_job: true, is_available: true },
      orderBy: { name: "asc" },
      take: 10,
    });
  }),
});

