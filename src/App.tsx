import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminLayout } from "./components/layout/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Dashboard from "./pages/admin/Dashboard";
import TeacherManagement from "./pages/admin/TeacherManagement";
import TextbookManagement from "./pages/admin/TextbookManagement";
import MaterialManagement from "./pages/admin/MaterialManagement";
import MaterialManagementV2 from "./pages/admin/MaterialManagementV2";
import VisualEditor from "./pages/admin/VisualEditor";
import VisualEditorV2 from "./pages/admin/VisualEditorV2";
import WixStyleEditor from "./pages/admin/WixStyleEditor";
import MaterialPreview from "./pages/admin/MaterialPreview";
import ImageManagement from "./pages/admin/ImageManagement";
import UserManagement from "./pages/admin/UserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />

            {/* Visual Editor Routes (Full Screen) */}
            <Route path="/admin/materials-v2/editor/:id" element={
              <ProtectedRoute>
                <WixStyleEditor />
              </ProtectedRoute>
            } />
            <Route path="/admin/materials-v2/preview/:id" element={
              <ProtectedRoute>
                <MaterialPreview />
              </ProtectedRoute>
            } />

            {/* Admin Routes with Layout */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="teachers" element={<TeacherManagement />} />
              <Route path="textbooks" element={<TextbookManagement />} />
              <Route path="materials" element={<MaterialManagement />} />
              <Route path="materials-v2" element={<MaterialManagementV2 />} />
              <Route path="images" element={<ImageManagement />} />
              <Route path="users" element={<UserManagement />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
