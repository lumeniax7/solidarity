import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useEffect, useState } from "react";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

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
  return <Switch>
        <Route path="/" component={Home} />
        <Route path="/members" component={Home} />
        <Route path="/contributions" component={Home} />
        <Route path="/cash" component={Home} />
        <Route path="/history" component={Home} />
        <Route path="/reports" component={Home} />
        <Route path="/statistics" component={Home} />
        <Route path="/status" component={Home} />
        <Route path="/announcements" component={Home} />
        <Route path="/audit" component={Home} />
        <Route path="/settings" component={Home} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><WouterRouter hook={useHashLocation}><DashboardLayout><Router /></DashboardLayout></WouterRouter></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
