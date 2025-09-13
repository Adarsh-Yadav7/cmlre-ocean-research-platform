import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import AiModels from "@/pages/ai-models";
import Biodiversity from "@/pages/biodiversity";
import DataCenter from "@/pages/data-center";
import Research from "@/pages/research";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/ai-models" component={AiModels} />
      <Route path="/biodiversity" component={Biodiversity} />
      <Route path="/data-center" component={DataCenter} />
      <Route path="/research" component={Research} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  // Initialize WebSocket connection for real-time updates
  const { isConnected } = useWebSocket();

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between p-4 border-b bg-card">
                <div className="flex items-center gap-4">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🌊</div>
                    <div>
                      <h1 className="text-xl font-bold text-foreground">CMLRE Ocean Platform</h1>
                      <p className="text-sm text-muted-foreground">AI-Driven Unified Data Platform</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 pulse-dot' : 'bg-red-500'}`}></div>
                    <span className="text-muted-foreground">
                      {isConnected ? 'Live Data' : 'Disconnected'}
                    </span>
                  </div>
                  <Button data-testid="button-user-profile">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground mr-2">
                      DS
                    </div>
                    Dr. Sharma
                  </Button>
                </div>
              </header>
              
              <main className="flex-1 overflow-hidden">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
