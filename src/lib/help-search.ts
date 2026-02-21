import Fuse from "fuse.js"
import { helpArticles, type HelpArticle } from "./help-articles"

const fuse = new Fuse(helpArticles, {
  keys: [
    { name: "title", weight: 0.4 },
    { name: "excerpt", weight: 0.25 },
    { name: "keywords", weight: 0.25 },
    { name: "category", weight: 0.1 },
  ],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 2,
})

export function searchArticles(query: string): HelpArticle[] {
  if (!query || query.trim().length < 2) return []
  const results = fuse.search(query.trim())
  return results.map((r) => r.item)
}
