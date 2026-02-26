"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
// Props
// ============================================================================

interface ManageTagsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a tag is added, renamed, or deleted so parent can refresh */
  onTagsChanged?: () => void
}

// ============================================================================
// Component
// ============================================================================

export function ManageTagsDialog({
  open,
  onOpenChange,
  onTagsChanged,
}: ManageTagsDialogProps) {
  const [tags, setTags] = useState<string[]>([])
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [renamingTag, setRenamingTag] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [tagLoading, setTagLoading] = useState(false)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)

  // Tags that were added locally (not yet used by any customer) -- they exist
  // only in the dialog until a customer is assigned that tag.
  const [localTags, setLocalTags] = useState<string[]>([])

  // Merge server tags with locally-added ones
  const allTags = useMemo(() => {
    const merged = new Set([...tags, ...localTags])
    return Array.from(merged).sort()
  }, [tags, localTags])

  // -----------------------------------------------------------------------
  // Fetch tags when dialog opens
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (open) {
      fetchTags()
    } else {
      // Reset state on close
      setRenamingTag(null)
      setNewTagName("")
      setDeletingTag(null)
      setLocalTags([])
    }
  }, [open])

  async function fetchTags() {
    setLoading(true)
    try {
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
    } catch {
      toast.error("Failed to load tags")
    } finally {
      setLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Add tag (locally -- will persist when a customer uses it)
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
    onTagsChanged?.()
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
        // Also rename in localTags if it was a locally-added one
        setLocalTags((prev) =>
          prev.map((t) => (t === oldName ? newName : t)).sort()
        )
        toast.success(
          `Renamed "${oldName}" to "${newName}" across ${result.updated} customer${result.updated !== 1 ? "s" : ""}`
        )
        setRenamingTag(null)
        await fetchTags()
        onTagsChanged?.()
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
        onTagsChanged?.()
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
        await fetchTags()
        onTagsChanged?.()
      }
    } catch {
      toast.error("Failed to delete tag")
    } finally {
      setTagLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(openState) => {
          onOpenChange(openState)
          if (!openState) {
            setRenamingTag(null)
            setNewTagName("")
            setDeletingTag(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">
              Manage Tags
            </DialogTitle>
            <DialogDescription>
              Add, rename, or remove customer tags. Changes to existing
              tags apply to all customers that use them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Add new tag */}
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name..."
                className="h-9 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
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
                size="sm"
                className="bg-[#635BFF] hover:bg-[#5851ea] text-white h-9 px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Tag list */}
            {loading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#8898AA]" />
              </div>
            ) : allTags.length === 0 ? (
              <div className="py-6 text-center text-sm text-[#8898AA]">
                No tags yet. Add one above.
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {allTags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-[#F6F8FA] group"
                  >
                    {renamingTag === tag ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-8 text-sm border-[#E3E8EE] focus-visible:ring-[#635BFF]"
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
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-[#0A2540] truncate">
                            {tag}
                          </span>
                          <span className="text-xs text-[#8898AA] flex-shrink-0">
                            {tagCounts[tag]
                              ? `${tagCounts[tag]} customer${tagCounts[tag] !== 1 ? "s" : ""}`
                              : "unused"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete tag confirmation */}
      <AlertDialog
        open={!!deletingTag}
        onOpenChange={(openState) => {
          if (!openState) setDeletingTag(null)
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
    </>
  )
}
