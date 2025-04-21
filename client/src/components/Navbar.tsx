import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGoogleLogin } from "@react-oauth/google";
import { useToast } from "@/hooks/use-toast";

export default function Navbar() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      try {
        await login(codeResponse.code);
        toast({
          title: "Login successful",
          description: "You are now logged in",
        });
      } catch (error) {
        toast({
          title: "Login failed",
          description: "There was an error logging in with Google",
          variant: "destructive",
        });
      } finally {
        setIsLoggingIn(false);
      }
    },
    onError: () => {
      toast({
        title: "Login failed",
        description: "There was an error logging in with Google",
        variant: "destructive",
      });
      setIsLoggingIn(false);
    },
  });

  const handleLogin = () => {
    setIsLoggingIn(true);
    googleLogin();
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logout successful",
        description: "You have been logged out",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error logging out",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="material-icons">send</span>
          <h1 className="text-xl font-bold">FileShare</h1>
        </div>
        
        {!isAuthenticated ? (
          <Button 
            variant="secondary" 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="bg-white text-primary hover:bg-neutral-100 px-4 py-2 rounded-full font-medium flex items-center"
          >
            <img 
              src="https://developers.google.com/identity/images/g-logo.png" 
              alt="Google logo" 
              className="w-4 h-4 mr-2" 
            />
            {isLoggingIn ? "Logging in..." : "Login with Google"}
          </Button>
        ) : (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.picture} />
                <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline-block">{user?.name}</span>
            </div>
            <Button 
              variant="secondary"
              onClick={handleLogout}
              className="bg-white text-primary hover:bg-neutral-100 px-4 py-1 rounded-full text-sm font-medium"
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
