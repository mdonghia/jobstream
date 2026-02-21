import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight, Clock } from "lucide-react"
import { getCategoryBySlug } from "@/lib/help-categories"
import { getArticlesByCategory } from "@/lib/help-articles"

type Params = Promise<{ category: string }>

export default async function CategoryPage({ params }: { params: Params }) {
  const { category: categorySlug } = await params
  const category = getCategoryBySlug(categorySlug)

  if (!category) {
    notFound()
  }

  const articles = getArticlesByCategory(categorySlug)

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm" style={{ color: "#8898AA" }}>
        <Link
          href="/help"
          className="transition-colors hover:underline"
          style={{ color: "#635BFF" }}
        >
          Help Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span style={{ color: "#425466" }}>{category.name}</span>
      </nav>

      {/* Category Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ color: "#0A2540" }}
        >
          {category.name}
        </h1>
        <p className="mt-2 text-base" style={{ color: "#425466" }}>
          {category.description}
        </p>
      </div>

      {/* Article List */}
      <div className="space-y-3">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/help/${categorySlug}/${article.slug}`}
            className="group flex items-center justify-between rounded-xl border bg-white px-6 py-5 transition-all hover:shadow-md"
            style={{ borderColor: "#E3E8EE" }}
          >
            <div className="min-w-0 flex-1">
              <h2
                className="text-sm font-semibold group-hover:underline"
                style={{ color: "#0A2540" }}
              >
                {article.title}
              </h2>
              <p
                className="mt-1 text-sm leading-relaxed"
                style={{ color: "#425466" }}
              >
                {article.excerpt}
              </p>
              <div
                className="mt-2 flex items-center gap-1.5 text-xs"
                style={{ color: "#8898AA" }}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{article.readingTime} min read</span>
              </div>
            </div>
            <ChevronRight
              className="ml-4 h-5 w-5 flex-shrink-0"
              style={{ color: "#8898AA" }}
            />
          </Link>
        ))}
      </div>

      {articles.length === 0 && (
        <div
          className="rounded-xl border bg-white p-12 text-center"
          style={{ borderColor: "#E3E8EE" }}
        >
          <p className="text-sm" style={{ color: "#425466" }}>
            No articles found in this category yet.
          </p>
        </div>
      )}
    </div>
  )
}
