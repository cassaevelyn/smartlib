import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { Layout } from './components/layout/Layout'
import { AuthLayout } from './components/layout/AuthLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LoadingSpinner } from './components/ui/loading-spinner'

// Auth pages
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage'

// Dashboard
import { DashboardPage } from './pages/dashboard/DashboardPage'

// Libraries
import { LibrariesPage } from './pages/libraries/LibrariesPage'
import { LibraryDetailPage } from './pages/libraries/LibraryDetailPage'
import { LibraryApplicationPage } from './pages/libraries/LibraryApplicationPage'

// Seats
import { SeatsPage } from './pages/seats/SeatsPage'
import { SeatBookingPage } from './pages/seats/SeatBookingPage'
import { MyBookingsPage } from './pages/seats/MyBookingsPage'

// Books
import { BooksPage } from './pages/books/BooksPage'
import { BookDetailPage } from './pages/books/BookDetailPage'
import { MyReservationsPage } from './pages/books/MyReservationsPage'

// Events
import { EventsPage } from './pages/events/EventsPage'
import { EventDetailPage } from './pages/events/EventDetailPage'
import { MyEventsPage } from './pages/events/MyEventsPage'

// Profile
import { ProfilePage } from './pages/profile/ProfilePage'
import { SettingsPage } from './pages/profile/SettingsPage'
import { SubscriptionsPage } from './pages/profile/SubscriptionsPage'

// Notifications
import { NotificationsPage } from './pages/notifications/NotificationsPage'

// Admin
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminLibrariesPage } from './pages/admin/AdminLibrariesPage'
import { AdminSeatsPage } from './pages/admin/AdminSeatsPage'
import { AdminBooksPage } from './pages/admin/AdminBooksPage'
import { AdminEventsPage } from './pages/admin/AdminEventsPage'
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage'

function App() {
  const { isLoading, isAuthenticated } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="verify-email/:token" element={<VerifyEmailPage />} />
      </Route>

      {/* Library Application Route - outside of main layout */}
      <Route 
        path="/apply-for-library" 
        element={
          <ProtectedRoute>
            <LibraryApplicationPage />
          </ProtectedRoute>
        } 
      />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                {/* Dashboard */}
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Libraries */}
                <Route path="/libraries" element={<LibrariesPage />} />
                <Route path="/libraries/:id" element={<LibraryDetailPage />} />

                {/* Seats */}
                <Route path="/seats" element={<SeatsPage />} />
                <Route path="/seats/book" element={<SeatBookingPage />} />
                <Route path="/my-bookings" element={<MyBookingsPage />} />

                {/* Books */}
                <Route path="/books" element={<BooksPage />} />
                <Route path="/books/:id" element={<BookDetailPage />} />
                <Route path="/my-reservations" element={<MyReservationsPage />} />

                {/* Events */}
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/my-events" element={<MyEventsPage />} />

                {/* Profile */}
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                
                {/* Notifications */}
                <Route path="/notifications" element={<NotificationsPage />} />

                {/* Admin routes */}
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/libraries" element={<AdminLibrariesPage />} />
                <Route path="/admin/seats" element={<AdminSeatsPage />} />
                <Route path="/admin/books" element={<AdminBooksPage />} />
                <Route path="/admin/events" element={<AdminEventsPage />} />
                <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Redirect to dashboard if authenticated, otherwise to login */}
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? "/" : "/auth/login"} replace />
        }
      />
    </Routes>
  )
}

export default App