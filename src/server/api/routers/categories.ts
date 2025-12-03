import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const categoriesRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.category.findMany({
      include: { products: true },
      orderBy: { name: "asc" },
    });
  }),
});

