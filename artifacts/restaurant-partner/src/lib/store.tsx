import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import axios from "axios";
import {
  type Order,
  type OrderStatus,
  type FlashDeal,
  type Offer,
  type SupportTicket,
  type TicketStatus,
  type TicketPriority,
  type TicketSource,
  type TicketIssueType,
  type MenuItem,
  type DeliveryPartner,
  type Restaurant,
} from "./mockData";
import { Redirect, useLocation } from "wouter";

export const API_BASE_URL = "https://dinedash-backend-1.onrender.com/api";
// export const API_BASE_URL = "http://localhost:4000/api";

type RestaurantStatus = {
  open: boolean;
  busy: boolean;
  paused: boolean;
};

type Ctx = {
  isAuthenticated: boolean;
  setIsAuthenticated: (b: boolean) => void;
  login: (mobile: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;

  status: RestaurantStatus;
  setStatus: (next: Partial<RestaurantStatus>) => void;
  loading: boolean; // 🔥 Useful addition to prevent UI glitches during initial loading syncs

  orders: Order[];
  revenueByDay: { day: string; revenue: number; orders: number }[];
  popularItems: { name: string; orders: number }[];
  acceptOrder: (id: string) => void;
  rejectOrder: (id: string) => void;
  advanceOrder: (id: string) => void;
  setOrderPrep: (id: string, minutes: number) => void;
  assignPartner: (id: string, partnerId: string) => void;
  reportDelay: (id: string, extraMin: number) => void;

  menu: MenuItem[];
  toggleAvailability: (id: string) => void;
  addMenuItem: (item: MenuItem) => void;
  upsertMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;
  bulkSetPrep: (minutes: number) => void;
  setMenuImage: (id: string, dataUrl: string) => void;

  flashDeals: FlashDeal[];
  flashEnabled: boolean;
  setFlashEnabled: (b: boolean) => void;
  upsertFlashDeal: (deal: FlashDeal) => void;
  toggleFlashDeal: (id: string) => void;
  deleteFlashDeal: (id: string) => void;

  offers: Offer[];
  upsertOffer: (o: Offer) => void;
  deleteOffer: (id: string) => void;

  deliveryPartners: DeliveryPartner[];
  addDeliveryPartner: (o: DeliveryPartner) => void;
  updateDeliveryPartner: (o: DeliveryPartner) => void;
  deleteDeliveryPartner: (id: string) => void;

  tickets: SupportTicket[];
  createTicket: (input: {
    subject: string;
    priority: TicketPriority;
    source: TicketSource;
    issueType: TicketIssueType;
    message: string;
    orderRef?: string;
  }) => void;
  appendMessage: (id: string, text: string, internal?: boolean) => void;
  setTicketStatus: (id: string, status: TicketStatus) => void;
  setTicketPriority: (id: string, priority: TicketPriority) => void;
  assignTicket: (id: string, agent: string) => void;

  restaurantProfile: Restaurant | null;
  updateRestaurantProfile: (updatedFields: Partial<Restaurant>) => void;
};

const StoreCtx = createContext<Ctx | null>(null);

const nextStatus: Record<OrderStatus, OrderStatus> = {
  New: "Preparing",
  Preparing: "Ready",
  Ready: "Picked",
  Picked: "Completed",
  Completed: "Completed",
  Rejected: "Rejected",
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [, setLocation] = useLocation();
  const [status, setStatusState] = useState<RestaurantStatus>({
    open: true,
    busy: false,
    paused: false,
  });

  // Initialize state collections as empty arrays waiting for database injection
  const [orders, setOrders] = useState<Order[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<
    { day: string; revenue: number; orders: number }[]
  >([]);
  const [popularItems, setPopularItems] = useState<
    { name: string; orders: number }[]
  >([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>(
    [],
  );
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [restaurantProfile, setRestaurantProfile] = useState<Restaurant | null>(
    null,
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const login = async (mobile: string, pass: string): Promise<boolean> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/login/restaurant-login`, // Verified backend admin controller route mapping
        { mobile, password: pass },
        { withCredentials: true }, // Permits browser engine to store the HTTP-only cookie
      );

      const rawRestaurantData =
        response.data?.result?.restaurant || response.data?.restaurant;

      if (!rawRestaurantData) {
        console.error(
          "Authentication succeeded, but restaurant profile payload is missing from response.",
        );
        return false;
      }

      // 3. Enforce complete structural safety on the workingHours matrix to safeguard your dashboard views
      const standardDays: (
        | "Monday"
        | "Tuesday"
        | "Wednesday"
        | "Thursday"
        | "Friday"
        | "Saturday"
        | "Sunday"
      )[] = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];

      const enforcedWorkingHours = standardDays.map((dayName) => {
        const existingDayRecord = rawRestaurantData.workingHours?.find(
          (h: any) => h.day === dayName,
        );
        return (
          existingDayRecord || {
            day: dayName,
            status: "Closed",
            startTime: "09:00",
            endTime: "22:00",
          }
        );
      });

      const normalizedProfile = {
        ...rawRestaurantData,
        workingHours: enforcedWorkingHours,
      };

      // 4. Wipe out the old stale state cache completely by overriding it with the freshly logged-in restaurant object
      setRestaurantProfile(normalizedProfile);

      setIsAuthenticated(true);

      return true;
    } catch (err) {
      console.error("Authentication handshake failed:", err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/logout/restaurant-logout`,
        {},
        { withCredentials: true }, // Tells the browser to send along the cookie so the server can clear it
      );
    } catch (err) {
      console.error("Backend cookie clearance pipeline rejected:", err);
    } finally {
      // 2. Clear state inside finally block so the user interface resets even on network hiccup
      setIsAuthenticated(false);
      setRestaurantProfile(null);
      setLocation("/login");

      // 3. Force an immediate screen reload or hard routing bounce to completely clear cached memory models
      window.location.href = "/login";
    }
  };
  // ----------------------------------------------------
  //  DATABASE HYDRATION LAYER (Runs once on mount)
  // ----------------------------------------------------
  useEffect(() => {
    const hydrateDashboardFromBackend = async () => {
      try {
        setLoading(true);

        const sessionVerifyRes = await axios.get(
          `${API_BASE_URL}/admin/verify-session`,
          { withCredentials: true },
        );
        // This is your active restaurant ID pulled securely via the cookie!
        const activeRestaurantId = sessionVerifyRes.data.result?.restaurantId;

        if (!activeRestaurantId) {
          throw new Error("Unable to resolve restaurant identity parameters.");
        } else {
          setIsAuthenticated(true);
        }
        // Fetching structural app data in parallel via concurrent Promise mapping
        const [
          ordersRes,
          menuRes,
          offersRes,
          flashDealsRes,
          couriersRes,
          restaurantRes,
          ticketsRes,
        ] = await Promise.all([
          axios.get(`${API_BASE_URL}/admin/get-orders`, {
            withCredentials: true,
          }),
          axios.get(`${API_BASE_URL}/admin/get-dishes`, {
            withCredentials: true,
          }),
          axios.get(`${API_BASE_URL}/admin/get-offers`, {
            withCredentials: true,
          }),
          axios.get(`${API_BASE_URL}/admin/get-flashDeals`, {
            withCredentials: true,
          }),
          axios.get(`${API_BASE_URL}/admin/get-couriers`, {
            withCredentials: true,
          }),
          axios.get(`${API_BASE_URL}/admin/get-restaurant`, {
            withCredentials: true,
          }),
          axios.get(`${API_BASE_URL}/admin/get-tickets`, {
            withCredentials: true,
          }),
        ]);

        const normalizedOrders = (ordersRes.data.result || []).map(
          (order: any) => ({
            ...order,
            userDetails: {
              name: order.userDetails?.name || "Guest Customer",
              phone: order.userDetails?.mobile
                ? String(order.userDetails.mobile)
                : "N/A",
              address: order.userDetails?.address || "Dine-In / Pickup",
            },

            prepMinutes: order.prepTime || 0,
            placedAt: order.orderTime,
            partnerId: order.courierId,
            items: (order.items || []).map((item: any) => ({
              dishId: item.dishId,
              quantity: item.quantity || 1,
              notes: item.notes || "",
              dishDetails: { ...item.dishDetails },
            })),
          }),
        );

        setOrders(normalizedOrders);
        const dayMap: Record<string, { revenue: number; orders: number }> = {
          Mon: { revenue: 0, orders: 0 },
          Tue: { revenue: 0, orders: 0 },
          Wed: { revenue: 0, orders: 0 },
          Thu: { revenue: 0, orders: 0 },
          Fri: { revenue: 0, orders: 0 },
          Sat: { revenue: 0, orders: 0 },
          Sun: { revenue: 0, orders: 0 },
        };

        const itemTracker: Record<string, number> = {};

        normalizedOrders.forEach((order: any) => {
          // 1. Process Day-by-Day Revenue Metrics
          if (order.placedAt) {
            const dayAbbrev = new Date(order.placedAt).toLocaleDateString(
              "en-US",
              { weekday: "short" },
            ); // "Mon", "Tue", etc.
            if (dayMap[dayAbbrev]) {
              dayMap[dayAbbrev].revenue += Number(
                order.totalPrice || order.total || 0,
              );
              dayMap[dayAbbrev].orders += 1;
            }
          }

          // 2. Process Popular Menu Item Counts
          (order.items || []).forEach((item: any) => {
            const itemName =
              item.dishDetails?.name || item.name || "Unknown Item";
            const qty = Number(item.quantity || 1);
            itemTracker[itemName] = (itemTracker[itemName] || 0) + qty;
          });
        });

        // Map aggregated dictionary into final array structure
        const computedRevenueByDay = Object.keys(dayMap).map((dayKey) => ({
          day: dayKey,
          revenue: Math.round(dayMap[dayKey].revenue),
          orders: dayMap[dayKey].orders,
        }));

        // Sort items by volume descending and clip top 5 elements
        const computedPopularItems = Object.keys(itemTracker)
          .map((name) => ({ name, orders: itemTracker[name] }))
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 5);

        // Save collections to local state
        setRevenueByDay(computedRevenueByDay);
        setPopularItems(computedPopularItems);
        setMenu(menuRes.data.result);
        const normalizedOffers = offersRes.data.result.map((offer: any) => ({
          ...offer, // Spread core fields first so custom keys overwrite properly
          value: offer.type === "Percent" ? offer.percentOff : offer.amountOff,
        }));

        setOffers(normalizedOffers);
        setFlashDeals(flashDealsRes.data.result);
        setDeliveryPartners(couriersRes.data.result);
        const normalizedTickets = (ticketsRes.data.result || []).map(
          (ticket: any) => ({
            ...ticket,
            user: {
              name: ticket.user?.name || "Guest Submitter",
              email: ticket.user?.email || "support-fallback@domain.com",
              phone: ticket.user?.phone || "—",
            },
          }),
        );
        setTickets(normalizedTickets);
        const rawRestaurantData = restaurantRes.data.result;

        if (rawRestaurantData) {
          // 1. Define the mandatory master week tracking sequence
          const standardDays: (
            | "Monday"
            | "Tuesday"
            | "Wednesday"
            | "Thursday"
            | "Friday"
            | "Saturday"
            | "Sunday"
          )[] = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ];

          // 2. Map through all standard days to guarantee complete structural enforcement
          const enforcedWorkingHours = standardDays.map((dayName) => {
            // Check if this specific day was returned by your MongoDB document instance
            const existingDayRecord = rawRestaurantData.workingHours?.find(
              (h: any) => h.day === dayName,
            );

            // If found, return it as-is. If missing, drop in your secure closed default configurations!
            return (
              existingDayRecord || {
                day: dayName,
                status: "Closed",
                startTime: "09:00", // Default baseline time constraints
                endTime: "22:00",
              }
            );
          });

          // 3. Compile the final normalized profile state block
          const normalizedProfile = {
            ...rawRestaurantData,
            workingHours: enforcedWorkingHours,
          };

          setRestaurantProfile(normalizedProfile);
        }
      } catch (error) {
        console.error("Critical store context initialization failure:", error);
      } finally {
        setLoading(false);
      }
    };

    hydrateDashboardFromBackend();
  }, [isAuthenticated]);

  // ----------------------------------------------------
  // 📤 MUTATION & ACTION CONFIGURATIONS
  // ----------------------------------------------------
  const value = useMemo<Ctx>(
    () => ({
      status,
      setStatus: (next) => setStatusState((s) => ({ ...s, ...next })),
      loading,

      orders,
      revenueByDay,
      popularItems,
      acceptOrder: async (id) => {
        setOrders((arr) =>
          arr.map((o) =>
            o.orderId === id ? { ...o, status: "Preparing" } : o,
          ),
        );
        try {
          // Transmit targeted changes down to your single unified PUT route
          await axios.put(`${API_BASE_URL}/admin/update-order/${id}`, {
            status: "Preparing",
          });
        } catch (err) {
          console.error("Failed to sync order acceptance via PUT:", err);
        }
      },

      rejectOrder: async (id) => {
        setOrders((arr) =>
          arr.map((o) => (o.orderId === id ? { ...o, status: "Rejected" } : o)),
        );
        try {
          await axios.put(`${API_BASE_URL}/admin/update-order/${id}`, {
            status: "Rejected",
          });
        } catch (err) {
          console.error("Failed to sync order rejection via PUT:", err);
        }
      },

      advanceOrder: async (id) => {
        let targetsNextStatus: OrderStatus | undefined;

        setOrders((arr) =>
          arr.map((o) => {
            if (o.orderId === id) {
              targetsNextStatus = nextStatus[o.status];
              return { ...o, status: targetsNextStatus };
            }
            return o;
          }),
        );

        try {
          if (targetsNextStatus) {
            await axios.put(`${API_BASE_URL}/admin/update-order/${id}`, {
              status: targetsNextStatus,
            });
          }
        } catch (err) {
          console.error("Failed to advance order state via PUT:", err);
        }
      },

      setOrderPrep: async (id, minutes) => {
        setOrders((arr) =>
          arr.map((o) =>
            o.orderId === id ? { ...o, prepMinutes: minutes } : o,
          ),
        );
        try {
          // Your backend Mongoose schema uses 'prepTime', mapping it explicitly here
          await axios.put(`${API_BASE_URL}/admin/update-order/${id}`, {
            prepTime: minutes,
          });
        } catch (err) {
          console.error("Failed to sync order prep timing via PUT:", err);
        }
      },

      assignPartner: async (id, partnerId) => {
        setOrders((arr) =>
          arr.map((o) => (o.orderId === id ? { ...o, partnerId } : o)),
        );
        try {
          // Note: Your backend Mongoose schema uses 'courierId' instead of 'partnerId'
          await axios.put(`${API_BASE_URL}/admin/update-order/${id}`, {
            courierId: partnerId,
          });
        } catch (err) {
          console.error("Failed to assign driver via PUT:", err);
        }
      },

      reportDelay: async (id, extraMin) => {
        let updatedPrepTime = 0;

        setOrders((arr) =>
          arr.map((o) => {
            if (o.orderId === id) {
              // Read your locally calculated 'prepMinutes' variable cleanly
              updatedPrepTime = (o.prepTime || 0) + extraMin;
              return { ...o, prepMinutes: updatedPrepTime, isUrgent: true };
            }
            return o;
          }),
        );

        try {
          await axios.put(`${API_BASE_URL}/admin/update-order/${id}`, {
            prepTime: updatedPrepTime,
            isUrgent: true,
          });
        } catch (err) {
          console.error("Failed to record delay metrics via PUT:", err);
        }
      },

      menu,
      toggleAvailability: async (id) => {
        let availabilityFlag = false;
        setMenu((arr) =>
          arr.map((m) => {
            if (m.dishId === id) {
              availabilityFlag = !m.available;
              return { ...m, available: availabilityFlag };
            }
            return m;
          }),
        );
        try {
          await axios.put(`${API_BASE_URL}/admin/update-dish/${id}`, {
            available: false,
          });
        } catch (err) {
          console.error(err);
        }
      },

      addMenuItem: async (item) => {
        const previousMenuState = [...menu];
        setMenu((arr) => {
          const idx = arr.findIndex((m) => m.dishId === item.dishId);

          if (idx === -1) {
            return [item, ...arr];
          }

          const next = arr.slice();
          next[idx] = item;
          return next;
        });
        try {
          await axios.post(`${API_BASE_URL}/admin/add-dish`, item);
        } catch (err: any) {
          console.log(err.response?.data);
          console.log(err.message);
          console.error(err);
        }
      },

      upsertMenuItem: async (item) => {
        setMenu((arr) => {
          const idx = arr.findIndex((m) => m.dishId === item.dishId);
          if (idx === -1) return [item, ...arr];
          const next = arr.slice();
          next[idx] = item;
          return next;
        });
        try {
          await axios.put(
            `${API_BASE_URL}/admin/update-dish/${item.dishId}`,
            item,
          );
        } catch (err) {
          console.error(err);
        }
      },

      deleteMenuItem: async (id) => {
        setMenu((arr) => arr.filter((m) => m.dishId !== id));
        try {
          await axios.delete(`${API_BASE_URL}/admin/delete-dish/${id}`);
        } catch (err) {
          console.error(err);
        }
      },

      bulkSetPrep: async (minutes) => {
        setMenu((arr) => arr.map((m) => ({ ...m, prepTime: minutes })));
        try {
          const updatePromises = menu.map((dish) =>
            axios.put(`${API_BASE_URL}/admin/update-dish/${dish.dishId}`, {
              prepTime: minutes, // Fixed schema parameter target
            }),
          );
          await Promise.all(updatePromises);
          console.log("All menu items successfully synchronized sequentially.");
        } catch (err) {
          console.error(err);
        }
      },

      setMenuImage: async (id, dataUrl) => {
        setMenu((arr) =>
          arr.map((m) => (m.dishId === id ? { ...m, imageUrl: dataUrl } : m)),
        );
        try {
          await axios.put(`${API_BASE_URL}/admin/menu/${id}`, {
            image: dataUrl,
          });
        } catch (err) {
          console.error(err);
        }
      },

      flashDeals,
      flashEnabled,
      setFlashEnabled,
      upsertFlashDeal: async (deal) => {
        const previousFlashDeals = [...flashDeals];

        setFlashDeals((arr) => {
          const idx = arr.findIndex((d) => d.flashDealId === deal.flashDealId);
          if (idx === -1) return [deal, ...arr];
          const next = arr.slice();
          next[idx] = deal;
          return next;
        });

        try {
          await axios.post(`${API_BASE_URL}/admin/add-flashDeal`, deal);
        } catch (err: any) {
          console.log(err.response?.data);
          console.log(err.message);
          console.error(
            "Database write pipeline failed during flash deal upsert:",
            err,
          );
          setFlashDeals(previousFlashDeals);
        }
      },
      toggleFlashDeal: async (id: string) => {
        let targetActiveFlag = false;

        // Optimistic UI Update
        setFlashDeals((arr) =>
          arr.map((d) => {
            if (d.flashDealId === id) {
              targetActiveFlag = !d.active;
              return { ...d, active: targetActiveFlag };
            }
            return d;
          }),
        );

        try {
          // Send the updated active property state directly down to the PUT/PATCH endpoint
          await axios.put(`${API_BASE_URL}/admin/update-flashDeal/${id}`, {
            active: targetActiveFlag,
          });
        } catch (err: any) {
          console.log(err.response?.data);
          console.log(err.message);
          console.error(
            `Failed to toggle activation status for deal ${id}:`,
            err,
          );
          // Revert state change locally on failure
          setFlashDeals((arr) =>
            arr.map((d) =>
              d.flashDealId === id ? { ...d, active: !targetActiveFlag } : d,
            ),
          );
        }
      },
      deleteFlashDeal: async (id: string) => {
        const previousFlashDeals = [...flashDeals];

        setFlashDeals((arr) => arr.filter((d) => d.flashDealId !== id));

        try {
          await axios.delete(`${API_BASE_URL}/admin/delete-flashDeal/${id}`);
          console.log(
            `Successfully dropped flash deal document template identifier: ${id}`,
          );
        } catch (err: any) {
          console.log(err.response?.data);
          console.log(err.message);
          console.error(
            `Error deleting flash deal document mapping target: ${id}`,
            err,
          );
          setFlashDeals(previousFlashDeals); // Rollback dashboard rows layout
        }
      },

      offers,
      upsertOffer: async (o: Offer) => {
        const previousOffersState = [...offers];

        // Pre-calculate the UI value property based on offer type before appending to state
        const computedValue =
          o.type === "Percent"
            ? { ...o, percentOff: o.value }
            : { ...o, flatOff: o.value };

        const normalizedOffer = {
          ...computedValue,
          restaurantId: restaurantProfile?.restaurantId!, // Ensures local UI cards render values perfectly
        };

        // Optimistic UI Update
        setOffers((arr) => {
          const idx = arr.findIndex((x) => x.offerId === o.offerId);
          if (idx === -1) return [normalizedOffer, ...arr];
          const next = arr.slice();
          next[idx] = normalizedOffer;
          return next;
        });

        try {
          console.log(
            "Sending normalized payload down to upsert-offer route...",
            normalizedOffer,
          );

          // Fire your backend persistence API call
          await axios.post(`${API_BASE_URL}/admin/add-offer`, normalizedOffer);

          console.log(
            `Offer ${o.offerId} successfully synchronized with MongoDB.`,
          );
        } catch (err: any) {
          console.log(err.response?.data.errors);
          console.log(err.message);
          console.error(
            "Database sync failed during offer upsert operation:",
            err,
          );
          alert("Server connection failed. Reverting offer layout...");

          // Rollback state to safeguard UI accuracy
          setOffers(previousOffersState);
        }
      },

      // 2. Remove an Offer Document from the Collection
      deleteOffer: async (id: string) => {
        const previousOffersState = [...offers];

        // Optimistic UI Update: Drop from the array instantly
        setOffers((arr) => arr.filter((o) => o.offerId !== id));

        try {
          console.log(`Sending DELETE request for offer ID: ${id}`);

          // Change the endpoint pattern to match your plural backend routing strategy
          await axios.delete(`${API_BASE_URL}/admin/delete-offer/${id}`);

          console.log(`Successfully deleted offer record from database: ${id}`);
        } catch (err) {
          console.error(
            `Failed deleting targeted offer document mapping: ${id}`,
            err,
          );
          alert("Could not remove offer from database server.");

          // Rollback state on failure
          setOffers(previousOffersState);
        }
      },

      deliveryPartners,
      addDeliveryPartner: async (partner: DeliveryPartner) => {
        const previousPartnersState = [...deliveryPartners];

        // Optimistic UI Update: Instantly prepend to the list
        setDeliveryPartners((arr) => [partner, ...arr]);

        try {
          console.log(
            "Registering new delivery profile on database...",
            partner,
          );

          await axios.post(`${API_BASE_URL}/admin/delivery-partners`, partner);

          console.log(
            `Partner profile ${partner.courierId} successfully created.`,
          );
        } catch (err) {
          console.error("Failed to persist delivery partner document:", err);
          alert("Server error. Reverting delivery fleet dashboard changes.");

          // Rollback state on network failure
          setDeliveryPartners(previousPartnersState);
        }
      },

      // 2. Modify an Existing Partner Status/Profile (Edit Form Submit)
      updateDeliveryPartner: async (partner: DeliveryPartner) => {
        const previousPartnersState = [...deliveryPartners];

        // Optimistic UI Update: Map through and replace inline matching your database tracking ID
        setDeliveryPartners((arr) =>
          arr.map((p) => (p.courierId === partner.courierId ? partner : p)),
        );

        try {
          console.log(
            `Updating partner document mapping: ${partner.courierId}`,
            partner,
          );

          await axios.put(
            `${API_BASE_URL}/admin/delivery-partners/${partner.courierId}`,
            partner,
          );

          console.log(`Partner changes saved successfully.`);
        } catch (err) {
          console.error(
            `Failed to update delivery partner ${partner.courierId}:`,
            err,
          );
          alert("Could not sync partner modifications.");

          // Rollback state on network failure
          setDeliveryPartners(previousPartnersState);
        }
      },

      // 3. Purge a Partner Account from the Database
      deleteDeliveryPartner: async (id: string) => {
        const previousPartnersState = [...deliveryPartners];

        // Optimistic UI Update: Drop the row instantly
        setDeliveryPartners((arr) => arr.filter((p) => p.courierId !== id));

        try {
          console.log(`Sending termination request for partner ID: ${id}`);

          await axios.delete(`${API_BASE_URL}/admin/delivery-partners/${id}`);

          console.log(
            `Successfully dropped partner record from collection: ${id}`,
          );
        } catch (err) {
          console.error(`Failed to drop delivery partner ${id}:`, err);
          alert("Database deletion pipeline aborted.");

          // Rollback state on network failure
          setDeliveryPartners(previousPartnersState);
        }
      },

      tickets,
      // --- UNIFIED TICKETS CHANNEL ---

      createTicket: async ({
        subject,
        priority,
        source,
        issueType,
        message,
        orderRef,
      }) => {
        const restaurantId = restaurantProfile?.restaurantId!;
        const generatedTicketId = `TKT-${Math.floor(Math.random() * 9000) + 1000}`;

        // 1. Format the initial message sub-document using the database data contract
        const initialMessage = {
          messageId: `msg-${Date.now()}`,
          from: "You", // Matches "You" | "Support" | "Customer" enum
          authorName: restaurantProfile?.ownerName,
          text: message,
          at: new Date().toISOString(),
          internal: false,
        };

        // 2. Format payload to pass through your backend validate(TicketSchema) middleware
        const newTicketPayload: SupportTicket = {
          ticketId: generatedTicketId,
          subject,
          source: (source.charAt(0).toUpperCase() +
            source.slice(1)) as TicketSource,
          issueType: (issueType === "Order Issue"
            ? "Order Issue"
            : issueType.charAt(0).toUpperCase() +
              issueType.slice(1)) as TicketIssueType,
          priority: (priority.charAt(0).toUpperCase() +
            priority.slice(1)) as TicketPriority,
          status: "Open",
          orderReference: orderRef || undefined,
          restaurantId,

          user: {
            name: restaurantProfile?.ownerName!, // Or pass actual user context variable if available
            email: restaurantProfile?.email!,
          },

          // ✅ FIX: Construct an internal tracking structure matching TicketMessage
          messages: [
            {
              messageId: `mid-${Date.now} `,
              from: "You",
              authorName: "Support",
              text: message,
              at: new Date(),
            },
          ],

          // ✅ FIX: Seed the mandatory timestamps for immediate layout calculations
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // 2. Optimistic State Update now perfectly validates cleanly!
        setTickets((arr) => [newTicketPayload, ...arr]);

        try {
          await axios.post(
            `${API_BASE_URL}/admin/raise-ticket`,
            newTicketPayload,
          );
        } catch (err: any) {
          console.log(err.response?.data);
          console.log(err.message);
          console.error("Failed to sync ticket creation to DB:", err);
        }
      },

      appendMessage: async (id, text, internal = false) => {
        const newMessage = {
          messageId: `msg-${Date.now()}`,
          from: "You",
          authorName: restaurantProfile?.ownerName,
          text,
          at: new Date().toISOString(),
          internal,
        };

        let updatedMessagesList: any[] = [];

        // Optimistic state calculation pass
        setTickets((arr) =>
          arr.map((t) => {
            if (t.ticketId === id) {
              updatedMessagesList = [...(t.messages || []), newMessage];
              return {
                ...t,
                updatedAt: new Date().toISOString(),
                messages: updatedMessagesList,
              };
            }
            return t;
          }),
        );

        try {
          // Push entire updated array branch via your general updates PUT endpoint
          await axios.put(`${API_BASE_URL}/admin/update-ticket/${id}`, {
            messages: updatedMessagesList,
          });
        } catch (err) {
          console.error(`Failed to append message to ticket ${id}:`, err);
        }
      },

      setTicketStatus: async (id, st) => {
        // Map lowercase UI states securely to Title Case Database constraints
        const databaseStatusMap: Record<string, string> = {
          Open: "Open",
          "In progress": "In progress",
          Resolved: "Resolved",
        };

        const dbStatusValue = databaseStatusMap[st] || "Open";

        setTickets((arr) =>
          arr.map((t) =>
            t.ticketId === id
              ? {
                  ...t,
                  status: dbStatusValue as TicketStatus,
                  updatedAt: new Date().toISOString(),
                  resolvedAt:
                    dbStatusValue === "Resolved"
                      ? new Date().toISOString()
                      : t.resolvedAt,
                }
              : t,
          ),
        );

        try {
          await axios.put(`${API_BASE_URL}/admin/update-ticket/${id}`, {
            status: dbStatusValue,
          });
        } catch (err) {
          console.error(`Failed to update status for ticket ${id}:`, err);
        }
      },

      setTicketPriority: async (id, priority) => {
        const dbPriorityValue =
          priority.charAt(0).toUpperCase() + priority.slice(1);

        setTickets((arr) =>
          arr.map((t) =>
            t.ticketId === id
              ? {
                  ...t,
                  priority: dbPriorityValue as TicketPriority,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        );

        try {
          await axios.put(`${API_BASE_URL}/admin/update-ticket/${id}`, {
            priority: dbPriorityValue,
          });
        } catch (err) {
          console.error(
            `Failed to shift priority parameters for ticket ${id}:`,
            err,
          );
        }
      },

      assignTicket: async (id, agent) => {
        const assignedValue = agent === "Unassigned" ? "" : agent;

        setTickets((arr) =>
          arr.map((t) =>
            t.ticketId === id
              ? {
                  ...t,
                  assignedTo: assignedValue || undefined,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        );

        try {
          await axios.put(`${API_BASE_URL}/admin/update-ticket/${id}`, {
            assignedTo: assignedValue,
          });
        } catch (err) {
          console.error(
            `Failed to change assignee route parameters for ticket ${id}:`,
            err,
          );
        }
      },
      restaurantProfile,
      updateRestaurantProfile: async (updatedFields: Partial<Restaurant>) => {
        const restaurantId = restaurantProfile?.restaurantId;

        // Optimistic state preservation mapping
        setRestaurantProfile((prev) =>
          prev ? { ...prev, ...updatedFields } : null,
        );

        try {
          await axios.put(
            `${API_BASE_URL}/admin/update-restaurant/${restaurantId}`,
            updatedFields,
          );
          console.log(
            "Restaurant profile synchronized with core database records successfully.",
          );
        } catch (err) {
          console.error(
            "Failed to commit restaurant configuration modifications:",
            err,
          );
          alert(
            "Profile update failed to save online. Reverting client state changes.",
          );
          // Rehydrate from backend record state sequence on critical rejection failures
          const recoveryRes = await axios.get(
            `${API_BASE_URL}/admin/restaurant-profile`,
            {
              params: { restaurantId },
            },
          );
          setRestaurantProfile(recoveryRes.data.result);
        }
      },
      isAuthenticated,
      setIsAuthenticated,

      login: async (mobile: string, pass: string): Promise<boolean> => {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/login/restaurant-login`, // Verified backend admin controller route mapping
            { mobile, password: pass },
            { withCredentials: true }, // Permits browser engine to store the HTTP-only cookie
          );

          const rawRestaurantData =
            response.data?.result?.restaurant || response.data?.restaurant;

          if (!rawRestaurantData) {
            console.error(
              "Authentication succeeded, but restaurant profile payload is missing from response.",
            );
            return false;
          }

          // 3. Enforce complete structural safety on the workingHours matrix to safeguard your dashboard views
          const standardDays: (
            | "Monday"
            | "Tuesday"
            | "Wednesday"
            | "Thursday"
            | "Friday"
            | "Saturday"
            | "Sunday"
          )[] = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ];

          const enforcedWorkingHours = standardDays.map((dayName) => {
            const existingDayRecord = rawRestaurantData.workingHours?.find(
              (h: any) => h.day === dayName,
            );
            return (
              existingDayRecord || {
                day: dayName,
                status: "Closed",
                startTime: "09:00",
                endTime: "22:00",
              }
            );
          });

          const normalizedProfile = {
            ...rawRestaurantData,
            workingHours: enforcedWorkingHours,
          };

          // 4. Wipe out the old stale state cache completely by overriding it with the freshly logged-in restaurant object
          setRestaurantProfile(normalizedProfile);
          setIsAuthenticated(true);

          return true;
        } catch (err) {
          console.error("Authentication handshake failed:", err);
          return false;
        }
      },

      logout: async () => {
        try {
          await axios.post(
            `${API_BASE_URL}/logout/restaurant-logout`,
            {},
            { withCredentials: true }, // Tells the browser to send along the cookie so the server can clear it
          );
        } catch (err) {
          console.error("Backend cookie clearance pipeline rejected:", err);
        } finally {
          // 2. Clear state inside finally block so the user interface resets even on network hiccup
          setRestaurantProfile(null);
          setIsAuthenticated(false);
          setLocation("/login");

          // 3. Force an immediate screen reload or hard routing bounce to completely clear cached memory models
          window.location.href = "/login";
        }
      },
    }),
    [
      status,
      loading,
      orders,
      revenueByDay,
      popularItems,
      menu,
      flashDeals,
      flashEnabled,
      offers,
      deliveryPartners,
      tickets,
      restaurantProfile,
      isAuthenticated,
      setIsAuthenticated,
      login,
      logout,
    ],
  );

  return (
    <StoreCtx.Provider value={value}>
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            gap: "10px",
          }}
        >
          <h2 style={{ fontFamily: "sans-serif", color: "#333" }}>
            Synchronizing Dinedash Engine...
          </h2>
          <p style={{ color: "#666" }}>
            Fetching live restaurant infrastructure data strings...
          </p>
        </div>
      ) : (
        children
      )}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
