import { postRouter } from "@/server/api/routers/post";
import { categoriesRouter } from "@/server/api/routers/categories";
import { productsRouter } from "@/server/api/routers/products";
import { ordersRouter } from "@/server/api/routers/orders";
import { transactionsRouter } from "@/server/api/routers/transactions";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  categories: categoriesRouter,
  products: productsRouter,
  orders: ordersRouter,
  transactions: transactionsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
