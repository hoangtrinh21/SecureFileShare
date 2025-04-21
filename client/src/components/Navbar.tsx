import { Link } from "wouter";

export default function Navbar() {
  return (
    <nav className="bg-background border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/">
            <a className="text-xl font-bold">FileShare</a>
          </Link>
        </div>
      </div>
    </nav>
  );
}