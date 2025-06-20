import { apiGet, apiPost, apiPatch, apiDelete, handleApiError, PaginatedResponse } from '../lib/api'
import { User, Library, Seat, Book, Event } from '../types'

export const adminService = {
  // User Management
  getUsers: async (params?: any): Promise<PaginatedResponse<User>> => {
    try {
      return await apiGet<PaginatedResponse<User>>('/admin/users/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getUserDetails: async (userId: string): Promise<User> => {
    try {
      return await apiGet<User>(`/admin/users/${userId}/`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  approveUser: async (userId: string): Promise<{ message: string }> => {
    try {
      return await apiPost<{ message: string }>(`/admin/users/${userId}/approve/`, { action: 'approve' })
    } catch (error) {
      throw handleApiError(error)
    }
  },

  rejectUser: async (userId: string): Promise<{ message: string }> => {
    try {
      return await apiPost<{ message: string }>(`/admin/users/${userId}/approve/`, { action: 'reject' })
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateUser: async (userId: string, data: Partial<User>): Promise<User> => {
    try {
      return await apiPatch<User>(`/admin/users/${userId}/`, data)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Library Management
  getAdminLibraries: async (params?: any): Promise<PaginatedResponse<Library>> => {
    try {
      return await apiGet<PaginatedResponse<Library>>('/admin/libraries/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createLibrary: async (data: Partial<Library>): Promise<Library> => {
    try {
      return await apiPost<Library>('/admin/libraries/', data)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateLibrary: async (libraryId: string, data: Partial<Library>): Promise<Library> => {
    try {
      return await apiPatch<Library>(`/admin/libraries/${libraryId}/`, data)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteLibrary: async (libraryId: string): Promise<void> => {
    try {
      await apiDelete(`/admin/libraries/${libraryId}/`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Seat Management
  getAdminSeats: async (params?: any): Promise<PaginatedResponse<Seat>> => {
    try {
      return await apiGet<PaginatedResponse<Seat>>('/admin/seats/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createSeat: async (data: Partial<Seat>): Promise<Seat> => {
    try {
      return await apiPost<Seat>('/admin/seats/', data)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateSeat: async (seatId: string, data: Partial<Seat>): Promise<Seat> => {
    try {
      return await apiPatch<Seat>(`/admin/seats/${seatId}/`, data)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteSeat: async (seatId: string): Promise<void> => {
    try {
      await apiDelete(`/admin/seats/${seatId}/`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Book Management
  getAdminBooks: async (params?: any): Promise<PaginatedResponse<Book>> => {
    try {
      return await apiGet<PaginatedResponse<Book>>('/admin/books/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createBook: async (data: Partial<Book>): Promise<Book> => {
    try {
      return await apiPost<Book>('/admin/books/', data)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateBook: async (bookId: string, data: Partial<Book>): Promise<Book> => {
    try {
      return await apiPatch<Book>(`/admin/books/${bookId}/`, data)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteBook: async (bookId: string): Promise<void> => {
    try {
      await apiDelete(`/admin/books/${bookId}/`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Event Management
  getAdminEvents: async (params?: any): Promise<PaginatedResponse<Event>> => {
    try {
      return await apiGet<PaginatedResponse<Event>>('/admin/events/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createEvent: async (data: Partial<Event>): Promise<Event> => {
    try {
      return await apiPost<Event>('/admin/events/', data)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateEvent: async (eventId: string, data: Partial<Event>): Promise<Event> => {
    try {
      return await apiPatch<Event>(`/admin/events/${eventId}/`, data)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteEvent: async (eventId: string): Promise<void> => {
    try {
      await apiDelete(`/admin/events/${eventId}/`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Analytics
  getDashboardAnalytics: async (params?: any): Promise<any> => {
    try {
      return await apiGet('/analytics/dashboard/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getUserAnalytics: async (params?: any): Promise<any> => {
    try {
      return await apiGet('/analytics/users/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getBookAnalytics: async (params?: any): Promise<any> => {
    try {
      return await apiGet('/analytics/books/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getSeatAnalytics: async (params?: any): Promise<any> => {
    try {
      return await apiGet('/analytics/seats/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getEventAnalytics: async (params?: any): Promise<any> => {
    try {
      return await apiGet('/analytics/events/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getLibraryAnalytics: async (params?: any): Promise<any> => {
    try {
      return await apiGet('/analytics/libraries/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getSubscriptionAnalytics: async (params?: any): Promise<any> => {
    try {
      return await apiGet('/analytics/subscriptions/', params)
    } catch (error) {
      throw handleApiError(error)
    }
  }
}