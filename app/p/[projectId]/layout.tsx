import { SidebarProvider } from "@/components/ui/sidebar"
import { archivo } from "@/lib/fonts"
import "../../modernist.css"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`modernist ${archivo.className} contents`}>
      <SidebarProvider style={{ "--sidebar-width": "280px" } as React.CSSProperties}>
        {children}
      </SidebarProvider>
    </div>
  )
}
