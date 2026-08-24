import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { CustomerLayout } from '@/layouts/CustomerLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AuthGuard } from '@/features/auth/AuthGuard'

// Admin Pages (No lazy loading for dashboard due to realtime needs & fast nav)
import DashboardPage from '@/features/admin/dashboard/DashboardPage'
import OrdersPage from '@/features/admin/orders/OrdersPage'
import ProductsPage from '@/features/admin/products/ProductsPage'
import ProductFormPage from '@/features/admin/products/ProductFormPage'
import CategoriesPage from '@/features/admin/categories/CategoriesPage'
import AddonGroupsPage from '@/features/admin/addons/AddonGroupsPage'
import DeliveryPage from '@/features/admin/delivery/DeliveryPage'
import WebsitePage from '@/features/admin/website/WebsitePage'
import SettingsPage from '@/features/admin/settings/SettingsPage'

// Lazy-loaded pages
const LandingPage = lazy(() => import('@/features/landing/LandingPage'))
const OrderPage = lazy(() => import('@/features/ordering/OrderPage'))
const CheckoutPage = lazy(() => import('@/features/ordering/CheckoutPage'))
const OrderSuccessPage = lazy(() => import('@/features/ordering/OrderSuccessPage'))
const TrackOrderPage = lazy(() => import('@/features/tracking/TrackOrderPage'))
const AdminLoginPage = lazy(() => import('@/features/auth/AdminLoginPage'))
const ActivitiesPage = lazy(() => import('@/features/activities/ActivitiesPage'))

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
    </div>
  )
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

const router = createBrowserRouter([
  // Landing
  {
    path: '/',
    element: <SuspenseWrapper><LandingPage /></SuspenseWrapper>,
  },

  // Customer routes
  {
    element: <CustomerLayout />,
    children: [
      {
        path: '/order',
        element: <SuspenseWrapper><OrderPage /></SuspenseWrapper>,
      },
      {
        path: '/order/checkout',
        element: <SuspenseWrapper><CheckoutPage /></SuspenseWrapper>,
      },
      {
        path: '/order/success/:id',
        element: <SuspenseWrapper><OrderSuccessPage /></SuspenseWrapper>,
      },
      {
        path: '/activities',
        element: <SuspenseWrapper><ActivitiesPage /></SuspenseWrapper>,
      },
    ],
  },

  // Order tracking (standalone page)
  {
    path: '/track/:token',
    element: <SuspenseWrapper><TrackOrderPage /></SuspenseWrapper>,
  },

  // Admin login
  {
    path: '/admin/login',
    element: <SuspenseWrapper><AdminLoginPage /></SuspenseWrapper>,
  },

  // Admin routes (protected)
  {
    path: '/admin',
    element: (
      <AuthGuard>
        <AdminLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/new', element: <ProductFormPage /> },
      { path: 'products/:id', element: <ProductFormPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'addons', element: <AddonGroupsPage /> },
      { path: 'delivery', element: <DeliveryPage /> },
      { path: 'website', element: <WebsitePage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
