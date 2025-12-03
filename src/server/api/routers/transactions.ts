import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const transactionsRouter = createTRPCRouter({
  simulatePayment: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.update({
        where: { id: input.orderId },
        data: { status: "paid" },
      });
      await ctx.db.transaction.create({
        data: {
          orderId: order.id,
          payment_method: "QRIS",
          payment_status: "success",
          external_id: "demo",
          paid_at: new Date(),
        },
      });
      return { ok: true };
    }),
});

