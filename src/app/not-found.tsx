import Link from "next/link";
import { Star } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <Star className="w-16 h-16 text-primary animate-pulse" />
        </div>

        <div>
          <h1 className="text-6xl font-bold mb-2">404</h1>
          <h2 className="text-2xl font-semibold mb-2">
            Lost in the Cosmic Universe
          </h2>
          <p className="text-muted-foreground">
            The page you&apos;re looking for seems to have drifted into the unknown depths of
            space. Let&apos;s guide you back to the cosmic path.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/"
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors"
          >
            Return Home
          </Link>
          <Link
            href="/read"
            className="px-6 py-3 border-2 border-secondary/50 hover:border-secondary text-foreground rounded-lg font-semibold transition-colors"
          >
            Get a Reading
          </Link>
        </div>
      </div>
    </div>
  );
}
