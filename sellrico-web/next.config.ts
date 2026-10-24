import type { NextConfig } from "next"
import path from "path"
import { fileURLToPath } from "url"
import createNextIntlPlugin from "next-intl/plugin"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: rootDir,
  },
}

export default withNextIntl(nextConfig)
