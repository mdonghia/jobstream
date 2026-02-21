import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Help Center - JobStream",
  description: "Find answers, guides, and documentation for JobStream field service management.",
}

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F6F8FA" }}>
      {/* Top Bar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: "#ffffff",
          borderColor: "#E3E8EE",
        }}
      >
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-4 sm:px-6">
          <Link href="/help" className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: "#635BFF" }}
            >
              JS
            </div>
            <span
              className="text-base font-semibold"
              style={{ color: "#0A2540" }}
            >
              Help Center
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "#635BFF" }}
          >
            Back to JobStream
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[960px] px-4 py-8 sm:px-6">
        {children}
      </main>

      {/* Footer */}
      <footer
        className="border-t py-8"
        style={{ borderColor: "#E3E8EE" }}
      >
        <div className="mx-auto max-w-[960px] px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm" style={{ color: "#8898AA" }}>
              &copy; {new Date().getFullYear()} JobStream. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="/help"
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: "#8898AA" }}
              >
                Help Center
              </Link>
              <Link
                href="/"
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: "#8898AA" }}
              >
                JobStream Home
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
