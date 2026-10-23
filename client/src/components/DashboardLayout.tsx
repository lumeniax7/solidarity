import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  ArrowDownToLine,
  BarChart3,
  Bell,
  BookOpenCheck,
  ChartNoAxesCombined,
  ChevronRight,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Moon,
  Sun,
  Settings2,
  ShieldCheck,
  WalletCards,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTheme } from "../contexts/ThemeContext";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/" },
  { icon: Users, label: "Membres", path: "/members" },
  { icon: WalletCards, label: "Cotisations", path: "/contributions" },
  { icon: ArrowDownToLine, label: "Caisse", path: "/cash" },
  { icon: BookOpenCheck, label: "Historique", path: "/history" },
  { icon: FileBarChart, label: "Rapports", path: "/reports" },
  { icon: ChartNoAxesCombined, label: "Statistiques", path: "/statistics" },
  { icon: BarChart3, label: "Situations", path: "/status" },
  { icon: Bell, label: "Annonces", path: "/announcements" },
  { icon: ShieldCheck, label: "Journal d’audit", path: "/audit" },
  { icon: Settings2, label: "Paramètres", path: "/settings", adminOnly: true },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 268;
const MIN_WIDTH = 220;
const MAX_WIDTH = 400;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, signIn, signUp, error: authError } = useAuth();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authNotice, setAuthNotice] = useState("");

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <div className="auth-shell relative grid min-h-screen place-items-center px-5 py-24 sm:px-8">
        <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-8"><ThemeToggle /></div>
        <div className="auth-stage">
          <section className="auth-showcase" aria-label="Bienvenue dans Caisse Familiale">
            <div className="auth-brand">
              <span className="auth-brand-mark"><WalletCards className="h-6 w-6" /></span>
              <span><strong>CAISSE FAMILIALE</strong><small>GESTION SOLIDAIRE</small></span>
            </div>
            <div className="auth-showcase-copy">
              <p className="auth-eyebrow">ENSEMBLE, EN TOUTE CONFIANCE</p>
              <h2>La solidarité<br /><em>avec clarté.</em></h2>
              <p>Une vision sereine de votre caisse familiale : les contributions, le solde commun et chaque mouvement réunis au même endroit.</p>
            </div>
            <div className="auth-showcase-footer">
              <span className="auth-seal" aria-hidden="true">✦</span>
              <span>La confiance se construit<br />dans la transparence.</span>
              <span className="auth-footer-rule" />
              <span className="auth-footer-index">01 — 03</span>
            </div>
          </section>
          <section className="auth-card">
            <p className="auth-kicker">ESPACE FAMILIAL</p>
            <h1>{authMode === "signin" ? "Heureux de vous revoir" : "Bienvenue dans votre caisse"}</h1>
            <p className="auth-intro">{authMode === "signin" ? "Connectez-vous pour retrouver votre espace en toute sécurité." : "Créez votre espace familial et suivez vos cotisations en toute simplicité."}</p>
            <form className="auth-form" onSubmit={async (event) => { event.preventDefault(); setAuthSubmitting(true); setAuthNotice(""); try { if (authMode === "signup") { const result = await signUp(authEmail, authPassword, authName); if (!result.session) setAuthNotice("Compte créé. Vérifiez votre e-mail pour confirmer l’inscription."); } else { await signIn(authEmail, authPassword); } } catch {} finally { setAuthSubmitting(false); } }}>
              {authMode === "signup" && <Input value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Nom complet" required className="h-11 rounded-xl" />}
              <Input type="text" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="Identifiant" required className="h-11 rounded-xl" />
              <Input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Mot de passe" minLength={5} required className="h-11 rounded-xl" />
              {(authError || undefined) && <p className="auth-message auth-error">{authError?.message}</p>}
              {authNotice && <p className="auth-message auth-success">{authNotice}</p>}
              <Button type="submit" disabled={authSubmitting} size="lg" className="auth-submit w-full rounded-xl">{authSubmitting ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Connexion…</span> : authMode === "signup" ? "Créer mon compte" : "Se connecter"}</Button>
            </form>
            <div className="auth-switch-row">
              <span>{authMode === "signin" ? "Nouveau dans votre caisse ?" : "Vous avez déjà un compte ?"}</span>
              <button type="button" onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")} className="auth-switch">{authMode === "signin" ? "Créer un compte" : "Se connecter"}</button>
            </div>
            <p className="auth-privacy"><span aria-hidden="true">◆</span> Votre espace familial, privé et sécurisé</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = { children: React.ReactNode; setSidebarWidth: (width: number) => void };

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const visibleItems = menuItems.filter((item) => !item.adminOnly || user?.role === "admin");
  const activeMenuItem = visibleItems.find((item) => item.path === location);


  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar" disableTransition={isResizing}>
          <SidebarHeader className="h-[76px] justify-center border-b border-sidebar-border">
            <div className="flex w-full items-center gap-3 px-2">
              <button onClick={toggleSidebar} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition active:scale-95" aria-label="Réduire le menu"><PanelLeft className="h-4 w-4" /></button>
              {!isCollapsed && <div className="min-w-0"><p className="truncate text-[13px] font-semibold tracking-tight text-sidebar-foreground">Caisse Familiale</p><p className="truncate text-[11px] text-muted-foreground">Gestion solidaire</p></div>}
            </div>
          </SidebarHeader>
          <SidebarContent className="gap-0 px-2 py-4">
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground group-data-[collapsible=icon]:hidden">Navigation</div>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive = location === item.path;
                return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={isActive} onClick={() => { setLocation(item.path); if (isMobile) setOpenMobile(false); }} tooltip={item.label} className={`h-11 rounded-xl font-medium transition-all ${isActive ? "bg-[#f2c766] text-[#243447] shadow-sm hover:bg-[#f2c766]" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}><item.icon className="h-[17px] w-[17px]" /><span>{item.label}</span>{isActive && !isCollapsed && <ChevronRight className="ml-auto h-3.5 w-3.5" />}</SidebarMenuButton></SidebarMenuItem>;
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"><Avatar className="h-9 w-9 shrink-0 border-2 border-white shadow-sm"><AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">{user?.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-semibold text-sidebar-foreground">{user?.name || "Utilisateur"}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{user?.role === "admin" ? "Administrateur" : "Membre"}</p></div></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52"><DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600"><LogOut className="mr-2 h-4 w-4" />Se déconnecter</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => setIsResizing(true)} />
      </div>
      <SidebarInset className="bg-background">
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8"><div className="flex items-center gap-2">{isMobile && <SidebarTrigger className="h-9 w-9 rounded-xl bg-card" />}<span className="text-sm font-semibold text-foreground">{activeMenuItem?.label ?? "Caisse Familiale"}</span></div><ThemeToggle theme={theme} toggleTheme={toggleTheme} /></div>
        <main className="min-h-[calc(100vh-3.5rem)] p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}

function ThemeToggle({ theme: themeProp, toggleTheme: toggleProp }: { theme?: "light" | "dark"; toggleTheme?: () => void }) {
  const context = useTheme();
  const theme = themeProp ?? context.theme;
  const toggleTheme = toggleProp ?? context.toggleTheme;
  const nextMode = theme === "light" ? "nuit" : "jour";
  return (
    <button type="button" onClick={toggleTheme} className="theme-toggle inline-flex h-10 items-center gap-2 rounded-xl border border-primary/25 bg-card px-3.5 text-xs font-bold text-primary shadow-md hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label={`Activer le mode ${nextMode}`} title={`Activer le mode ${nextMode}`}>
      {theme === "light" ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
      <span>Mode {nextMode}</span>
    </button>
  );
}
