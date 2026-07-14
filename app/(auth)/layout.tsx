import { archivo } from "@/lib/fonts"
import "../modernist.css"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`modernist grid min-h-svh lg:grid-cols-2 ${archivo.className}`}>
      {children}
    </div>
  )
}
