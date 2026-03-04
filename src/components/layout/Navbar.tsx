// src/components/layout/Navbar.tsx
import React, { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { logger } from "../../shared/logger.js";
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  User,
  Settings,
  LogOut,
  BarChart2,
  FileText,
  Users,
  Home,
  Bell,
  Shield,
  Wrench,
  Sun,
  Moon,
} from "lucide-react";
import { useDarkMode } from "../../shared/useDarkMode";
import ContactAdminButton from '../common/ContactAdminButton';

// ─── Color tokens ─────────────────────────────────────────────────────────────
// Primary green: #93D500  |  Dark: #222222
// ──────────────────────────────────────────────────────────────────────────────

interface NavChild {
  label: string;
  href: string;
  /** null/undefined = visible to all, array = restricted to listed roles */
  roles?: string[] | null;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  children: NavChild[] | null;
  /** null = visible to all authenticated users */
  roles: string[] | null;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Inicio",
    icon: Home,
    href: "/",
    children: null,
    roles: null,
  },
  {
    label: "Diagnósticos",
    icon: BarChart2,
    children: [
      { label: "Nuevo diagnóstico", href: "/?form=true" },
    ],
    roles: null,
  },
  {
    label: "Herramientas",
    icon: Wrench,
    children: [
      { label: "Herramientas técnicas", href: "/otros" },
    ],
    // Solo roles técnicos (no admin, no cliente)
    roles: ["tecnico", "otro_tecnico"],
  },
  {
    label: "Administración",
    icon: Users,
    children: [
      { label: "Panel de control", href: "/admin" },
      { label: "Gestión de usuarios", href: "/admin/users" },
      { label: "Histórico general", href: "/admin/history" },
      { label: "Logs de auditoría", href: "/admin/logs" },
      { label: "Telemetría", href: "/admin/telemetry" },
    ],
    roles: ["admin"],
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const { dark, toggle: toggleDark } = useDarkMode();

  const toggleAccordion = (label: string) =>
    setOpenAccordion((prev) => (prev === label ? null : label));

  const handleLogout = useCallback(
    async (e?: React.MouseEvent<HTMLButtonElement>) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const confirmed = window.confirm("¿Seguro que quieres salir?");
      if (!confirmed) {
        logger.info("[Navbar] logout cancelled by user");
        return;
      }
      try {
        await logout({ force: true } as Parameters<typeof logout>[0]);
        try {
          (document.activeElement as HTMLElement | null)?.blur();
        } catch {
          /* noop */
        }
        navigate("/login", { replace: true });
      } catch (err) {
        console.error("[Navbar] logout error", err);
      }
    },
    [logout, navigate],
  );

  const role = user?.role ?? "";
  const visibleItems = NAV_ITEMS.filter(
    (item) => item.roles === null || item.roles.includes(role),
  );

  // SVG border-image gives exact 2-px dash / 2-px gap (CSS border-style:dashed
  // uses browser-determined dash lengths; border-image with SVG is the only way
  // to honour the Figma spec "dashes: 2, 2").
  const dashedBorderImage =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E" +
    "%3Crect width='100%25' height='100%25' fill='none' stroke='%23444444' " +
    "stroke-width='1' stroke-dasharray='2 2'/%3E%3C/svg%3E\") 1";

  return (
    <div className="font-sans">
      {/* Spacer so page content starts below the fixed 50px bar */}
      <div style={{ height: 50 }} />
      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      {/* Figma spec: h=50 border=1px dashed 2,2 — flush to viewport top */}
      <header
        className="flex items-center justify-between px-4 relative z-50 shadow-md"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 50,
          opacity: 1,
          backgroundColor: "#222222",
          borderWidth: 1,
          borderStyle: "solid",
          borderImage: dashedBorderImage,
        }}
      >
        {/* LEFT: Hamburger + Logo + App name */}
        <div className="flex items-center gap-3">
          {/* Hamburger — only shown when authenticated */}
          {user && (
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1 rounded transition-colors hover:bg-white/10 focus:outline-none"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <X size={22} color="#93D500" />
              ) : (
                <Menu size={22} color="#93D500" />
              )}
            </button>
          )}

          {/* Logo — Figma spec: w=165 h=46 */}
          <Link
            to={role === "admin" ? "/admin" : "/"}
            className="flex items-center"
          >
            <img
              src="/LogoChoucair.png"
              alt="Choucair"
              style={{ width: 165, height: 46, objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </Link>

          {/* App name */}
          <span
            className="text-sm font-medium hidden sm:block select-none"
            style={{ color: "#e5e7eb" }}
          >
            Visión web 360°
          </span>
        </div>

        {/* RIGHT: Bell + Profile */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              {/* Bell */}
              <button
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors relative"
                aria-label="Notificaciones"
              >
                <Bell size={18} color="#e5e7eb" />
              </button>

              {/* Dark / Light mode toggle */}
              <button
                onClick={toggleDark}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                title={dark ? "Modo claro" : "Modo oscuro"}
              >
                {dark ? (
                  <Sun size={18} color="#e5e7eb" />
                ) : (
                  <Moon size={18} color="#e5e7eb" />
                )}
              </button>

              {/* Profile button */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-black/10 transition-colors focus:outline-none"
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                >
                  <span
                    className="text-sm font-medium hidden md:block"
                    style={{ color: "#e5e7eb" }}
                  >
                    {user.name}
                  </span>

                  {/* Avatar circle */}
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow"
                    style={{ backgroundColor: "#222222", color: "#93D500" }}
                  >
                    {getInitials(user.name)}
                  </span>

                  <ChevronDown
                    size={14}
                    color="#e5e7eb"
                    className={`transition-transform duration-200 ${
                      profileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Profile dropdown */}
                {profileOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-lg shadow-xl border overflow-hidden z-50"
                    style={{ backgroundColor: "#2a2a2a", borderColor: "#3a3a3a" }}
                    onMouseLeave={() => setProfileOpen(false)}
                  >
                    {/* User info header */}
                    <div
                      className="px-4 py-3 border-b"
                      style={{ borderColor: "#3a3a3a" }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{
                            backgroundColor: "#93D500",
                            color: "#222222",
                          }}
                        >
                          {getInitials(user.name)}
                        </span>
                        <div className="min-w-0">
                          <p
                            className="text-sm font-semibold truncate"
                            style={{ color: "#e5e7eb" }}
                          >
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate" title={user.email}>
                            {user.email}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Shield size={11} />
                            {user.role}
                            {(user.authMethod === 'sso' || user.email?.endsWith('@choucairtesting.com')) && (
                              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-900/40 text-blue-300">Corporativo</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="py-1">
                      {(
                        [
                          {
                            icon: User,
                            label: "Mi Perfil",
                            action: () => navigate("/profile"),
                          },
                          {
                            icon: Settings,
                            label: "Configuración",
                            action: () => navigate("/settings"),
                          },
                        ] as Array<{
                          icon: React.ElementType;
                          label: string;
                          action: () => void;
                        }>
                      ).map(({ icon: Icon, label, action }) => (
                        <button
                          key={label}
                          onClick={() => {
                            action();
                            setProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/8 transition-colors"
                        >
                          <Icon size={15} className="text-gray-400" />
                          {label}
                        </button>
                      ))}
                    </div>

                    <div
                      className="border-t"
                      style={{ borderColor: "#3a3a3a" }}
                    >
                      <button
                        onClick={(e) => {
                          setProfileOpen(false);
                          void handleLogout(e);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-900/25"
                        style={{ color: "#f87171" }}
                      >
                        <LogOut size={15} />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Not logged in */}
          {!user && (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded text-sm font-medium transition-colors hover:bg-white/10"
                style={{ color: "#e5e7eb" }}
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded text-sm font-medium transition-colors hover:bg-white/10"
                style={{ color: "#e5e7eb" }}
              >
                Registro
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ── SIDE DRAWER / ACCORDION MENU ────────────────────────────────── */}
      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 backdrop-blur-[1px]"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className="fixed top-0 left-0 h-full z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out"
        style={{
          backgroundColor: "#222222",
          width: 280,
          transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: "#333", minHeight: 52 }}
        >
          <span
            className="text-base font-black tracking-widest uppercase"
            style={{ color: "#e5e7eb" }}
          >
            CHOUCAIR
          </span>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X size={18} color="#93D500" />
          </button>
        </div>

        {/* Role badge */}
        {user && (
          <div className="px-4 py-3 border-b" style={{ borderColor: "#333" }}>
            <div className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: "#93D500", color: "#222222" }}
              >
                {getInitials(user.name)}
              </span>
              <div>
                <p
                  className="text-xs font-semibold text-white truncate"
                  style={{ maxWidth: 190 }}
                >
                  {user.name}
                </p>
                <p className="text-xs" style={{ color: "#93D500" }}>
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            // Filter children by role (e.g. hide Historial for 'cliente')
            const visibleChildren = (item.children ?? []).filter(
              (child) => !child.roles || child.roles.includes(role),
            );
            const hasChildren = visibleChildren.length > 0;
            const isOpen = openAccordion === item.label;

            return (
              <div key={item.label}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleAccordion(item.label)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5 group"
                    style={{ color: isOpen ? "#93D500" : "#e5e7eb" }}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        size={17}
                        style={{ color: isOpen ? "#93D500" : "#9ca3af" }}
                      />
                      {item.label}
                    </span>
                    <ChevronRight
                      size={15}
                      className="transition-transform duration-200"
                      style={{
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        color: isOpen ? "#93D500" : "#6b7280",
                      }}
                    />
                  </button>
                ) : (
                  <Link
                    to={item.href ?? "/"}
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5"
                    style={{ color: "#e5e7eb" }}
                  >
                    <Icon size={17} style={{ color: "#9ca3af" }} />
                    {item.label}
                  </Link>
                )}

                {/* Accordion children */}
                {hasChildren && (
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: isOpen ? visibleChildren.length * 44 : 0,
                      backgroundColor: "#1a1a1a",
                    }}
                  >
                    {visibleChildren.map((child) => (
                      <Link
                        key={child.label}
                        to={child.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 pl-11 pr-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors border-l-2 ml-6 border-transparent hover:border-[#93D500]"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: "#93D500", opacity: 0.5 }}
                        />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="border-t" style={{ borderColor: "#333" }}>
          {/* Contacto admin — solo para clientes */}
          {role === 'cliente' && (
            <div className="border-b" style={{ borderColor: "#333" }}>
              <ContactAdminButton variant="drawer" />
            </div>
          )}
          <div className="px-4 py-4">
            <button
              onClick={(e) => void handleLogout(e)}
              className="w-full flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
