import React from "react"
import { Settings, Shield, Bot, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Organization Settings
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Configure AI parameters, company branding, and integration webhooks
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          General Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-medium text-zinc-700 dark:text-zinc-300">Company Name</label>
            <Input defaultValue="Nexora Technologies Inc." className="text-xs h-9" />
          </div>
          <div className="space-y-1.5">
            <label className="font-medium text-zinc-700 dark:text-zinc-300">Default HR Contact</label>
            <Input defaultValue="hr@nexora.com" className="text-xs h-9" />
          </div>
        </div>

        <div className="pt-2">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
