import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { AppLoadingScreen } from "./components/DashboardLayoutSkeleton";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));

function HomeRoute() {
  return (
    <Suspense fallback={<AppLoadingScreen message="Préparation de votre espace familial…" />}>
      <Home />
    </Suspense>
  );
}

function useHashLocation(): [string, (next: string) => void] {
  const readHash = () => {
    const value = window.location.hash.replace(/^#/, "");
    return value.startsWith("/") ? value : value ? `/${value}` : "/";
  };
  const [location, setLocation] = useState(readHash);
  useEffect(() => {
    const onHashChange = () => setLocation(readHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return [location, (next) => { window.location.hash = next; }];
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/members" component={HomeRoute} />
      <Route path="/contributions" component={HomeRoute} />
      <Route path="/cash" component={HomeRoute} />
      <Route path="/history" component={HomeRoute} />
      <Route path="/reports" component={HomeRoute} />
      <Route path="/statistics" component={HomeRoute} />
      <Route path="/status" component={HomeRoute} />
      <Route path="/announcements" component={HomeRoute} />
      <Route path="/audit" component={HomeRoute} />
      <Route path="/settings" component={HomeRoute} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <WouterRouter hook={useHashLocation}>
            <DashboardLayout>
              <Router />
            </DashboardLayout>
          </WouterRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
