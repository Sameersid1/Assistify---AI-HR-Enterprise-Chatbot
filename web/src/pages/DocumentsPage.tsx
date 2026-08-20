import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  Inbox,
  X,
  Users2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  type CompanyDocument,
  type DocumentSearchHit,
  type EmploymentType,
} from "@/lib/types"

/** Roles allowed to publish — mirrors the `publishers` guard on the API. */
const PUBLISHER_ROLES = new Set(["hr", "admin", "super_admin"])

/** Text formats the browser can read without a parser. */
const READABLE_EXTENSIONS = [".txt", ".md", ".csv", ".json"]

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth()
  const canPublish = user ? PUBLISHER_ROLES.has(user.role) : false

  const [documents, setDocuments] = useState<CompanyDocument[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [showUpload, setShowUpload] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  /** Empty = applies to everyone. */
  const [audience, setAudience] = useState<EmploymentType[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<DocumentSearchHit[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ documents: CompanyDocument[] }>("/documents")
      setDocuments(res.documents)
    } catch (err) {
      setDocuments([])
      setLoadError(err instanceof ApiError ? err.message : "Could not load documents.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const readFile = (file: File) => {
    const name = file.name.toLowerCase()
    if (!READABLE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      // Extraction happens here rather than on the server, so the browser's own
      // limits apply: it reads text formats natively and nothing else.
      setUploadError(
        "Only text files can be read directly (.txt, .md, .csv, .json). For a PDF or Word file, open it, copy the text, and paste it below.",
      )
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setContent(String(reader.result ?? ""))
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""))
      setUploadError(null)
    }
    reader.onerror = () => setUploadError("Could not read that file.")
    reader.readAsText(file)
  }

  const upload = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)
    setUploadError(null)
    try {
      await api.post<{ document: CompanyDocument }>("/documents", {
        title: title.trim(),
        content: content.trim(),
        audienceEmploymentTypes: audience,
      })
      setTitle("")
      setAudience([])
      setContent("")
      setShowUpload(false)
      await load()
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : "Could not upload that document.",
      )
    } finally {
      setIsUploading(false)
    }
  }

  const remove = async (doc: CompanyDocument) => {
    if (!window.confirm(`Delete "${doc.title}"? The assistant will stop citing it.`)) return
    try {
      await api.delete(`/documents/${doc.id}`)
      setDocuments((prev) => prev?.filter((d) => d.id !== doc.id) ?? prev)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not delete that document.")
    }
  }

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim().length < 2) return
    setIsSearching(true)
    try {
      const res = await api.get<{ results: DocumentSearchHit[] }>(
        `/documents/search?q=${encodeURIComponent(query.trim())}`,
      )
      setHits(res.results)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Search failed.")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Company Policies &amp; Documents
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Indexed for the assistant — it answers policy questions from these and
            cites the document it used
          </p>
        </div>

        {canPublish && (
          <Button
            size="sm"
            onClick={() => setShowUpload((v) => !v)}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            {showUpload ? <X className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            {showUpload ? "Cancel" : "Add Document"}
          </Button>
        )}
      </div>

      {loadError && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Upload */}
      {showUpload && canPublish && (
        <form
          onSubmit={upload}
          className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Title <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maternity and Paternity Leave Policy"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Content <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Load from a text file
              </button>
              <input
                ref={fileInput}
                type="file"
                accept={READABLE_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) readFile(file)
                  e.target.value = ""
                }}
              />
            </div>
            <Textarea
              required
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the policy text here. For a PDF, open it, select all, and paste."
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-zinc-400">
              {content.trim().length.toLocaleString()} characters · split into passages and
              indexed on upload
            </p>
          </div>

          {/* Who the document applies to.
              Nothing ticked means everyone, which is right for a handbook. Tick
              a type only for a policy that genuinely differs by engagement —
              the assistant will then never read it to anyone else. */}
          <div className="space-y-2 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <div className="flex items-center gap-1.5">
              <Users2 className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Who does this apply to?
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {EMPLOYMENT_TYPES.map((type) => {
                const checked = audience.includes(type)
                return (
                  <label
                    key={type}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                      checked
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                        : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setAudience((prev) =>
                          e.target.checked ? [...prev, type] : prev.filter((t) => t !== type),
                        )
                      }
                      className="h-3 w-3 rounded-xs"
                    />
                    {EMPLOYMENT_TYPE_LABELS[type]}
                  </label>
                )
              })}
            </div>

            <p className="text-[10px] text-zinc-400">
              {audience.length === 0 || audience.length === EMPLOYMENT_TYPES.length
                ? 'Everyone. Leave it like this for handbooks and general procedures.'
                : `Only ${audience.map((t) => EMPLOYMENT_TYPE_LABELS[t]).join(', ')} staff. The assistant will not read this to anybody else.`}
            </p>
          </div>

          {uploadError && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-[11px]">{uploadError}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={isUploading || content.trim().length < 50 || !title.trim()}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Indexing…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload &amp; Index
              </>
            )}
          </Button>
        </form>
      )}

      {/* Search — the same retrieval the assistant uses, exposed directly */}
      <form onSubmit={search} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the policies — try a question, not just keywords"
            className="h-9 pl-9 text-xs"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={isSearching || query.trim().length < 2}
          variant="outline"
          className="h-9 text-xs"
        >
          {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
        </Button>
      </form>

      {hits && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {hits.length === 0
                ? "Nothing in the policies covers that"
                : `${hits.length} matching passage${hits.length === 1 ? "" : "s"}`}
            </p>
            <button
              type="button"
              onClick={() => setHits(null)}
              className="text-[11px] text-zinc-500 hover:underline"
            >
              Clear
            </button>
          </div>
          {hits.map((hit) => (
            <div
              key={`${hit.documentTitle}-${hit.chunkIndex}`}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {hit.documentTitle}
                </span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                  {(hit.similarity * 100).toFixed(0)}% match
                </Badge>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {hit.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Corpus */}
      {documents === null ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-xs text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading documents…</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No policies uploaded yet
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-sm">
              {canPublish
                ? "Add one and the assistant can start answering policy questions from it."
                : "Until HR uploads a policy, the assistant will say it has none to draw on."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {doc.title}
                    </p>
                    {/* Only shown when the document is restricted. An "Everyone"
                        badge on almost every row would be noise, and the absence
                        of a badge already says it. */}
                    {doc.audienceEmploymentTypes.length > 0 &&
                      doc.audienceEmploymentTypes.map((type) => (
                        <Badge
                          key={type}
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 border-indigo-300 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300"
                        >
                          {EMPLOYMENT_TYPE_LABELS[type]} only
                        </Badge>
                      ))}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {doc.chunkCount} passage{doc.chunkCount === 1 ? "" : "s"} indexed ·{" "}
                    {new Date(doc.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {canPublish && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void remove(doc)}
                  className="h-8 gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
