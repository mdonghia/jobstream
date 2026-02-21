"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  ThumbsUp,
  ThumbsDown,
  CalendarDays,
} from "lucide-react"
import { getCategoryBySlug } from "@/lib/help-categories"
import { getArticleBySlug, getArticlesByCategory } from "@/lib/help-articles"

function renderArticleContent(content: string) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: "ul" | "ol" | null = null
  let keyIndex = 0

  function flushList() {
    if (listItems.length > 0 && listType) {
      const items = listItems.map((item, i) => (
        <li key={i} className="leading-relaxed" style={{ color: "#425466" }}>
          {renderInline(item)}
        </li>
      ))
      if (listType === "ol") {
        elements.push(
          <ol
            key={keyIndex++}
            className="my-3 list-decimal space-y-1.5 pl-6 text-sm"
          >
            {items}
          </ol>
        )
      } else {
        elements.push(
          <ul
            key={keyIndex++}
            className="my-3 list-disc space-y-1.5 pl-6 text-sm"
          >
            {items}
          </ul>
        )
      }
      listItems = []
      listType = null
    }
  }

  function renderInline(text: string): React.ReactNode {
    // Handle **bold** and `code` formatting
    const parts: React.ReactNode[] = []
    let remaining = text
    let partKey = 0

    while (remaining.length > 0) {
      // Find all matches and pick the earliest one
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      const codeMatch = remaining.match(/`(.+?)`/)

      type MatchInfo = { index: number; length: number; node: React.ReactNode }
      const candidates: MatchInfo[] = []

      if (boldMatch && boldMatch.index !== undefined) {
        candidates.push({
          index: boldMatch.index,
          length: boldMatch[0].length,
          node: (
            <strong key={`b-${partKey++}`} style={{ color: "#0A2540" }}>
              {boldMatch[1]}
            </strong>
          ),
        })
      }

      if (codeMatch && codeMatch.index !== undefined) {
        candidates.push({
          index: codeMatch.index,
          length: codeMatch[0].length,
          node: (
            <code
              key={`c-${partKey++}`}
              className="rounded px-1.5 py-0.5 text-xs font-mono"
              style={{ backgroundColor: "#F6F8FA", color: "#0A2540" }}
            >
              {codeMatch[1]}
            </code>
          ),
        })
      }

      if (candidates.length === 0) {
        parts.push(remaining)
        break
      }

      // Pick the earliest match
      candidates.sort((a, b) => a.index - b.index)
      const winner = candidates[0]

      if (winner.index > 0) {
        parts.push(remaining.slice(0, winner.index))
      }
      parts.push(winner.node)
      remaining = remaining.slice(winner.index + winner.length)
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Heading 2
    if (trimmed.startsWith("## ")) {
      flushList()
      elements.push(
        <h2
          key={keyIndex++}
          className="mt-8 mb-3 text-lg font-bold"
          style={{ color: "#0A2540" }}
        >
          {trimmed.slice(3)}
        </h2>
      )
      continue
    }

    // Heading 3
    if (trimmed.startsWith("### ")) {
      flushList()
      elements.push(
        <h3
          key={keyIndex++}
          className="mt-6 mb-2 text-base font-semibold"
          style={{ color: "#0A2540" }}
        >
          {trimmed.slice(4)}
        </h3>
      )
      continue
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)/)
    if (olMatch) {
      if (listType !== "ol") {
        flushList()
        listType = "ol"
      }
      listItems.push(olMatch[2])
      continue
    }

    // Unordered list
    if (trimmed.startsWith("- ")) {
      if (listType !== "ul") {
        flushList()
        listType = "ul"
      }
      listItems.push(trimmed.slice(2))
      continue
    }

    // Table detection (simple markdown table)
    if (trimmed.startsWith("|")) {
      flushList()
      // Collect all table lines
      const tableLines: string[] = [trimmed]
      // We handle single-line tables inline; multi-line handled by content flow
      elements.push(
        <div key={keyIndex++} className="my-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {(() => {
                const cells = trimmed
                  .split("|")
                  .filter((c) => c.trim().length > 0)
                  .map((c) => c.trim())
                // Skip separator rows
                if (cells.every((c) => /^[-:]+$/.test(c))) return null
                return (
                  <tr key={keyIndex++}>
                    {cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className="border px-3 py-2"
                        style={{ borderColor: "#E3E8EE", color: "#425466" }}
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                )
              })()}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Empty line
    if (trimmed === "") {
      flushList()
      continue
    }

    // Regular paragraph
    flushList()
    elements.push(
      <p
        key={keyIndex++}
        className="my-3 text-sm leading-relaxed"
        style={{ color: "#425466" }}
      >
        {renderInline(trimmed)}
      </p>
    )
  }

  flushList()
  return elements
}

export default function ArticlePage() {
  const params = useParams()
  const categorySlug = params.category as string
  const articleSlug = params.slug as string

  const category = getCategoryBySlug(categorySlug)
  const article = getArticleBySlug(categorySlug, articleSlug)
  const categoryArticles = getArticlesByCategory(categorySlug)

  const [feedback, setFeedback] = useState<"up" | "down" | null>(null)

  // Load feedback from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`help-feedback-${categorySlug}-${articleSlug}`)
    if (stored === "up" || stored === "down") {
      setFeedback(stored)
    }
  }, [categorySlug, articleSlug])

  function handleFeedback(type: "up" | "down") {
    setFeedback(type)
    localStorage.setItem(`help-feedback-${categorySlug}-${articleSlug}`, type)
  }

  if (!category || !article) {
    return (
      <div className="py-20 text-center">
        <h1
          className="text-2xl font-bold"
          style={{ color: "#0A2540" }}
        >
          Article Not Found
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#425466" }}>
          The article you are looking for does not exist.
        </p>
        <Link
          href="/help"
          className="mt-4 inline-block text-sm font-medium"
          style={{ color: "#635BFF" }}
        >
          Return to Help Center
        </Link>
      </div>
    )
  }

  // Find current article index for prev/next navigation
  const currentIndex = categoryArticles.findIndex((a) => a.slug === articleSlug)
  const prevArticle = currentIndex > 0 ? categoryArticles[currentIndex - 1] : null
  const nextArticle =
    currentIndex < categoryArticles.length - 1
      ? categoryArticles[currentIndex + 1]
      : null

  // Related articles: other articles in the same category (excluding current), up to 3
  const relatedArticles = categoryArticles
    .filter((a) => a.slug !== articleSlug)
    .slice(0, 3)

  return (
    <div>
      {/* Breadcrumb */}
      <nav
        className="mb-6 flex flex-wrap items-center gap-2 text-sm"
        style={{ color: "#8898AA" }}
      >
        <Link
          href="/help"
          className="transition-colors hover:underline"
          style={{ color: "#635BFF" }}
        >
          Help Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/help/${categorySlug}`}
          className="transition-colors hover:underline"
          style={{ color: "#635BFF" }}
        >
          {category.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span style={{ color: "#425466" }}>{article.title}</span>
      </nav>

      {/* Article */}
      <article
        className="rounded-xl border bg-white p-6 sm:p-8"
        style={{ borderColor: "#E3E8EE" }}
      >
        {/* Title */}
        <h1
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ color: "#0A2540" }}
        >
          {article.title}
        </h1>

        {/* Meta */}
        <div
          className="mt-3 flex flex-wrap items-center gap-4 text-xs"
          style={{ color: "#8898AA" }}
        >
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Last updated {article.lastUpdated}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {article.readingTime} min read
          </span>
        </div>

        {/* Divider */}
        <hr className="my-6" style={{ borderColor: "#E3E8EE" }} />

        {/* Content */}
        <div className="article-content">
          {renderArticleContent(article.content)}
        </div>

        {/* Divider */}
        <hr className="my-8" style={{ borderColor: "#E3E8EE" }} />

        {/* Feedback */}
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: "#0A2540" }}>
            Was this article helpful?
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              onClick={() => handleFeedback("up")}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all"
              style={{
                borderColor: feedback === "up" ? "#635BFF" : "#E3E8EE",
                backgroundColor: feedback === "up" ? "#F6F5FF" : "#ffffff",
                color: feedback === "up" ? "#635BFF" : "#425466",
              }}
            >
              <ThumbsUp className="h-4 w-4" />
              Yes
            </button>
            <button
              onClick={() => handleFeedback("down")}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all"
              style={{
                borderColor: feedback === "down" ? "#635BFF" : "#E3E8EE",
                backgroundColor: feedback === "down" ? "#F6F5FF" : "#ffffff",
                color: feedback === "down" ? "#635BFF" : "#425466",
              }}
            >
              <ThumbsDown className="h-4 w-4" />
              No
            </button>
          </div>
          {feedback && (
            <p className="mt-2 text-xs" style={{ color: "#8898AA" }}>
              Thank you for your feedback!
            </p>
          )}
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="mt-8">
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: "#0A2540" }}
          >
            Related Articles
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {relatedArticles.map((related) => (
              <Link
                key={related.slug}
                href={`/help/${categorySlug}/${related.slug}`}
                className="group rounded-xl border bg-white p-4 transition-all hover:shadow-md"
                style={{ borderColor: "#E3E8EE" }}
              >
                <h3
                  className="text-sm font-semibold group-hover:underline"
                  style={{ color: "#0A2540" }}
                >
                  {related.title}
                </h3>
                <p
                  className="mt-1 line-clamp-2 text-xs leading-relaxed"
                  style={{ color: "#425466" }}
                >
                  {related.excerpt}
                </p>
                <p className="mt-2 text-xs" style={{ color: "#8898AA" }}>
                  {related.readingTime} min read
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Previous / Next Navigation */}
      <div
        className="mt-8 flex items-stretch gap-3"
      >
        {prevArticle ? (
          <Link
            href={`/help/${categorySlug}/${prevArticle.slug}`}
            className="flex flex-1 items-center gap-3 rounded-xl border bg-white p-4 transition-all hover:shadow-md"
            style={{ borderColor: "#E3E8EE" }}
          >
            <ChevronLeft
              className="h-5 w-5 flex-shrink-0"
              style={{ color: "#8898AA" }}
            />
            <div className="min-w-0">
              <p className="text-xs" style={{ color: "#8898AA" }}>
                Previous
              </p>
              <p
                className="mt-0.5 truncate text-sm font-medium"
                style={{ color: "#0A2540" }}
              >
                {prevArticle.title}
              </p>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {nextArticle ? (
          <Link
            href={`/help/${categorySlug}/${nextArticle.slug}`}
            className="flex flex-1 items-center justify-end gap-3 rounded-xl border bg-white p-4 text-right transition-all hover:shadow-md"
            style={{ borderColor: "#E3E8EE" }}
          >
            <div className="min-w-0">
              <p className="text-xs" style={{ color: "#8898AA" }}>
                Next
              </p>
              <p
                className="mt-0.5 truncate text-sm font-medium"
                style={{ color: "#0A2540" }}
              >
                {nextArticle.title}
              </p>
            </div>
            <ChevronRight
              className="h-5 w-5 flex-shrink-0"
              style={{ color: "#8898AA" }}
            />
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  )
}
