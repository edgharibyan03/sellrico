import Link from "next/link"
import { Logo } from "@/components/layout/logo"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-brand-mist/50">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Back to home
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
