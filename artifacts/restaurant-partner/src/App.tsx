import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/not-found";
import { StoreProvider, useStore } from "@/lib/store";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import Menu from "@/pages/Menu";
import FlashFood from "@/pages/FlashFood";
import Offers from "@/pages/Offers";
import Delivery from "@/pages/Delivery";
import Reports from "@/pages/Reports";
import Support from "@/pages/Support";
import Settings from "@/pages/Settings";
import Login from "./pages/Login";

const queryClient = new QueryClient();

function Router() {
  const { isAuthenticated } = useStore();

  // 🛡️ UN-AUTHENTICATED ROUTING STATE PASS (No AppShell layout wrapper)
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        {/* Wildcard match redirects any unauthenticated direct URL hits right to /login */}
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/orders" component={Orders} />
        <Route path="/menu" component={Menu} />
        <Route path="/flash-food" component={FlashFood} />
        <Route path="/offers" component={Offers} />
        <Route path="/delivery" component={Delivery} />
        <Route path="/reports" component={Reports} />
        <Route path="/support" component={Support} />
        <Route path="/settings" component={Settings} />
        <Route path="/login" component={Login}>
          <Redirect to="/" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster position="top-right" richColors closeButton />
        </StoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;