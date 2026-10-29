import { useEffect, useState } from "react";
import { WalletCards } from "lucide-react";

let hasDisplayedLoadingIndicator = false;

export function AppLoadingScreen({ message = "Ouverture de votre espace…" }: { message?: string }) {
  const [showIndicator, setShowIndicator] = useState(() => hasDisplayedLoadingIndicator);

  useEffect(() => {
    if (hasDisplayedLoadingIndicator) {
      setShowIndicator(true);
      return;
    }
    const timer = window.setTimeout(() => {
      hasDisplayedLoadingIndicator = true;
      setShowIndicator(true);
    }, 180);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="app-loading-screen" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">{message}</span>
      {showIndicator && (
        <div className="app-loading-content" aria-hidden="true">
          <span className="app-loading-mark"><WalletCards className="h-5 w-5" /></span>
          <span className="app-loading-brand">CAISSE FAMILIALE</span>
          <span className="app-loading-message">{message}</span>
          <span className="app-loading-track"><span /></span>
        </div>
      )}
    </main>
  );
}

export function DashboardLayoutSkeleton() {
  return <AppLoadingScreen />;
}
