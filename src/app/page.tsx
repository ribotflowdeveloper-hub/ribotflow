import { Loader2 } from "lucide-react";

// Aquesta pàgina només es veurà un instant (si arriba a veure's)
// mentre el middleware fa la redirecció.
export default function HomePage() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin" />
    </div>
  );
}