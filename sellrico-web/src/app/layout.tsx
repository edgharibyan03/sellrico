import type { Metadata } from "next"
import { brand } from "@/lib/config/brand"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
