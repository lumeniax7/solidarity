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
  Bell,
  BookOpenCheck,
  ChartNoAxesCombined,
  ChevronRight,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Settings2,
  ShieldCheck,
  WalletCards,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
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
      <div className="min-h-screen grid place-items-center bg-[#f7f8f4] px-6">
        <div className="w-full max-w-md rounded-3xl border border-[#dfe7df] bg-white p-8 text-center shadow-[0_24px_80px_-36px_rgba(18,66,52,0.35)]">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#0e5b49] text-[#d9f46d]"><WalletCards className="h-7 w-7" /></div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6a7c71]">Caisse Familiale</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#17352c]">Votre caisse, en toute clarté.</h1>
          <p className="mt-3 text-sm leading-6 text-[#718078]">Connectez-vous pour consulter les cotisations, le solde commun et les mouvements familiaux.</p>
          <form className="mt-7 space-y-3 text-left" onSubmit={async (event) => { event.preventDefault(); setAuthSubmitting(true); setAuthNotice(""); try { if (authMode === "signup") { const result = await signUp(authEmail, authPassword, authName); if (!result.session) setAuthNotice("Compte créé. Vérifiez votre e-mail pour confirmer l’inscription."); } else { await signIn(authEmail, authPassword); } } catch {} finally { setAuthSubmitting(false); } }}>
            {authMode === "signup" && <Input value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Nom complet" required className="h-11 rounded-xl" />}
            <Input type="text" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="Identifiant" required className="h-11 rounded-xl" />
            <Input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Mot de passe" minLength={5} required className="h-11 rounded-xl" />
            {(authError || undefined) && <p className="rounded-xl bg-[#fff2ef] px-3 py-2 text-xs leading-5 text-[#a64e43]">{authError?.message}</p>}
            {authNotice && <p className="rounded-xl bg-[#e8f5ec] px-3 py-2 text-xs leading-5 text-[#23734c]">{authNotice}</p>}
            <Button type="submit" disabled={authSubmitting} size="lg" className="w-full rounded-xl bg-[#0e5b49] text-white hover:bg-[#0a493b]">{authSubmitting ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Connexion…</span> : authMode === "signup" ? "Créer mon compte" : "Se connecter"}</Button>
          </form>
          <button type="button" onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")} className="mt-4 text-xs font-semibold text-[#0e5b49] hover:underline">{authMode === "signin" ? "Créer un compte familial" : "J’ai déjà un compte"}</button>
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
        <Sidebar collapsible="icon" className="border-r border-[#dce5dd] bg-[#f4f7f2]" disableTransition={isResizing}>
          <SidebarHeader className="h-[76px] justify-center border-b border-[#dce5dd]">
            <div className="flex w-full items-center gap-3 px-2">
              <button onClick={toggleSidebar} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0e5b49] text-[#d9f46d] transition active:scale-95" aria-label="Réduire le menu"><PanelLeft className="h-4 w-4" /></button>
              {!isCollapsed && <div className="min-w-0"><p className="truncate text-[13px] font-semibold tracking-tight text-[#17352c]">Caisse Familiale</p><p className="truncate text-[11px] text-[#7b8b82]">Gestion solidaire</p></div>}
            </div>
          </SidebarHeader>
          <SidebarContent className="gap-0 px-2 py-4">
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#91a098] group-data-[collapsible=icon]:hidden">Navigation</div>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive = location === item.path;
                return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={isActive} onClick={() => { setLocation(item.path); if (isMobile) setOpenMobile(false); }} tooltip={item.label} className={`h-11 rounded-xl font-medium transition-all ${isActive ? "bg-[#d9f46d] text-[#17352c] shadow-sm hover:bg-[#d9f46d]" : "text-[#65786d] hover:bg-white hover:text-[#17352c]"}`}><item.icon className="h-[17px] w-[17px]" /><span>{item.label}</span>{isActive && !isCollapsed && <ChevronRight className="ml-auto h-3.5 w-3.5" />}</SidebarMenuButton></SidebarMenuItem>;
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-[#dce5dd] p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0e5b49]"><Avatar className="h-9 w-9 shrink-0 border-2 border-white shadow-sm"><AvatarFallback className="bg-[#dcefe5] text-xs font-bold text-[#0e5b49]">{user?.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-semibold text-[#17352c]">{user?.name || "Utilisateur"}</p><p className="mt-0.5 truncate text-[11px] text-[#7b8b82]">{user?.role === "admin" ? "Administrateur" : "Membre"}</p></div></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600"><LogOut className="mr-2 h-4 w-4" />Se déconnecter</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-[#0e5b49]/20 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => setIsResizing(true)} />
      </div>
      <SidebarInset className="bg-[#f7f8f4]">
        {isMobile && <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#dce5dd] bg-[#f7f8f4]/95 px-4 backdrop-blur"><div className="flex items-center gap-2"><SidebarTrigger className="h-9 w-9 rounded-xl bg-white" /><span className="text-sm font-semibold text-[#17352c]">{activeMenuItem?.label ?? "Caisse Familiale"}</span></div><div className="h-2 w-2 rounded-full bg-[#d9f46d] ring-4 ring-[#d9f46d]/20" /></div>}
        <main className="min-h-[calc(100vh-3.5rem)] p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
