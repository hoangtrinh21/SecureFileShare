import { Send } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-neutral-700 text-neutral-300 mt-12 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Send className="h-5 w-5 mr-2" />
            <p>FileShare &copy; {new Date().getFullYear()}</p>
          </div>
          <div className="text-sm">
            <p>Secure one-time file sharing for authenticated users</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
