import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={process.env.GOOGLE_CLIENT_ID || ""}>
    <App />
  </GoogleOAuthProvider>
);
