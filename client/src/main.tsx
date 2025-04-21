import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Use the current origin as the redirect URI
const redirectUri = window.location.origin;

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider 
    clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""} 
    redirectUri={redirectUri}
  >
    <App />
  </GoogleOAuthProvider>
);
