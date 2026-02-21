"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import {
  Search,
  Rocket,
  Users,
  FileText,
  Calendar,
  Briefcase,
  Receipt,
  Globe,
  CalendarPlus,
  MessageSquare,
  Star,
  BarChart3,
  Settings,
  ChevronRight,
} from "lucide-react"
import { helpCategories } from "@/lib/help-categories"
import { searchArticles } from "@/lib/help-search"
import type { HelpArticle } from "@/lib/help-articles"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  Users,
  FileText,
  Calendar,
  Briefcase,
  Receipt,
  Globe,
  CalendarPlus,
  MessageSquare,
  Star,
  BarChart3,
  Settings,
}

export default function HelpCenterHome() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<HelpArticle[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length >= 2) {
      const matches = searchArticles(query)
      setResults(matches.slice(0, 8))
      setShowResults(true)
    } else {
      setResults([])
      setShowResults(false)
    }
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div>
      {/* Hero Section */}
      <div className="pb-10 pt-8 text-center sm:pb-14 sm:pt-12">
        <h1
          className="text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ color: "#0A2540" }}
        >
          How can we help?
        </h1>
        <p
          className="mx-auto mt-3 max-w-md text-base"
          style={{ color: "#425466" }}
        >
          Search our knowledge base or browse categories below to find the answers you need.
        </p>

        {/* Search Bar */}
        <div className="relative mx-auto mt-8 max-w-xl" ref={searchRef}>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
              style={{ color: "#8898AA" }}
            />
            <input
              type="text"
              placeholder="Search for articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              className="h-14 w-full rounded-xl border bg-white pl-12 pr-4 text-base shadow-sm transition-shadow focus:outline-none focus:ring-2"
              style={{
                borderColor: "#E3E8EE",
                color: "#0A2540",
                // @ts-expect-error CSS custom property for focus ring
                "--tw-ring-color": "#635BFF",
              }}
            />
          </div>

          {/* Search Results Dropdown */}
          {showResults && results.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-white shadow-lg"
              style={{ borderColor: "#E3E8EE" }}
            >
              {results.map((article) => (
                <Link
                  key={`${article.category}-${article.slug}`}
                  href={`/help/${article.category}/${article.slug}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                  onClick={() => setShowResults(false)}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: "#0A2540" }}
                    >
                      {article.title}
                    </p>
                    <p
                      className="mt-0.5 truncate text-xs"
                      style={{ color: "#8898AA" }}
                    >
                      {article.excerpt}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: "#8898AA" }}
                  />
                </Link>
              ))}
            </div>
          )}

          {showResults && query.trim().length >= 2 && results.length === 0 && (
            <div
              className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border bg-white p-6 text-center shadow-lg"
              style={{ borderColor: "#E3E8EE" }}
            >
              <p className="text-sm" style={{ color: "#425466" }}>
                No articles found for &ldquo;{query}&rdquo;. Try different keywords.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {helpCategories.map((category) => {
          const IconComponent = iconMap[category.icon]
          return (
            <Link
              key={category.slug}
              href={`/help/${category.slug}`}
              className="group rounded-xl border bg-white p-6 transition-all hover:shadow-md"
              style={{ borderColor: "#E3E8EE" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "#F6F8FA" }}
                >
                  {IconComponent && (
                    <span style={{ color: "#635BFF" }}>
                      <IconComponent className="h-5 w-5" />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2
                    className="text-sm font-semibold group-hover:underline"
                    style={{ color: "#0A2540" }}
                  >
                    {category.name}
                  </h2>
                  <p
                    className="mt-1 text-sm leading-relaxed"
                    style={{ color: "#425466" }}
                  >
                    {category.description}
                  </p>
                  <p className="mt-2 text-xs" style={{ color: "#8898AA" }}>
                    {category.articleCount} article{category.articleCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
