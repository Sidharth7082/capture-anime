
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";

// Code-split every non-landing page so the initial bundle stays lean.
const AnimeDetailPage = lazy(() => import("./pages/AnimeDetailPage"));
const AuthPage = lazy(() => import("./pages/Auth"));
const Browse = lazy(() => import("./pages/Browse"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const GifsPage = lazy(() => import("./pages/GifsPage"));
const DanbooruPage = lazy(() => import("./pages/DanbooruPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const DMCAPage = lazy(() => import("./pages/DMCAPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e0e0ff]/60 via-[#f8f4fa]/60 to-[#faf6fb]/90">
    <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={withSuspense(<AuthPage />)} />
          <Route path="/browse/:letter" element={withSuspense(<Browse />)} />
          <Route path="/anime/:id" element={withSuspense(<AnimeDetailPage />)} />
          <Route path="/profile" element={withSuspense(<ProfilePage />)} />
          <Route path="/gifs" element={withSuspense(<GifsPage />)} />
          <Route path="/danbooru" element={withSuspense(<DanbooruPage />)} />
          <Route path="/settings" element={withSuspense(<SettingsPage />)} />
          <Route path="/terms" element={withSuspense(<TermsOfServicePage />)} />
          <Route path="/dmca" element={withSuspense(<DMCAPage />)} />
          <Route path="/contact" element={withSuspense(<ContactPage />)} />
          <Route path="*" element={withSuspense(<NotFound />)} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
