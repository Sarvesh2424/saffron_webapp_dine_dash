import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { StatCard } from "@/components/StatCard";
import { SectionPanel } from "@/components/SectionPanel";
import { StatusPill } from "@/components/StatusPill";
import { DishVisual } from "@/components/DishVisual";
import {
  ShoppingBag,
  Wallet,
  Activity,
  Zap,
  Search,
  ListFilter,
  MoreHorizontal,
  Receipt,
  Hotel,
  Plane,
  ShoppingCart,
  FileCode,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { usd, dateShort, minutesAgoLabel } from "@/lib/format";
import { motion } from "framer-motion";
import { Redirect } from "wouter";

const activityIcons = [Hotel, Plane, ShoppingCart, FileCode, Receipt];

export default function Dashboard() {
  const {
    orders,
    flashDeals,
    menu,
    restaurantProfile,
    popularItems,
    revenueByDay,
  } = useStore();

  const stats = useMemo(() => {
    const today = orders;
    const totalRevenue = today.reduce((s, o) => s + o.total, 0);
    const active = today.filter(
      (o) =>
        o.status === "New" || o.status === "Preparing" || o.status === "Ready",
    ).length;
    const flashRevenue = flashDeals.reduce((s, d) => {
      const item = menu.find((m) => m.dishId === d.dish);
      const unit = item ? item.price * (1 - d.discount / 100) : 0;
      return s + unit * d.sold;
    }, 0);
    return {
      totalOrders: today.length,
      totalRevenue,
      active,
      flashRevenue,
    };
  }, [orders, flashDeals]);

  if (!restaurantProfile) {
    <Redirect to="/login" />;
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-card border border-card-border shadow-sm px-6 py-6"
      >
        <h1 className="text-3xl font-semibold tracking-tight">
          Good morning, {restaurantProfile!.ownerName.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stay on top of incoming orders, monitor prep times, and keep the
          kitchen flowing.
        </p>
      </motion.div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <SectionPanel
            title="Today at a glance"
            subtitle={`${restaurantProfile!.cuisine} · ${dateShort(new Date().toISOString()).split(",")[0]}`}
          >
            <div className="grid grid-cols-2 gap-3">
              <Mini label="Today's Orders" value={String(stats.totalOrders)} />
              <Mini label="Revenue" value={usd(stats.totalRevenue)} />
              <Mini label="Active" value={String(stats.active)} accent />
              <Mini
                label="Avg ticket"
                value={usd(stats.totalRevenue / Math.max(1, stats.totalOrders))}
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-full bg-foreground text-background text-sm py-2.5 font-medium hover-elevate active-elevate-2"
                data-testid="button-payouts"
              >
                Payouts
              </button>
              <button
                className="flex-1 rounded-full bg-secondary text-foreground text-sm py-2.5 font-medium hover-elevate active-elevate-2"
                data-testid="button-export"
              >
                Export
              </button>
            </div>
          </SectionPanel>

          <SectionPanel title="Popular items" subtitle="Last 7 days">
            <div className="space-y-3">
              {popularItems.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${(p.orders / popularItems[0].orders) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {p.orders}
                  </span>
                </div>
              ))}
            </div>
          </SectionPanel>
        </div>

        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4 content-start">
          <StatCard
            label="Total Earnings"
            value={usd(stats.totalRevenue)}
            delta={{ value: "7%", positive: true, suffix: "this month" }}
            icon={Wallet}
            variant="primary"
            testId="stat-earnings"
          />
          <StatCard
            label="Today's Orders"
            value={String(stats.totalOrders)}
            delta={{ value: "12%", positive: true }}
            icon={ShoppingBag}
            testId="stat-orders"
          />
          <StatCard
            label="Active Orders"
            value={String(stats.active)}
            delta={{ value: "3", positive: true, suffix: "in queue" }}
            icon={Activity}
            testId="stat-active"
          />
          <StatCard
            label="Flash Revenue"
            value={usd(stats.flashRevenue)}
            delta={{ value: "18%", positive: true }}
            icon={Zap}
            testId="stat-flash"
          />

          <div className="col-span-2">
            <SectionPanel
              title="Flash food performance"
              subtitle="Live deals running now"
              actions={
                <span className="text-xs text-muted-foreground">
                  {flashDeals.filter((d) => d.active).length} active
                </span>
              }
            >
              <div className="grid grid-cols-2 gap-3">
                {flashDeals.map((deal) => {
                  const item = menu.find((m) => m.dishId === deal.dish);
                  return (
                    <FlashCard
                      title={item!.name}
                      value={deal.discount.toString()}
                      caption={deal.duration.toString() + " min"}
                      hue={28}
                      variant="dark"
                    />
                  );
                })}
              </div>
            </SectionPanel>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <SectionPanel
            title="Total Income"
            subtitle="Revenue across the past week"
          >
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-primary" /> Revenue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-foreground" /> Orders
              </span>
            </div>
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDay} barGap={4}>
                  <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    width={32}
                  />
                  <RTooltip
                    cursor={{ fill: "hsl(var(--secondary))" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="orders"
                    fill="hsl(var(--foreground))"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionPanel>
        </div>
      </div>

      <SectionPanel
        title="Recent Activities"
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                placeholder="Search"
                className="bg-transparent text-sm outline-none placeholder:text-muted-foreground w-40"
                data-testid="input-search-activities"
              />
            </div>
            <button
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm hover-elevate active-elevate-2"
              data-testid="button-filter"
            >
              <ListFilter className="size-3.5" /> Filter
            </button>
          </div>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-card-border">
                <th className="text-left font-normal py-3 pl-5 pr-3">
                  Order ID
                </th>
                <th className="text-left font-normal py-3 px-3">Customer</th>
                <th className="text-left font-normal py-3 px-3">Items</th>
                <th className="text-right font-normal py-3 px-3">Total</th>
                <th className="text-left font-normal py-3 px-3">Status</th>
                <th className="text-left font-normal py-3 px-3">Time</th>
                <th className="py-3 pr-5" />
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map((o, i) => {
                const Icon = activityIcons[i % activityIcons.length];
                return (
                  <tr
                    key={o.orderId}
                    className="border-b border-card-border/60 last:border-b-0 hover:bg-secondary/40 transition-colors"
                    data-testid={`row-activity-${o.orderId}`}
                  >
                    <td className="py-3.5 pl-5 pr-3 font-medium text-foreground">
                      {o.orderId}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-md bg-secondary flex items-center justify-center text-muted-foreground">
                          <Icon className="size-3.5" />
                        </div>
                        <div>
                          <div className="text-sm">{o.userDetails.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {o.channel}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-muted-foreground">
                      {o.items[0].dishDetails.name}
                      {o.items.length > 1 ? ` +${o.items.length - 1}` : ""}
                    </td>
                    <td className="py-3.5 px-3 text-right font-medium tabular-nums">
                      {usd(o.total)}
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusPill status={o.status} />
                    </td>
                    <td className="py-3.5 px-3 text-muted-foreground">
                      {minutesAgoLabel(o.orderTime.toString())}
                    </td>
                    <td className="py-3.5 pr-5 text-right">
                      <button
                        className="size-7 rounded-md hover-elevate active-elevate-2 inline-flex items-center justify-center text-muted-foreground"
                        data-testid={`button-row-menu-${o.orderId}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 ${accent ? "bg-primary/10" : "bg-secondary"}`}
    >
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold tracking-tight ${accent ? "text-primary" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function FlashCard({
  title,
  value,
  caption,
  hue,
  variant,
}: {
  title: string;
  value: string;
  caption: string;
  hue: number;
  variant: "dark" | "primary";
}) {
  const isDark = variant === "dark";
  return (
    <div
      className={[
        "relative rounded-xl p-4 flex flex-col gap-3 min-h-[148px] overflow-hidden",
        isDark
          ? "bg-foreground text-background"
          : "bg-primary text-primary-foreground",
      ].join(" ")}
    >
      <div className="absolute -right-6 -top-6 opacity-30">
        <DishVisual hue={hue} name={title} className="size-28" />
      </div>
      <div className="relative flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded-full bg-white/15 px-2 py-0.5">
          <Zap className="size-3" /> Flash
        </span>
      </div>
      <div className="relative">
        <div className="text-2xl font-semibold">{value} OFF</div>
        <div className="text-sm opacity-90 mt-0.5">{title}</div>
      </div>
      <div className="relative mt-auto flex items-center justify-between">
        <span className="text-[11px] opacity-80">{caption}</span>
        <ArrowRight className="size-4 opacity-90" />
      </div>
    </div>
  );
}
