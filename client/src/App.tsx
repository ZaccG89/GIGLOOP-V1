import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SpotifyConnect from "@/pages/spotify-connect";
import SearchPage from "./pages/search";


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
import EventDetail from "./pages/event-detail"; 
import Signup from "./pages/signup";
import ArtistsPage from "@/pages/artists";


function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/spotify-connect" component={SpotifyConnect} />
      <Route path="/settings" component={Settings} />
      <Route path="/venues" component={Venues} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/venues/:id" component={VenueDetail} />
      <Route path="/admin/submissions" component={AdminSubmissions} />
      <Route path="/venue/register" component={VenueRegister} />
      <Route path="/profile" component={Profile} />
      <Route path="/users/:id" component={UserProfile} />
      <Route path="/artists/:id" component={ArtistsPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/" component={Home} />
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
