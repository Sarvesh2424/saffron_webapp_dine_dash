import { Link, Redirect, useLocation } from "wouter";
import {
  Bell,
  Search,
  ChevronDown,
  Power,
  Pause,
  Flame,
  Settings as SettingsIcon,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/orders", label: "Orders" },
  { to: "/menu", label: "Menu" },
  { to: "/flash-food", label: "Flash Food" },
  { to: "/offers", label: "Offers" },
  { to: "/delivery", label: "Delivery" },
  { to: "/reports", label: "Reports" },
];

export function TopNav() {
  const { restaurantProfile, logout } = useStore();
  const [location] = useLocation();
  const { status, setStatus } = useStore();

  const statusLabel = status.paused
    ? "Paused"
    : status.busy
      ? "Busy"
      : status.open
        ? "Open"
        : "Closed";
  const statusDot = status.paused
    ? "bg-destructive"
    : status.busy
      ? "bg-amber-500"
      : status.open
        ? "bg-emerald-500"
        : "bg-muted-foreground";

  if (!restaurantProfile) {
    <Redirect to="/login" />;
  }

  return (
    <header
      className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2"
      data-testid="top-nav"
    >
      <div className="flex items-center gap-2 rounded-full bg-card border border-card-border px-2 py-1.5 shadow-sm">
        <div className="size-8 rounded-full bg-primary flex items-center justify-center">
          <Flame className="size-4 text-primary-foreground" />
        </div>
        <span className="hidden md:inline pr-2 text-sm font-semibold tracking-tight">
          Saffron
        </span>
      </div>

      <button
        className="md:hidden inline-flex items-center gap-1.5 rounded-full bg-card border border-card-border px-2.5 py-1.5 shadow-sm hover-elevate active-elevate-2"
        data-testid="button-status-mobile"
        onClick={() => setStatus({ open: !status.open })}
        aria-label="Toggle restaurant status"
      >
        <span className={`size-1.5 rounded-full ${statusDot}`} />
        <span className="text-[11px] font-medium">{statusLabel}</span>
      </button>

      <nav className="hidden lg:flex items-center gap-1 rounded-full bg-card border border-card-border px-1.5 py-1.5 shadow-sm">
        {links.map((l) => {
          const active =
            l.to === "/" ? location === "/" : location.startsWith(l.to);
          return (
            <Link
              key={l.to}
              href={l.to}
              className={[
                "px-3.5 py-1.5 rounded-full text-sm transition-colors",
                active
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover-elevate active-elevate-2",
              ].join(" ")}
              data-testid={`topnav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="hidden md:flex items-center gap-2 rounded-full bg-card border border-card-border pl-3 pr-1.5 py-1.5 shadow-sm">
          <div className={`size-1.5 rounded-full ${statusDot}`} />
          <span className="text-xs font-medium pr-1">{statusLabel}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs hover-elevate active-elevate-2"
                data-testid="button-status-menu"
              >
                Manage <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Restaurant status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 space-y-2">
                <Row
                  icon={<Power className="size-3.5 text-emerald-500" />}
                  label="Open"
                >
                  <Switch
                    checked={status.open}
                    onCheckedChange={(v) => setStatus({ open: v })}
                    data-testid="switch-open"
                  />
                </Row>
                <Row
                  icon={<Flame className="size-3.5 text-primary" />}
                  label="Busy mode"
                >
                  <Switch
                    checked={status.busy}
                    onCheckedChange={(v) => setStatus({ busy: v })}
                    data-testid="switch-busy"
                  />
                </Row>
                <Row
                  icon={<Pause className="size-3.5 text-destructive" />}
                  label="Pause new orders"
                >
                  <Switch
                    checked={status.paused}
                    onCheckedChange={(v) => setStatus({ paused: v })}
                    data-testid="switch-paused"
                  />
                </Row>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden md:flex items-center gap-2 rounded-full bg-card border border-card-border px-3 py-1.5 shadow-sm">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            placeholder="Search orders, menu, tickets…"
            className="bg-transparent text-sm outline-none placeholder:text-muted-foreground w-48"
            data-testid="input-global-search"
          />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="relative size-9 sm:size-10 rounded-full bg-card border border-card-border flex items-center justify-center hover-elevate active-elevate-2"
              aria-label="Notifications"
              data-testid="button-notifications"
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 size-2 rounded-full bg-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-card border border-card-border pl-1 pr-2 sm:pr-3 py-1 shadow-sm hover-elevate active-elevate-2"
              data-testid="button-profile"
            >
              <div className="size-7 sm:size-8 rounded-full bg-gradient-to-br from-primary to-amber-400 text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                SR
              </div>
              <div className="text-left leading-tight hidden lg:block">
                <div className="text-sm font-medium">
                  {restaurantProfile
                    ? restaurantProfile.ownerName
                    : "Not logged in"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {restaurantProfile
                    ? restaurantProfile.email
                    : "Not logged in"}
                </div>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <SettingsIcon className="size-4 mr-2" /> Restaurant settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/support" className="cursor-pointer">
                <Bell className="size-4 mr-2" /> My tickets
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
              }}
              className="text-destructive"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
