import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { randomBytes, scryptSync } from "crypto";

export const staffRouter = createTRPCRouter({
  createStaffUser: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        role: z.enum(["admin", "cashier"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const meId = Number(ctx.session?.user?.id ?? 0);
      const me = await ctx.db.staffUser.findUnique({ where: { id: meId } });
      if (me?.role !== "admin") {
        throw new Error("Unauthorized");
      }

      const existing = await ctx.db.staffUser.findUnique({ where: { username: input.username } });
      if (existing) {
        throw new Error("Username sudah dipakai");
      }

      const salt = randomBytes(16).toString("hex");
      const derived = scryptSync(input.password, salt, 32);
      const hashHex = Buffer.from(derived).toString("hex");

      const user = await ctx.db.staffUser.create({
        data: {
          username: input.username,
          password_hash: `scrypt:${salt}:${hashHex}`,
          role: input.role,
        },
      });

      return { id: user.id, username: user.username, role: user.role };
    }),
});
