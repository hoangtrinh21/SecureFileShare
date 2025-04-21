import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CloudUpload, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  onUploadComplete: (code: string) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });
      
      return new Promise<{ code: string }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.responseText || "Upload failed"));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error("Network error occurred during upload"));
        };
        
        xhr.open("POST", "/api/files/upload", true);
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Upload successful",
        description: "Your file has been uploaded successfully",
      });
      onUploadComplete(data.code);
    },
    onError: (error: Error) => {
      setError(error.message);
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds the maximum limit (2MB). Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!isAuthenticated) {
      setError("Please login to upload files");
      return;
    }
    
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    
    if (validateFile(droppedFile)) {
      setFile(droppedFile);
      setUploadProgress(0);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate(file);
  };

  const cancelUpload = () => {
    uploadMutation.reset();
    setFile(null);
    setUploadProgress(0);
    setError(null);
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-neutral-700 mb-4">Share a File</h2>
      
      {!isAuthenticated && (
        <Alert variant="warning" className="mb-4 bg-yellow-50 border-l-4 border-yellow-400">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please login with your Google account to upload files.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {!file ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
              isDragging ? "border-primary bg-primary/5" : "border-neutral-300 hover:border-primary"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload className="mx-auto h-12 w-12 text-neutral-400 mb-2" />
            <p className="text-lg text-neutral-600 mb-2">Drag and drop your file here</p>
            <p className="text-sm text-neutral-500 mb-4">or</p>
            <button
              disabled={!isAuthenticated}
              className="bg-primary text-white px-6 py-3 rounded-full font-medium disabled:opacity-50"
            >
              Browse Files
            </button>
            <input
              type="file"
              id="fileInput"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              disabled={!isAuthenticated}
            />
            <p className="text-xs text-neutral-500 mt-4">Maximum file size: 2MB</p>
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-neutral-700">{file.name}</span>
              <span className="text-xs text-neutral-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            
            <Progress value={uploadProgress} className="h-2.5 bg-neutral-200" />
            
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-neutral-500">
                {uploadMutation.isPending 
                  ? `${uploadProgress}% uploaded` 
                  : "Ready to upload"}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={cancelUpload}
                  className="text-xs text-red-600 font-medium"
                >
                  Cancel
                </button>
                {!uploadMutation.isPending && (
                  <button
                    onClick={handleUpload}
                    className="text-xs text-primary font-medium"
                  >
                    Upload
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mt-6 bg-red-50 border-l-4 border-red-500">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Upload Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
