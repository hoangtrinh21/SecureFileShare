import { useState } from "react";
import Navbar from "@/components/Navbar";
import FileUpload from "@/components/FileUpload";
import ConnectionCode from "@/components/ConnectionCode";
import DownloadSection from "@/components/DownloadSection";
import Footer from "@/components/Footer";

export default function Home() {
  const [connectionCode, setConnectionCode] = useState<string | null>(null);

  const handleUploadComplete = (code: string) => {
    setConnectionCode(code);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100">
      <Navbar />
      
      <main className="container mx-auto p-4 pt-8 max-w-4xl flex-grow">
        {connectionCode ? (
          <ConnectionCode code={connectionCode} expiryMinutes={10} />
        ) : (
          <FileUpload onUploadComplete={handleUploadComplete} />
        )}
        
        <DownloadSection />
      </main>
      
      <Footer />
    </div>
  );
}
