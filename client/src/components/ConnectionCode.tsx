import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, Check, CalendarCheck2, Info } from "lucide-react";

interface ConnectionCodeProps {
  code: string;
  expiryMinutes: number;
}

export default function ConnectionCode({ code, expiryMinutes = 10 }: ConnectionCodeProps) {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number }>({
    minutes: expiryMinutes - 1,
    seconds: 59,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime.seconds === 0) {
          if (prevTime.minutes === 0) {
            clearInterval(timer);
            toast({
              title: "Code expired",
              description: "Your connection code has expired",
              variant: "destructive",
            });
            return prevTime;
          }
          return { minutes: prevTime.minutes - 1, seconds: 59 };
        } else {
          return { ...prevTime, seconds: prevTime.seconds - 1 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [toast]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Connection code copied to clipboard",
      });
      
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy the code to clipboard",
        variant: "destructive",
      });
    }
  };

  const formattedTime = `${timeLeft.minutes}:${
    timeLeft.seconds < 10 ? `0${timeLeft.seconds}` : timeLeft.seconds
  }`;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-neutral-700 mb-4">Your File is Ready to Share</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <p className="text-sm text-neutral-600 mb-2">Share this connection code with the recipient:</p>
          <div className="flex items-center">
            <div className="bg-neutral-100 text-2xl tracking-widest font-mono p-4 rounded-l-lg flex-1 text-center font-bold text-neutral-700">
              {code}
            </div>
            <button
              onClick={handleCopyCode}
              className="bg-primary text-white p-4 rounded-r-lg hover:bg-primary/90 transition-colors"
            >
              {copied ? <Check className="h-5 w-5" /> : <Clipboard className="h-5 w-5" />}
            </button>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500 flex items-center">
                <CalendarCheck2 className="w-4 h-4 mr-1" />
                Code expires in {formattedTime}
              </p>
              {copied && (
                <p className="text-xs text-green-600 font-medium flex items-center">
                  <Check className="w-4 h-4 mr-1" />
                  Code copied to clipboard!
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t border-neutral-200 pt-4">
          <div className="flex items-start">
            <Info className="w-4 h-4 text-neutral-500 mt-1 flex-shrink-0" />
            <div className="ml-2 text-xs text-neutral-600">
              <p>The recipient must enter this code to download your file. Once downloaded, the file will no longer be available.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
