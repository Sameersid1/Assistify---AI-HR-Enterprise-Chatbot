import React, { useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { Sheet, SheetContent } from "@/components/ui/sheet"

export const AppLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans antialiased text-zinc-900 dark:text-zinc-100">
      {/* Desktop Fixed Left Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      {/* Mobile Drawer (under 768px) */}
      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r border-zinc-200 dark:border-zinc-800">
          <Sidebar
            isCollapsed={false}
            setIsCollapsed={() => {}}
            onNavigate={() => setIsMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Column */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar onOpenMobileNav={() => setIsMobileNavOpen(true)} />

        {/* Scrollable Content Area: max-w-[1280px] p-6 space-y-6 */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1280px] p-6 space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
