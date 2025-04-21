import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  Download, 
  ArrowRight, 
  Timer, 
  FileIcon, 
  CheckCircle
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FileInfo {
  name: string;
  size: number;
  downloadUrl: string;
}

export default function DownloadSection() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [expiryTime, setExpiryTime] = useState<{ minutes: number; seconds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isTimeout, setIsTimeout] = useState(false);
  const [timeoutDuration, setTimeoutDuration] = useState(0);
  const [timeoutRemaining, setTimeoutRemaining] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Verify code mutation
  const verifyCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/files/verify", { code });
      return response.json();
    },
    onSuccess: (data) => {
      setFileInfo(data);
      setError(null);
      setAttemptsLeft(3); // Reset attempts after successful verification
      
      // Start expiry timer for download link (3 minutes)
      setExpiryTime({ minutes: 2, seconds: 59 });
    },
    onError: (error: Error) => {
      // Handle invalid code
      setAttemptsLeft((prev) => prev - 1);
      setError(error.message || "Invalid connection code. Please try again.");
      
      if (attemptsLeft <= 1) {
        // Calculate timeout duration (2 min, then 4 min, then 8 min, etc.)
        const newDuration = timeoutDuration === 0 ? 120 : timeoutDuration * 2;
        setTimeoutDuration(newDuration);
        setTimeoutRemaining(newDuration);
        setIsTimeout(true);
        
        // Start timeout timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        timerRef.current = setInterval(() => {
          setTimeoutRemaining((prev) => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              setIsTimeout(false);
              setAttemptsLeft(3);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    },
  });

  // Download file mutation
  const downloadFileMutation = useMutation({
    mutationFn: async () => {
      if (!fileInfo) return;
      
      // Create a temporary link to download the file
      const a = document.createElement("a");
      a.href = fileInfo.downloadUrl;
      a.download = fileInfo.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Notify the server that download has started
      await apiRequest("POST", "/api/files/downloaded", { code });
      return true;
    },
    onSuccess: () => {
      setShowSuccess(true);
      setFileInfo(null);
      setExpiryTime(null);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setCode("");
      }, 5000);
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download the file",
        variant: "destructive",
      });
    },
  });

  // Handle download link expiry timer
  useEffect(() => {
    if (!expiryTime) return;
    
    const timer = setInterval(() => {
      setExpiryTime((prev) => {
        if (!prev) return null;
        
        if (prev.seconds === 0) {
          if (prev.minutes === 0) {
            clearInterval(timer);
            setFileInfo(null);
            toast({
              title: "Link expired",
              description: "The download link has expired",
              variant: "destructive",
            });
            return null;
          }
          return { minutes: prev.minutes - 1, seconds: 59 };
        } else {
          return { ...prev, seconds: prev.seconds - 1 };
        }
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiryTime, toast]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleVerifyCode = () => {
    if (!code.trim()) {
      setError("Please enter a connection code.");
      return;
    }
    
    if (isTimeout) return;
    
    verifyCodeMutation.mutate(code.trim().toUpperCase());
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-700 mb-4">Download a File</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        {!fileInfo && !showSuccess && (
          <div>
            <p className="text-sm text-neutral-600 mb-4">Enter the connection code you received:</p>
            <div className="flex items-center">
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="flex-1 border border-neutral-300 rounded-l-lg p-4 text-center text-xl tracking-widest font-mono uppercase"
                placeholder="Enter code"
                maxLength={10}
                disabled={isTimeout}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyCode();
                }}
              />
              <Button
                onClick={handleVerifyCode}
                disabled={isTimeout || verifyCodeMutation.isPending}
                className="bg-primary text-white p-4 h-14 rounded-r-lg"
              >
                {verifyCodeMutation.isPending ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
              </Button>
            </div>
            
            {error && (
              <div className="mt-4 text-red-600 text-sm">
                <p>{error}</p>
                <p className="mt-1 text-xs">
                  Attempts remaining: {attemptsLeft}
                </p>
              </div>
            )}
            
            {isTimeout && (
              <Alert variant="destructive" className="mt-4 bg-red-50 p-4 rounded border-l-4 border-red-500">
                <Timer className="h-4 w-4" />
                <AlertTitle>Too many incorrect attempts</AlertTitle>
                <AlertDescription>
                  Please wait {formatTime(timeoutRemaining)} before trying again.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {fileInfo && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-700">File Ready for Download</h3>
              {expiryTime && (
                <div className="text-xs text-neutral-500 flex items-center">
                  <Schedule className="w-4 h-4 mr-1" />
                  Link expires in {expiryTime.minutes}:{expiryTime.seconds < 10 ? `0${expiryTime.seconds}` : expiryTime.seconds}
                </div>
              )}
            </div>
            
            <div className="bg-neutral-100 p-4 rounded-lg flex items-center justify-between mb-4">
              <div className="flex items-center">
                <FileIcon className="text-neutral-500 mr-3 text-2xl" />
                <div>
                  <p className="font-medium text-neutral-700">{fileInfo.name}</p>
                  <p className="text-xs text-neutral-500">{formatFileSize(fileInfo.size)}</p>
                </div>
              </div>
              <Button
                onClick={() => downloadFileMutation.mutate()}
                disabled={downloadFileMutation.isPending}
                className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-full font-medium flex items-center"
              >
                {downloadFileMutation.isPending ? (
                  <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Download
              </Button>
            </div>
            
            <div className="text-xs text-neutral-600">
              <p>⚠️ This file will only be available for 3 minutes, and can only be downloaded once.</p>
            </div>
          </div>
        )}
        
        {showSuccess && (
          <Alert className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-800">Download Successful</AlertTitle>
            <AlertDescription className="text-green-700">
              The file has been successfully downloaded to your device.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
