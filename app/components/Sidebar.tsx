"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const menuItems = [
  { id: "dashboard", label: "ダッシュボード", icon: "dashboard" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
  { id: "new-entry", label: "新規記録", icon: "plus" },
  { id: "journal-list", label: "記録一覧", icon: "list" },
  { id: "calendar", label: "カレンダー", icon: "calendar" },
] as const;

type SectionId = (typeof menuItems)[number]["id"];
type IconName = (typeof menuItems)[number]["icon"];

function MenuIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    analytics: <><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /><path d="M2 19h20" /></>,
    plus: <><path d="M12 5v14M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="4" /></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function Sidebar() {
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible && menuItems.some((item) => item.id === visible.target.id)) {
          setActiveSection(visible.target.id as SectionId);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5] }
    );

    menuItems.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const navigateTo = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
    setIsOpen(false);
  };

  const navigation = (
    <nav aria-label="ページ内メニュー" className="mt-8 space-y-1.5">
      <Link href="/paper-trade" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/70">
        <MenuIcon name="list" />Paper Trade
      </Link>
      {menuItems.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigateTo(item.id)}
            aria-current={isActive ? "location" : undefined}
            className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/70 ${
              isActive
                ? "bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/20"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
            }`}
          >
            <MenuIcon name={item.icon} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="メニューを開く"
        aria-expanded={isOpen}
        aria-controls="mobile-sidebar"
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/95 text-slate-100 shadow-xl backdrop-blur lg:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800 bg-[#080e1b]/95 px-5 py-8 backdrop-blur-xl lg:block">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">Trade Journal</p>
        <p className="mt-2 text-lg font-semibold text-white">Navigation</p>
        {navigation}
      </aside>

      <div className={`fixed inset-0 z-50 lg:hidden ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!isOpen}>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="メニューを閉じる"
          tabIndex={isOpen ? 0 : -1}
          className={`absolute inset-0 h-full w-full rounded-none bg-black/70 backdrop-blur-sm transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          id="mobile-sidebar"
          aria-label="モバイルメニュー"
          className={`absolute inset-y-0 left-0 w-[min(82vw,20rem)] border-r border-slate-800 bg-[#080e1b] px-5 py-6 shadow-2xl transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">Trade Journal</p>
              <p className="mt-1 text-lg font-semibold text-white">Navigation</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="メニューを閉じる"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <span aria-hidden="true" className="text-2xl leading-none">×</span>
            </button>
          </div>
          {navigation}
        </aside>
      </div>
    </>
  );
}
