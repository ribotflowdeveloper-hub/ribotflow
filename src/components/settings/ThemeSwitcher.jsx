import * as React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Laptop } from "lucide-react"

export function ThemeSwitcher() {
  // Ara també obtenim el tema actiu
  const { theme, setTheme } = useTheme()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Button 
        variant={theme === 'light' ? 'default' : 'outline'} 
        onClick={() => setTheme("light")} 
        className="flex flex-col h-24 gap-2"
      >
        <Sun className="w-6 h-6" />
        <span>Clar</span>
      </Button>
      <Button 
        variant={theme === 'dark' ? 'default' : 'outline'} 
        onClick={() => setTheme("dark")} 
        className="flex flex-col h-24 gap-2"
      >
        <Moon className="w-6 h-6" />
        <span>Fosc</span>
      </Button>
 
    </div>
  )
}