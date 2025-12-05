import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { Prisma } from "../../../../generated/prisma";

const CartItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1),
  notes: z.string().optional(),
});

export const ordersRouter = createTRPCRouter({
  createOrder: publicProcedure
    .input(
      z.object({
        tableNumber: z.string(),
        customerName: z.string().optional(),
        items: z.array(CartItemSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.db.table.upsert({
        where: { table_number: input.tableNumber },
        update: {},
        create: {
          table_number: input.tableNumber,
          qr_code_string: input.tableNumber,
          is_occupied: true,
        },
      });
      const products = await ctx.db.product.findMany({
        where: { id: { in: input.items.map((i) => i.productId) } },
      });
      const totals = input.items.reduce(
        (acc, i) => {
          const p = products.find((pp) => pp.id === i.productId);
          if (!p) return acc;
          const line = p.price.mul(i.quantity);
          return {
            amount: acc.amount.add(line),
            baseSeconds: acc.baseSeconds + p.base_duration_seconds * i.quantity,
          };
        },
        { amount: new Prisma.Decimal(0), baseSeconds: 0 }
      );
      const tax = totals.amount.mul(new Prisma.Decimal(0.1));
      const now = new Date();
      const est = new Date(now.getTime() + totals.baseSeconds * 1000);

      const order = await ctx.db.order.create({
        data: {
          tableId: table.id,
          customer_name: input.customerName ?? "",
          queue_number: Math.floor(Math.random() * 900 + 100).toString(),
          total_amount: totals.amount,
          tax_amount: tax,
          order_time: now,
          estimated_completion_time: est,
          status: "pending_payment",
          items: {
            create: input.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              notes: i.notes,
              price_at_time: products.find((p) => p.id === i.productId)!.price,
              item_status: "queued",
            })),
          },
        },
        include: { items: true },
      });
      return { orderId: order.id };
    }),

  getOrder: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: { items: { include: { product: true } }, transactions: true, table: true },
      });
      if (!order) return null;
      const now = Date.now();
      const estMsRaw = order.estimated_completion_time
        ? order.estimated_completion_time.getTime() - now
        : 0;
      const estMs = estMsRaw;
      const etaMs = Math.max(estMs, 0);
      const lateMs = estMs < 0 ? Math.abs(estMs) : 0;
      const allDone = order.items.every((it) => it.item_status === "done");
      let status = order.status;
      if (status === "paid") {
        if (now - order.order_time.getTime() > 60_000) {
          status = "processing";
        }
      }
      if (allDone) {
        status = "completed";
      }
      if (status !== order.status) {
        await ctx.db.order.update({ where: { id: order.id }, data: { status } });
        order.status = status;
      }
      return { order, etaMs, lateMs };
    }),

  kitchenActive: publicProcedure
    .query(async ({ ctx }) => {
      const orders = await ctx.db.order.findMany({
        where: { status: { in: ["paid", "processing"] } },
        orderBy: { order_time: "asc" },
        include: { items: { include: { product: true } }, table: true },
      });
      const now = Date.now();
      const enriched = orders.map((order) => {
        const estMsRaw = order.estimated_completion_time
          ? order.estimated_completion_time.getTime() - now
          : 0;
        const lateMs = estMsRaw < 0 ? Math.abs(estMsRaw) : 0;
        const waitMs = now - order.order_time.getTime();
        return { order, lateMs, waitMs };
      });
      const delayCount = enriched.filter((e) => e.lateMs > 0).length;
      return { orders: enriched, totalActive: enriched.length, totalDelay: delayCount };
    }),

  startCooking: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      await ctx.db.order.update({ where: { id: input.orderId }, data: { status: "processing" } });
      await ctx.db.orderItem.updateMany({
        where: { orderId: input.orderId, item_status: "queued" },
        data: { item_status: "cooking", started_cooking_at: now },
      });
      return { ok: true };
    }),

  finishOrder: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      await ctx.db.orderItem.updateMany({
        where: { orderId: input.orderId, item_status: "cooking" },
        data: { item_status: "done", finished_cooking_at: now },
      });
      const remaining = await ctx.db.orderItem.count({ where: { orderId: input.orderId, item_status: { in: ["queued", "cooking"] } } });
      if (remaining === 0) {
        await ctx.db.order.update({ where: { id: input.orderId }, data: { status: "completed" } });
      }
      return { ok: true };
    }),
});
