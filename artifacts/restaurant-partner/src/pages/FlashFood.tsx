import { useState } from "react";
import { useStore } from "@/lib/store";
import { SectionPanel } from "@/components/SectionPanel";
import { PageHeader } from "@/components/PageHeader";
import { StatStrip } from "@/components/StatStrip";
import { DishImage } from "@/components/DishImage";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Zap, Plus, Trash2, Wallet, Timer, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { usd2 } from "@/lib/format";

export default function FlashFood() {
  const {
    flashEnabled,
    setFlashEnabled,
    flashDeals,
    upsertFlashDeal,
    toggleFlashDeal,
    deleteFlashDeal,
    menu,
    restaurantProfile,
  } = useStore();
  const [open, setOpen] = useState(false);

  const flashRevenue = flashDeals.reduce((s, d) => {
    const item = menu.find((m) => m.dishId === d.dish);
    const unit = item ? item.price * (1 - d.discount / 100) : 0;
    return s + unit * d.sold;
  }, 0);
  const unitsSold = flashDeals.reduce((s, d) => s + d.sold, 0);
  const activeCount = flashDeals.filter((d) => d.active).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Flash Food"
        description="Push lightning-fast deals to clear inventory. Cap by time window or quantity — toggle the master switch to pause everything."
        actions={
          <>
            <div className="inline-flex items-center gap-2 rounded-full bg-card border border-card-border px-3 py-1.5 shadow-sm">
              <span className="text-xs text-muted-foreground">Master</span>
              <Switch
                checked={flashEnabled}
                onCheckedChange={setFlashEnabled}
                data-testid="switch-flash-master"
              />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  className="rounded-full bg-primary text-primary-foreground hover-elevate active-elevate-2"
                  data-testid="button-new-flash"
                >
                  <Plus className="size-4 mr-1" /> New flash deal
                </Button>
              </DialogTrigger>
              <NewFlashDialog
                restaurantId={restaurantProfile?.restaurantId!}
                onCreate={(d) => {
                  upsertFlashDeal(d);
                  toast.success("Flash deal scheduled");
                  setOpen(false);
                }}
              />
            </Dialog>
          </>
        }
      />

      <StatStrip
        items={[
          {
            label: "Active deals",
            value: String(activeCount),
            icon: Zap,
            hint: `${flashDeals.length} configured`,
          },
          { label: "Units sold", value: String(unitsSold), icon: ShoppingBag },
          {
            label: "Avg window",
            value: `${Math.round(flashDeals.reduce((s, d) => s + d.duration, 0) / Math.max(1, flashDeals.length))} min`,
            icon: Timer,
          },
          {
            label: "Flash revenue",
            value: usd2(flashRevenue),
            icon: Wallet,
            accent: true,
          },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {flashDeals.map((d) => {
          const item = menu.find((m) => m.dishId === d.dish);
          if (!item) return null;
          const remaining = Math.max(0, d.quantity - d.sold);
          const pct = (d.sold / Math.max(1, d.quantity)) * 100;
          return (
            <article
              key={d.flashDealId}
              className="rounded-2xl border border-card-border bg-card shadow-sm p-5 flex gap-4 transition-shadow hover:shadow-md"
              data-testid={`flash-card-${d.flashDealId}`}
            >
              <DishImage
                itemId={item.dishId}
                src={item.image}
                name={item.name}
                className="size-24 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded-full bg-primary/10 text-primary px-2 py-0.5">
                      <Zap className="size-3" /> Flash · {d.discount}% off
                    </span>
                    <h3 className="mt-2 text-base font-semibold">
                      {item.name}
                    </h3>
                    <div className="text-xs text-muted-foreground">
                      <span className="line-through mr-2">
                        {usd2(item.price)}
                      </span>
                      <span className="text-foreground font-medium">
                        {usd2(item.price * (1 - d.discount / 100))}
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={d.active}
                    onCheckedChange={() => toggleFlashDeal(d.flashDealId)}
                    data-testid={`switch-flash-${d.flashDealId}`}
                  />
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{d.sold} sold</span>
                    <span>
                      {remaining} left · {d.duration} min window
                    </span>
                    {!d.active && <p className="text-red-500">Not active</p>}
                  </div>
                  <div className="mt-1.5 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    className="size-7 rounded-md text-destructive hover-elevate active-elevate-2 inline-flex items-center justify-center"
                    onClick={() => {
                      deleteFlashDeal(d.flashDealId);
                      toast.error("Flash deal removed");
                    }}
                    data-testid={`button-delete-flash-${d.flashDealId}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function NewFlashDialog({
  onCreate,
  restaurantId,
}: {
  onCreate: (d: import("@/lib/mockData").FlashDeal) => void;
  restaurantId: string;
}) {
  const { menu } = useStore();
  const [itemId, setItemId] = useState(menu[0]?.dishId ?? "");
  const [discount, setDiscount] = useState(20);
  const [duration, setDuration] = useState(60);
  const [qty, setQty] = useState(30);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New flash deal</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Item</Label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            data-testid="select-flash-item"
          >
            {menu.map((m) => (
              <option key={m.dishId} value={m.dishId}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Discount</Label>
            <span className="text-sm font-medium">{discount}%</span>
          </div>
          <Slider
            min={5}
            max={50}
            step={5}
            value={[discount]}
            onValueChange={(v) => setDiscount(v[0]!)}
            data-testid="slider-discount"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Duration (min)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              data-testid="input-flash-duration"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Quantity limit</Label>
            <Input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              data-testid="input-flash-qty"
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          className="rounded-full bg-primary text-primary-foreground hover-elevate active-elevate-2"
          onClick={() =>
            onCreate({
              flashDealId: `f${Date.now()}`,
              dish: itemId,
              discount: discount,
              duration: duration,
              quantity: qty,
              sold: 0,
              active: true,
              restaurantId,
            })
          }
          data-testid="button-create-flash"
        >
          Schedule
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
