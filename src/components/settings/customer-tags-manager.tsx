"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Check,
  X,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  getAllTags,
  getTagUsageCounts,
  renameCustomerTag,
  deleteCustomerTag,
} from "@/actions/customers"

// ============================================================================
// Types
// ============================================================================

interface CustomerTagsManagerProps {
  initialTags: string[]
  initialCounts: Record<string, number>
}

// ============================================================================
// Component
// ============================================================================

export function CustomerTagsManager({
  initialTags,
  initialCounts,
}: CustomerTagsManagerProps) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [tagCounts, setTagCounts] = useState<Record<string, number>>(initialCounts)
  const [newTagName, setNewTagName] = useState("")
  const [renamingTag, setRenamingTag] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [tagLoading, setTagLoading] = useState(false)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)

  // Tags added locally that are not yet used by any customer
  const [localTags, setLocalTags] = useState<string[]>([])

  // Merge server tags with locally-added ones
  const allTags = useMemo(() => {
    const merged = new Set([...tags, ...localTags])
    return Array.from(merged).sort()
  }, [tags, localTags])

  // -----------------------------------------------------------------------
  // Refresh
  // -----------------------------------------------------------------------

  async function refreshTags() {
    const [tagsResult, countsResult] = await Promise.all([
      getAllTags(),
      getTagUsageCounts(),
    ])
    if (Array.isArray(tagsResult)) {
      setTags(tagsResult)
    }
    if (countsResult && "counts" in countsResult) {
      setTagCounts(countsResult.counts ?? {})
    }
  }

  // -----------------------------------------------------------------------
  // Add tag
  // -----------------------------------------------------------------------

  function handleAddTag() {
    const name = newTagName.trim()
    if (!name) return

    if (allTags.includes(name)) {
      toast.error("That tag already exists")
      return
    }

    setLocalTags((prev) => [...prev, name].sort())
    setNewTagName("")
    toast.success(`Tag "${name}" added`)
  }

  // -----------------------------------------------------------------------
  // Rename tag
  // -----------------------------------------------------------------------

  async function handleRenameTag(oldName: string) {
    const newName = renameValue.trim()
    if (!newName) {
      toast.error("Tag name cannot be empty")
      return
    }
    if (newName === oldName) {
      setRenamingTag(null)
      return
    }

    setTagLoading(true)
    try {
      const result = await renameCustomerTag(oldName, newName)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        setLocalTags((prev) =>
          prev.map((t) => (t === oldName ? newName : t)).sort()
        )
        toast.success(
          `Renamed "${oldName}" to "${newName}" across ${result.updated} customer${result.updated !== 1 ? "s" : ""}`
        )
        setRenamingTag(null)
        await refreshTags()
      }
    } catch {
      toast.error("Failed to rename tag")
    } finally {
      setTagLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Delete tag
  // -----------------------------------------------------------------------

  async function handleDeleteTag(name: string) {
    setTagLoading(true)
    try {
      // If this is a locally-added tag (no customers use it), just remove locally
      if (!tagCounts[name]) {
        setLocalTags((prev) => prev.filter((t) => t !== name))
        toast.success(`Tag "${name}" removed`)
        setDeletingTag(null)
        setTagLoading(false)
        return
      }

      const result = await deleteCustomerTag(name)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        setLocalTags((prev) => prev.filter((t) => t !== name))
        toast.success(
          `Removed "${name}" from ${result.updated} customer${result.updated !== 1 ? "s" : ""}`
        )
        setDeletingTag(null)
        await refreshTags()
      }
    } catch {
      toast.error("Failed to delete tag")
    } finally {
      setTagLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  if (allTags.length === 0 && !newTagName.trim()) {
    return (
      <div>
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">Customer Tags</h2>
          <p className="mt-1 text-sm text-[#425466]">
            Manage the tags you use to organize and filter customers.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <Tag className="h-16 w-16 text-[#8898AA] mb-4" />
          <h3 className="text-lg font-semibold text-[#0A2540] mb-2">
            No tags yet
          </h3>
          <p className="text-sm text-[#425466] max-w-md mb-6">
            Tags help you categorize customers for easy filtering and organization.
            Add a tag to get started.
          </p>
          <div className="flex gap-2 w-full max-w-sm">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Enter a tag name..."
              className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
            />
            <Button
              onClick={handleAddTag}
              disabled={!newTagName.trim()}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Tag
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">Customer Tags</h2>
          <p className="mt-1 text-sm text-[#425466]">
            {allTags.length} tag{allTags.length !== 1 ? "s" : ""} in use.
            Manage the tags you use to organize and filter customers.
          </p>
        </div>
      </div>

      {/* Add new tag */}
      <div className="mt-4 flex gap-2 max-w-md">
        <Input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New tag name..."
          className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleAddTag()
            }
          }}
        />
        <Button
          onClick={handleAddTag}
          disabled={!newTagName.trim()}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white h-10"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Tag
        </Button>
      </div>

      {/* Tag list */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#E3E8EE] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Tag Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Customers
                </th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {allTags.map((tag) => (
                <tr
                  key={tag}
                  className="border-b border-[#E3E8EE] last:border-b-0 group"
                >
                  <td className="px-4 py-3">
                    {renamingTag === tag ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-8 text-sm border-[#E3E8EE] focus-visible:ring-[#635BFF] max-w-[250px]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleRenameTag(tag)
                            }
                            if (e.key === "Escape") {
                              setRenamingTag(null)
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRenameTag(tag)}
                          disabled={tagLoading}
                          className="h-8 w-8 p-0"
                        >
                          {tagLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRenamingTag(null)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-3.5 w-3.5 text-[#8898AA]" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#635BFF]/10 text-[#635BFF]">
                          {tag}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-[#425466]">
                      {tagCounts[tag]
                        ? `${tagCounts[tag]} customer${tagCounts[tag] !== 1 ? "s" : ""}`
                        : "unused"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {renamingTag !== tag && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRenamingTag(tag)
                            setRenameValue(tag)
                          }}
                          className="h-7 w-7 p-0"
                          aria-label={`Rename ${tag}`}
                        >
                          <Pencil className="h-3.5 w-3.5 text-[#8898AA]" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingTag(tag)}
                          className="h-7 w-7 p-0"
                          aria-label={`Delete ${tag}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete tag confirmation */}
      <AlertDialog
        open={!!deletingTag}
        onOpenChange={(open) => {
          if (!open) setDeletingTag(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTag && tagCounts[deletingTag]
                ? `This will remove the "${deletingTag}" tag from ${tagCounts[deletingTag]} customer${tagCounts[deletingTag] !== 1 ? "s" : ""}. The customers themselves will not be deleted.`
                : `Remove the "${deletingTag}" tag?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E3E8EE]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingTag && handleDeleteTag(deletingTag)
              }
              disabled={tagLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {tagLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
