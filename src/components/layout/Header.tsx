"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Moon, Sun, Globe, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SearchResult {
  type: "customer" | "order" | "serial";
  id: string;
  title: string;
  subtitle: string;
  url: string;
  description?: string;
}

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/", label: t("dashboard"), icon: Globe },
    { href: "/customers", label: t("customers"), icon: Globe },
    { href: "/machines", label: t("machines"), icon: Globe },
    { href: "/orders", label: t("orders"), icon: Globe },
    { href: "/settings", label: t("settings"), icon: Globe },
    { href: "/pdf-settings", label: t("pdfSettings"), icon: Globe },
  ];

  const handleGlobalSearch = async () => {
    if (!globalSearchQuery || globalSearchQuery.trim().length === 0) {
      return;
    }

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: globalSearchQuery, limit: 50 }),
      });

      const data = await response.json();

      if (data.success && data.results.length > 0) {
        setSearchResults(data.results);
        setIsSearchOpen(true);
      } else {
        setSearchResults([]);
        setIsSearchOpen(true);
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const getSearchResultLink = (result: SearchResult) => {
    if (result.type === "customer") return `/customers`;
    if (result.type === "order") return `/orders`;
    return "/";
  };

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <div className="h-5 w-5 bg-muted animate-pulse rounded" />
            </div>
            <Link href="/" className="flex items-center space-x-2">
              <Globe className="h-6 w-6" />
              <span className="font-bold text-xl hidden sm:inline-block">EURL LA SOURCE</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo and Mobile Menu Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link href="/" className="flex items-center space-x-2">
            <Globe className="h-6 w-6" />
            <span className="font-bold text-xl hidden sm:inline-block">EURL LA SOURCE</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("search")}</DialogTitle>
                <DialogDescription>
                  {t("search")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder={t("search")}
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGlobalSearch()}
                  />
                  <Button onClick={handleGlobalSearch}>{t("search")}</Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {searchResults.map((result) => (
                      <Link
                        key={result.id}
                        href={getSearchResultLink(result)}
                        className="block p-3 border rounded-lg hover:bg-accent transition-colors"
                        onClick={() => setIsSearchOpen(false)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{result.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {result.subtitle}
                            </p>
                            {result.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {result.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {result.type}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.length === 0 && globalSearchQuery && (
                  <p className="text-center text-muted-foreground py-8">
                    {t("noResults")}
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Dark Mode Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle dark mode"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-foreground" />
            ) : (
              <Moon className="h-5 w-5 text-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
