import React from "react"
import { FileText, Upload, CheckCircle2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export const DocumentsPage: React.FC = () => {
  const documents = [
    { title: "Leave Policy 2026", category: "Time Off", version: "v4.2", lastUpdated: "Jul 28, 2026", indexed: true },
    { title: "Employee Code of Conduct", category: "Compliance", version: "v2.0", lastUpdated: "Jan 10, 2026", indexed: true },
    { title: "Group Medical Insurance Scheme", category: "Benefits", version: "v3.1", lastUpdated: "May 15, 2026", indexed: true },
    { title: "Remote Work & Hybrid Guidelines", category: "Workplace", version: "v2.4", lastUpdated: "Jun 02, 2026", indexed: true },
    { title: "Travel & Expense Reimbursement Policy", category: "Finance", version: "v1.8", lastUpdated: "Apr 11, 2026", indexed: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Company Policies & Documents
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Source documents indexed for Assistify AI vector citations
          </p>
        </div>

        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
          <Upload className="h-4 w-4" />
          <span>Upload Policy</span>
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <Input placeholder="Search policies & handbooks..." className="h-8 pl-8 text-xs" />
          </div>
          <Badge variant="active" className="gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            <span>28 Documents Synchronized</span>
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-medium">Document Title</th>
                <th className="py-2.5 px-3 font-medium">Category</th>
                <th className="py-2.5 px-3 font-medium">Version</th>
                <th className="py-2.5 px-3 font-medium">Last Indexed</th>
                <th className="py-2.5 px-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {documents.map((doc) => (
                <tr key={doc.title} className="h-10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{doc.title}</span>
                  </td>
                  <td className="py-2 px-3 text-zinc-500">{doc.category}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-300">{doc.version}</td>
                  <td className="py-2 px-3 text-zinc-500 tabular-nums">{doc.lastUpdated}</td>
                  <td className="py-2 px-3 text-right">
                    <Badge variant="active">Indexed</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
