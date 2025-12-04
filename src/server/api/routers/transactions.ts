import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const transactionsRouter = createTRPCRouter({
  getEnabledMethods: publicProcedure.query(async () => {
    const raw = process.env.MIDTRANS_ENABLED_METHODS ?? "qris,gopay,shopeepay";
    const methods = raw
      .split(",")
      .map((m) => m.trim())
      .filter((m) => ["qris", "gopay", "shopeepay"].includes(m));
    return methods;
  }),

  createPayment: publicProcedure
    .input(z.object({ orderId: z.number(), method: z.enum(["qris", "gopay", "shopeepay"]) }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({ where: { id: input.orderId } });
      if (!order) throw new Error("Order not found");
      const amount = parseFloat(order.total_amount.toString()) + parseFloat(order.tax_amount.toString());

      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      const baseUrl = process.env.MIDTRANS_BASE_URL ?? "https://api.sandbox.midtrans.com";
      let qrUrl: string | null = null;
      let externalId = `order-${order.id}-${Date.now()}`;
      let actions: Array<{ name?: string; url?: string }> | undefined;

      if (serverKey) {
        const payload: Record<string, unknown> = {
          payment_type: input.method,
          transaction_details: {
            order_id: externalId,
            gross_amount: Math.round(amount),
          },
        };
        const res = await fetch(`${baseUrl}/v2/charge`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(serverKey + ":").toString("base64")}`,
          },
          body: JSON.stringify(payload),
        });
        const chargeSchema = z
          .object({
            order_id: z.string().optional(),
            actions: z.array(z.object({ name: z.string().optional(), url: z.string().optional() })).optional(),
          })
          .passthrough();
        const json: unknown = await res.json();
        const parsed = chargeSchema.safeParse(json);
        if (parsed.success) {
          externalId = parsed.data.order_id ?? externalId;
          actions = parsed.data.actions;
          const action = (parsed.data.actions ?? []).find((a) => (a.name ?? "").toLowerCase().includes("qr"));
          qrUrl = action?.url ?? null;
        }
      }

      await ctx.db.transaction.create({
        data: {
          orderId: order.id,
          payment_method: "QRIS",
          payment_status: "pending",
          external_id: externalId,
        },
      });
      return { amount, qrUrl, externalId, actions, method: input.method };
    }),
  createQris: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({ where: { id: input.orderId } });
      if (!order) throw new Error("Order not found");
      const amount = parseFloat(order.total_amount.toString()) + parseFloat(order.tax_amount.toString());

      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      const baseUrl = process.env.MIDTRANS_BASE_URL;
      let qrUrl: string | null = null;
      let externalId = `order-${order.id}-${Date.now()}`;

      if (serverKey) {
        const res = await fetch(`${baseUrl}/v2/charge`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(serverKey + ":").toString("base64")}`,
          },
          body: JSON.stringify({
            payment_type: "qris",
            transaction_details: {
              order_id: externalId,
              gross_amount: Math.round(amount),
            },
          }),
        });
        const chargeSchema = z
          .object({
            order_id: z.string().optional(),
            actions: z
              .array(z.object({ name: z.string().optional(), url: z.string().optional() }))
              .optional(),
          })
          .passthrough();
        const json: unknown = await res.json();
        const parsed = chargeSchema.safeParse(json);
        if (parsed.success) {
          externalId = parsed.data.order_id ?? externalId;
          const action = (parsed.data.actions ?? []).find((a) => (a.name ?? "").toLowerCase().includes("qr"));
          qrUrl = action?.url ?? null;
        }
      }

      await ctx.db.transaction.create({
        data: {
          orderId: order.id,
          payment_method: "QRIS",
          payment_status: "pending",
          external_id: externalId,
        },
      });
      return { amount, qrUrl, externalId };
    }),

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

  verifyPayment: publicProcedure
    .input(z.object({ externalId: z.string(), orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      const baseUrl = process.env.MIDTRANS_BASE_URL ?? "https://api.sandbox.midtrans.com";
      let success = false;
      if (serverKey) {
        const res = await fetch(`${baseUrl}/v2/${input.externalId}/status`, {
          headers: {
            Authorization: `Basic ${Buffer.from(serverKey + ":").toString("base64")}`,
          },
        });
        const statusSchema = z
          .object({ transaction_status: z.string().optional() })
          .passthrough();
        const json: unknown = await res.json();
        const parsed = statusSchema.safeParse(json);
        const status = parsed.success ? parsed.data.transaction_status : undefined;
        success = status === "settlement" || status === "capture" || status === "success";
      }

      if (success) {
        await ctx.db.transaction.updateMany({
          where: { orderId: input.orderId, external_id: input.externalId },
          data: { payment_status: "success", paid_at: new Date() },
        });
        await ctx.db.order.update({ where: { id: input.orderId }, data: { status: "paid" } });
      }
      return { success };
    }),
});
