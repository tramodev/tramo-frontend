import { SidebarProvider } from "@/components/ui/sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="contents">
      <SidebarProvider
        style={{ "--sidebar-width": "280px" } as React.CSSProperties}
        className="h-screen min-h-0 flex-col"
      >
        {children}
      </SidebarProvider>
    </div>
  )
}
