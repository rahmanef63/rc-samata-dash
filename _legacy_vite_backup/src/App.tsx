import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import FinancePage from "./pages/FinancePage.tsx";
import OperationPage from "./pages/OperationPage.tsx";
import ReportPage from "./pages/ReportPage.tsx";
import ChatPage from "./pages/ChatPage.tsx";
import MorePage from "./pages/MorePage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/sales" element={<FinancePage />} />
          <Route path="/cashflow" element={<FinancePage />} />
          <Route path="/expenses" element={<FinancePage />} />
          <Route path="/payables" element={<FinancePage />} />
          <Route path="/petty-cash" element={<FinancePage />} />
          <Route path="/closing" element={<FinancePage />} />
          <Route path="/operation" element={<OperationPage />} />
          <Route path="/audit" element={<OperationPage />} />
          <Route path="/inventory" element={<OperationPage />} />
          <Route path="/master-data" element={<OperationPage />} />
          <Route path="/settings" element={<OperationPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
