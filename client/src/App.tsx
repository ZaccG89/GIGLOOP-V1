import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Login from "./pages/login";
import Home from "./pages/home";
import Settings from "./pages/settings";
import Venues from "./pages/venues";
import VenueDetail from "./pages/venue-detail";
import AdminSubmissions from "./pages/admin-submissions";
import VenueRegister from "./pages/venue-register";
import Profile from "./pages/profile";
import UserProfile from "./pages/user-profile";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Home} />
      <Route path="/settings" component={Settings} />
      <Route path="/venues" component={Venues} />
      <Route path="/venues/:id" component={VenueDetail} />
      <Route path="/admin/submissions" component={AdminSubmissions} />
      <Route path="/venue/register" component={VenueRegister} />
      <Route path="/profile" component={Profile} />
      <Route path="/users/:id" component={UserProfile} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
