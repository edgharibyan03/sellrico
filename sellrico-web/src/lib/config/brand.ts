/**
 * Sellrico company brand + Shoppio product naming.
 * Colors map into CSS variables in globals.css.
 */
export const brand = {
  /** Company / platform brand (site, account, dashboard chrome) */
  name: "Sellrico",
  /** Product sold under Sellrico */
  product: "Shoppio",
  tagline: "Commerce tools for modern stores",
  description:
    "Sellrico builds products for online merchants. Shoppio is our AI shopping assistant for WooCommerce — help customers discover products and shop through conversation.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003",
} as const
