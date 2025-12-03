// import { defineConfig } from "@prisma/cli";

// export default defineConfig({
//   schema: "./prisma/schema.prisma",
//   datasource: {
//     url: process.env.DATABASE_URL!,
//   },
// });


import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
