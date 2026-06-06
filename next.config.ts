import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* React Compiler solo en producción: en dev fuerza Babel y hace la
     compilación muchísimo más lenta. Es una optimización de runtime. */
  reactCompiler: process.env.NODE_ENV === "production",
};

export default nextConfig;
