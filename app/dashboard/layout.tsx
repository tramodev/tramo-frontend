import { archivo } from "@/lib/fonts"
import "../modernist.css"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`modernist ${archivo.className} contents`}>
      {children}
    </div>
  )
}