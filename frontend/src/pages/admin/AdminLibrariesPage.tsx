import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Switch,
  FormControlLabel,
} from '@mui/material'
import { DataGrid, GridColDef, GridRenderCellParams, GridToolbar } from '@mui/x-data-grid'
import {
  Search,
  Add,
  Visibility,
  Edit,
  Delete,
  LocationOn,
  AccessTime,
  Wifi,
  LocalParking,
  LocalPrintshop,
  Scanner,
  Restaurant,
  Save,
  Cancel,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adminService } from '../../services/adminService'
import { Library } from '../../types'
import { LoadingSpinner } from '../../components/ui/loading-spinner'
import { useToast } from '../../hooks/use-toast'
import { formatDate, formatTime } from '../../lib/utils'

// Schema for library form
const librarySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  library_type: z.string().min(1, 'Library type is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  postal_code: z.string().optional(),
  phone_number: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  opening_time: z.string().min(1, 'Opening time is required'),
  closing_time: z.string().min(1, 'Closing time is required'),
  is_24_hours: z.boolean().default(false),
  total_capacity: z.number().int().min(0, 'Capacity must be a positive number'),
  total_seats: z.number().int().min(0, 'Seats must be a positive number'),
  total_study_rooms: z.number().int().min(0, 'Study rooms must be a positive number'),
  has_wifi: z.boolean().default(true),
  has_printing: z.boolean().default(true),
  has_scanning: z.boolean().default(true),
  has_cafeteria: z.boolean().default(false),
  has_parking: z.boolean().default(false),
  description: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  booking_advance_days: z.number().int().min(1, 'Must be at least 1 day'),
  max_booking_duration_hours: z.number().int().min(1, 'Must be at least 1 hour'),
  auto_cancel_minutes: z.number().int().min(5, 'Must be at least 5 minutes'),
})

type LibraryForm = z.infer<typeof librarySchema>

export function AdminLibrariesPage() {
  const { toast } = useToast()
  
  const [libraries, setLibraries] = useState<Library[]>([])
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [cityFilter, setCityFilter] = useState<string>('')
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LibraryForm>({
    resolver: zodResolver(librarySchema),
    defaultValues: {
      name: '',
      library_type: 'BRANCH',
      address: '',
      city: '',
      postal_code: '',
      phone_number: '',
      email: '',
      website: '',
      opening_time: '08:00',
      closing_time: '22:00',
      is_24_hours: false,
      total_capacity: 100,
      total_seats: 50,
      total_study_rooms: 5,
      has_wifi: true,
      has_printing: true,
      has_scanning: true,
      has_cafeteria: false,
      has_parking: false,
      description: '',
      status: 'ACTIVE',
      booking_advance_days: 7,
      max_booking_duration_hours: 8,
      auto_cancel_minutes: 30,
    },
  })

  const is24Hours = watch('is_24_hours')

  useEffect(() => {
    fetchLibraries()
  }, [])

  useEffect(() => {
    // Reset form when selected library changes
    if (selectedLibrary) {
      reset({
        name: selectedLibrary.name,
        library_type: selectedLibrary.library_type,
        address: selectedLibrary.address,
        city: selectedLibrary.city,
        postal_code: selectedLibrary.postal_code || '',
        phone_number: selectedLibrary.phone_number || '',
        email: selectedLibrary.email || '',
        website: selectedLibrary.website || '',
        opening_time: selectedLibrary.opening_time,
        closing_time: selectedLibrary.closing_time,
        is_24_hours: selectedLibrary.is_24_hours,
        total_capacity: selectedLibrary.total_capacity,
        total_seats: selectedLibrary.total_seats,
        total_study_rooms: selectedLibrary.total_study_rooms,
        has_wifi: selectedLibrary.has_wifi,
        has_printing: selectedLibrary.has_printing,
        has_scanning: selectedLibrary.has_scanning,
        has_cafeteria: selectedLibrary.has_cafeteria,
        has_parking: selectedLibrary.has_parking,
        description: selectedLibrary.description || '',
        status: selectedLibrary.status,
        booking_advance_days: selectedLibrary.booking_advance_days,
        max_booking_duration_hours: selectedLibrary.max_booking_duration_hours,
        auto_cancel_minutes: selectedLibrary.auto_cancel_minutes,
      })
    } else {
      reset({
        name: '',
        library_type: 'BRANCH',
        address: '',
        city: '',
        postal_code: '',
        phone_number: '',
        email: '',
        website: '',
        opening_time: '08:00',
        closing_time: '22:00',
        is_24_hours: false,
        total_capacity: 100,
        total_seats: 50,
        total_study_rooms: 5,
        has_wifi: true,
        has_printing: true,
        has_scanning: true,
        has_cafeteria: false,
        has_parking: false,
        description: '',
        status: 'ACTIVE',
        booking_advance_days: 7,
        max_booking_duration_hours: 8,
        auto_cancel_minutes: 30,
      })
    }
  }, [selectedLibrary, reset])

  const fetchLibraries = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // In a real app, this would be an actual API call
      // For now, we'll simulate the data
      
      // Simulated libraries data
      const librariesData: Library[] = [
        {
          id: '1',
          name: 'Main Library',
          code: 'LIB-MAIN',
          library_type: 'MAIN',
          status: 'ACTIVE',
          description: 'The main library with extensive collection and facilities',
          address: '123 Main Street',
          city: 'Karachi',
          postal_code: '74000',
          latitude: 24.8607,
          longitude: 67.0011,
          phone_number: '+92 21 1234567',
          email: 'main@smartlib.com',
          website: 'https://smartlib.com/main',
          opening_time: '08:00',
          closing_time: '22:00',
          is_24_hours: false,
          total_capacity: 500,
          total_seats: 300,
          available_seats: 150,
          occupied_seats: 150,
          total_study_rooms: 20,
          has_wifi: true,
          has_printing: true,
          has_scanning: true,
          has_cafeteria: true,
          has_parking: true,
          main_image: 'https://images.pexels.com/photos/590493/pexels-photo-590493.jpeg',
          gallery_images: [],
          floor_plan: '',
          allow_booking: true,
          booking_advance_days: 7,
          max_booking_duration_hours: 8,
          auto_cancel_minutes: 30,
          total_visits: 12500,
          average_rating: 4.7,
          total_reviews: 250,
          amenities: ['WiFi', 'Printing', 'Scanning', 'Cafeteria', 'Parking'],
          rules: ['No food in study areas', 'Maintain silence', 'No group discussions in silent zones'],
          is_open: true,
          occupancy_rate: 50,
          created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          name: 'Digital Hub',
          code: 'LIB-DIGI',
          library_type: 'DIGITAL_HUB',
          status: 'ACTIVE',
          description: 'Modern digital library with focus on electronic resources',
          address: '456 Tech Avenue',
          city: 'Lahore',
          postal_code: '54000',
          latitude: 31.5204,
          longitude: 74.3587,
          phone_number: '+92 42 9876543',
          email: 'digital@smartlib.com',
          website: 'https://smartlib.com/digital',
          opening_time: '09:00',
          closing_time: '21:00',
          is_24_hours: false,
          total_capacity: 200,
          total_seats: 150,
          available_seats: 75,
          occupied_seats: 75,
          total_study_rooms: 10,
          has_wifi: true,
          has_printing: true,
          has_scanning: true,
          has_cafeteria: false,
          has_parking: true,
          main_image: 'https://images.pexels.com/photos/1370296/pexels-photo-1370296.jpeg',
          gallery_images: [],
          floor_plan: '',
          allow_booking: true,
          booking_advance_days: 5,
          max_booking_duration_hours: 6,
          auto_cancel_minutes: 20,
          total_visits: 8000,
          average_rating: 4.5,
          total_reviews: 180,
          amenities: ['WiFi', 'Printing', 'Scanning', 'Parking'],
          rules: ['No food or drinks', 'Maintain silence', 'Handle equipment with care'],
          is_open: true,
          occupancy_rate: 50,
          created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          name: 'Study Center - North Campus',
          code: 'LIB-SCNC',
          library_type: 'STUDY_CENTER',
          status: 'ACTIVE',
          description: 'Quiet study center focused on individual study spaces',
          address: '789 University Road',
          city: 'Islamabad',
          postal_code: '44000',
          latitude: 33.6844,
          longitude: 73.0479,
          phone_number: '+92 51 5556677',
          email: 'north@smartlib.com',
          website: 'https://smartlib.com/north',
          opening_time: '08:00',
          closing_time: '23:00',
          is_24_hours: false,
          total_capacity: 150,
          total_seats: 120,
          available_seats: 40,
          occupied_seats: 80,
          total_study_rooms: 8,
          has_wifi: true,
          has_printing: true,
          has_scanning: true,
          has_cafeteria: false,
          has_parking: false,
          main_image: 'https://images.pexels.com/photos/256431/pexels-photo-256431.jpeg',
          gallery_images: [],
          floor_plan: '',
          allow_booking: true,
          booking_advance_days: 7,
          max_booking_duration_hours: 10,
          auto_cancel_minutes: 30,
          total_visits: 6000,
          average_rating: 4.3,
          total_reviews: 120,
          amenities: ['WiFi', 'Printing', 'Scanning'],
          rules: ['No food or drinks', 'Maintain silence', 'No group discussions'],
          is_open: true,
          occupancy_rate: 66.7,
          created_at: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          name: 'Branch Library - East Wing',
          code: 'LIB-EAST',
          library_type: 'BRANCH',
          status: 'MAINTENANCE',
          description: 'Branch library serving the eastern district',
          address: '101 East Street',
          city: 'Karachi',
          postal_code: '74100',
          latitude: 24.9056,
          longitude: 67.0822,
          phone_number: '+92 21 2233445',
          email: 'east@smartlib.com',
          website: 'https://smartlib.com/east',
          opening_time: '09:00',
          closing_time: '20:00',
          is_24_hours: false,
          total_capacity: 100,
          total_seats: 80,
          available_seats: 0,
          occupied_seats: 0,
          total_study_rooms: 5,
          has_wifi: true,
          has_printing: false,
          has_scanning: false,
          has_cafeteria: false,
          has_parking: true,
          main_image: 'https://images.pexels.com/photos/1290141/pexels-photo-1290141.jpeg',
          gallery_images: [],
          floor_plan: '',
          allow_booking: false,
          booking_advance_days: 7,
          max_booking_duration_hours: 8,
          auto_cancel_minutes: 30,
          total_visits: 4500,
          average_rating: 4.0,
          total_reviews: 90,
          amenities: ['WiFi', 'Parking'],
          rules: ['No food or drinks', 'Maintain silence'],
          is_open: false,
          occupancy_rate: 0,
          created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '5',
          name: '24/7 Study Hub',
          code: 'LIB-24X7',
          library_type: 'STUDY_CENTER',
          status: 'ACTIVE',
          description: 'Round-the-clock study center for night owls',
          address: '202 Night Avenue',
          city: 'Lahore',
          postal_code: '54100',
          latitude: 31.4504,
          longitude: 74.3087,
          phone_number: '+92 42 1122334',
          email: '24x7@smartlib.com',
          website: 'https://smartlib.com/24x7',
          opening_time: '00:00',
          closing_time: '23:59',
          is_24_hours: true,
          total_capacity: 80,
          total_seats: 60,
          available_seats: 25,
          occupied_seats: 35,
          total_study_rooms: 4,
          has_wifi: true,
          has_printing: true,
          has_scanning: true,
          has_cafeteria: true,
          has_parking: true,
          main_image: 'https://images.pexels.com/photos/2041540/pexels-photo-2041540.jpeg',
          gallery_images: [],
          floor_plan: '',
          allow_booking: true,
          booking_advance_days: 3,
          max_booking_duration_hours: 4,
          auto_cancel_minutes: 15,
          total_visits: 7500,
          average_rating: 4.8,
          total_reviews: 150,
          amenities: ['WiFi', 'Printing', 'Scanning', 'Cafeteria', 'Parking', '24/7 Access'],
          rules: ['Respect other students', 'Clean up after yourself', 'No loud music'],
          is_open: true,
          occupancy_rate: 58.3,
          created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]
      
      setLibraries(librariesData)
    } catch (error: any) {
      setError(error.message || 'Failed to fetch libraries')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateLibrary = async (data: LibraryForm) => {
    try {
      setIsSubmitting(true)
      
      // In a real app, this would be an actual API call
      // For now, we'll simulate the creation
      
      const newLibrary: Library = {
        id: Math.random().toString(36).substring(2, 11),
        code: `LIB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        ...data,
        available_seats: data.total_seats,
        occupied_seats: 0,
        main_image: '',
        gallery_images: [],
        floor_plan: '',
        total_visits: 0,
        average_rating: 0,
        total_reviews: 0,
        amenities: [],
        rules: [],
        is_open: data.status === 'ACTIVE',
        occupancy_rate: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      // Update local state
      setLibraries(prevLibraries => [...prevLibraries, newLibrary])
      
      toast({
        title: "Library Created",
        description: `${data.name} has been created successfully.`,
        variant: "default",
      })
      
      setCreateDialogOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to create library',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateLibrary = async (data: LibraryForm) => {
    if (!selectedLibrary) return
    
    try {
      setIsSubmitting(true)
      
      // In a real app, this would be an actual API call
      // For now, we'll simulate the update
      
      // Update local state
      setLibraries(prevLibraries =>
        prevLibraries.map(library =>
          library.id === selectedLibrary.id
            ? {
                ...library,
                ...data,
                is_open: data.status === 'ACTIVE' && (data.is_24_hours || (
                  new Date().getHours() >= parseInt(data.opening_time.split(':')[0]) &&
                  new Date().getHours() < parseInt(data.closing_time.split(':')[0])
                )),
                updated_at: new Date().toISOString(),
              }
            : library
        )
      )
      
      toast({
        title: "Library Updated",
        description: `${data.name} has been updated successfully.`,
        variant: "default",
      })
      
      setEditDialogOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to update library',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLibrary = async () => {
    if (!selectedLibrary) return
    
    try {
      setIsSubmitting(true)
      
      // In a real app, this would be an actual API call
      // For now, we'll simulate the deletion
      
      // Update local state
      setLibraries(prevLibraries =>
        prevLibraries.filter(library => library.id !== selectedLibrary.id)
      )
      
      toast({
        title: "Library Deleted",
        description: `${selectedLibrary.name} has been deleted successfully.`,
        variant: "default",
      })
      
      setDeleteDialogOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to delete library',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredLibraries = libraries.filter(library => {
    const matchesSearch = searchQuery === '' || 
      library.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      library.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      library.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      library.address.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = typeFilter === '' || library.library_type === typeFilter
    
    const matchesStatus = statusFilter === '' || library.status === statusFilter
    
    const matchesCity = cityFilter === '' || library.city === cityFilter
    
    return matchesSearch && matchesType && matchesStatus && matchesCity
  })

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
    },
    {
      field: 'code',
      headerName: 'Code',
      width: 120,
    },
    {
      field: 'library_type',
      headerName: 'Type',
      width: 150,
      valueFormatter: (params) => {
        const types: Record<string, string> = {
          'MAIN': 'Main Library',
          'BRANCH': 'Branch Library',
          'STUDY_CENTER': 'Study Center',
          'DIGITAL_HUB': 'Digital Hub',
        }
        return types[params.value] || params.value
      },
    },
    {
      field: 'city',
      headerName: 'City',
      width: 120,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params: GridRenderCellParams<Library>) => (
        <Chip
          label={params.row.status}
          size="small"
          color={
            params.row.status === 'ACTIVE'
              ? 'success'
              : params.row.status === 'MAINTENANCE'
              ? 'warning'
              : 'error'
          }
          variant="outlined"
        />
      ),
    },
    {
      field: 'is_open',
      headerName: 'Open',
      width: 100,
      renderCell: (params: GridRenderCellParams<Library>) => (
        <Chip
          label={params.row.is_open ? 'Open' : 'Closed'}
          size="small"
          color={params.row.is_open ? 'success' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'total_seats',
      headerName: 'Seats',
      width: 100,
      valueFormatter: (params) => params.value.toLocaleString(),
    },
    {
      field: 'occupancy_rate',
      headerName: 'Occupancy',
      width: 120,
      valueFormatter: (params) => `${params.value.toFixed(1)}%`,
    },
    {
      field: 'average_rating',
      headerName: 'Rating',
      width: 120,
      valueFormatter: (params) => `${params.value.toFixed(1)} (${params.row.total_reviews})`,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Library>) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedLibrary(params.row)
                setViewDialogOpen(true)
              }}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Edit Library">
            <IconButton
              size="small"
              color="primary"
              onClick={() => {
                setSelectedLibrary(params.row)
                setEditDialogOpen(true)
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete Library">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setSelectedLibrary(params.row)
                setDeleteDialogOpen(true)
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ]

  const renderLibraryForm = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Library Name"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
              required
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="library_type"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Library Type"
              fullWidth
              error={!!errors.library_type}
              helperText={errors.library_type?.message}
              required
            >
              <MenuItem value="MAIN">Main Library</MenuItem>
              <MenuItem value="BRANCH">Branch Library</MenuItem>
              <MenuItem value="STUDY_CENTER">Study Center</MenuItem>
              <MenuItem value="DIGITAL_HUB">Digital Hub</MenuItem>
            </TextField>
          )}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Description"
              fullWidth
              multiline
              rows={3}
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Location Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12}>
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Address"
              fullWidth
              error={!!errors.address}
              helperText={errors.address?.message}
              required
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="city"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="City"
              fullWidth
              error={!!errors.city}
              helperText={errors.city?.message}
              required
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="postal_code"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Postal Code"
              fullWidth
              error={!!errors.postal_code}
              helperText={errors.postal_code?.message}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Status"
              fullWidth
              error={!!errors.status}
              helperText={errors.status?.message}
              required
            >
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="MAINTENANCE">Under Maintenance</MenuItem>
              <MenuItem value="CLOSED">Temporarily Closed</MenuItem>
              <MenuItem value="RENOVATION">Under Renovation</MenuItem>
            </TextField>
          )}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Contact Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="phone_number"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Phone Number"
              fullWidth
              error={!!errors.phone_number}
              helperText={errors.phone_number?.message}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="website"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Website"
              fullWidth
              error={!!errors.website}
              helperText={errors.website?.message}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Operating Hours
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12}>
        <Controller
          name="is_24_hours"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label="Open 24 Hours"
            />
          )}
        />
      </Grid>
      
      {!is24Hours && (
        <>
          <Grid item xs={12} md={6}>
            <Controller
              name="opening_time"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Opening Time"
                  type="time"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.opening_time}
                  helperText={errors.opening_time?.message}
                  required
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Controller
              name="closing_time"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Closing Time"
                  type="time"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.closing_time}
                  helperText={errors.closing_time?.message}
                  required
                />
              )}
            />
          </Grid>
        </>
      )}
      
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Capacity and Features
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="total_capacity"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Total Capacity"
              type="number"
              fullWidth
              error={!!errors.total_capacity}
              helperText={errors.total_capacity?.message}
              required
              onChange={(e) => field.onChange(parseInt(e.target.value))}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="total_seats"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Total Seats"
              type="number"
              fullWidth
              error={!!errors.total_seats}
              helperText={errors.total_seats?.message}
              required
              onChange={(e) => field.onChange(parseInt(e.target.value))}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="total_study_rooms"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Study Rooms"
              type="number"
              fullWidth
              error={!!errors.total_study_rooms}
              helperText={errors.total_study_rooms?.message}
              required
              onChange={(e) => field.onChange(parseInt(e.target.value))}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          Amenities
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Controller
              name="has_wifi"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="WiFi"
                />
              )}
            />
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Controller
              name="has_printing"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Printing"
                />
              )}
            />
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Controller
              name="has_scanning"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Scanning"
                />
              )}
            />
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Controller
              name="has_cafeteria"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Cafeteria"
                />
              )}
            />
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Controller
              name="has_parking"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Parking"
                />
              )}
            />
          </Grid>
        </Grid>
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Booking Settings
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="booking_advance_days"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Advance Booking Days"
              type="number"
              fullWidth
              error={!!errors.booking_advance_days}
              helperText={errors.booking_advance_days?.message}
              required
              onChange={(e) => field.onChange(parseInt(e.target.value))}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="max_booking_duration_hours"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Max Booking Duration (hours)"
              type="number"
              fullWidth
              error={!!errors.max_booking_duration_hours}
              helperText={errors.max_booking_duration_hours?.message}
              required
              onChange={(e) => field.onChange(parseInt(e.target.value))}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="auto_cancel_minutes"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Auto-Cancel Minutes"
              type="number"
              fullWidth
              error={!!errors.auto_cancel_minutes}
              helperText={errors.auto_cancel_minutes?.message}
              required
              onChange={(e) => field.onChange(parseInt(e.target.value))}
            />
          )}
        />
      </Grid>
    </Grid>
  )

  return (
    <Box sx={{ p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Library Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage libraries, study centers, and digital hubs.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Libraries
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setSelectedLibrary(null)
                  setCreateDialogOpen(true)
                }}
              >
                Add Library
              </Button>
            </Box>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search by name, code, city, or address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="MAIN">Main Library</MenuItem>
                  <MenuItem value="BRANCH">Branch Library</MenuItem>
                  <MenuItem value="STUDY_CENTER">Study Center</MenuItem>
                  <MenuItem value="DIGITAL_HUB">Digital Hub</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
                  <MenuItem value="CLOSED">Closed</MenuItem>
                  <MenuItem value="RENOVATION">Renovation</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  label="City"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                >
                  <MenuItem value="">All Cities</MenuItem>
                  {Array.from(new Set(libraries.map(lib => lib.city))).map(city => (
                    <MenuItem key={city} value={city}>{city}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            
            <Box sx={{ height: 600, width: '100%' }}>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <LoadingSpinner size="lg" />
                </Box>
              ) : (
                <DataGrid
                  rows={filteredLibraries}
                  columns={columns}
                  initialState={{
                    pagination: {
                      paginationModel: { page: 0, pageSize: 10 },
                    },
                    sorting: {
                      sortModel: [{ field: 'name', sort: 'asc' }],
                    },
                  }}
                  pageSizeOptions={[10, 25, 50]}
                  checkboxSelection
                  disableRowSelectionOnClick
                  components={{
                    Toolbar: GridToolbar,
                  }}
                />
              )}
            </Box>
          </CardContent>
        </Card>

        {/* View Library Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Library Details</DialogTitle>
          <DialogContent dividers>
            {selectedLibrary && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Basic Information
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Name
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.name}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Code
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.code}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Type
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.library_type === 'MAIN' ? 'Main Library' :
                       selectedLibrary.library_type === 'BRANCH' ? 'Branch Library' :
                       selectedLibrary.library_type === 'STUDY_CENTER' ? 'Study Center' :
                       'Digital Hub'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body1">
                      <Chip
                        label={selectedLibrary.status}
                        size="small"
                        color={
                          selectedLibrary.status === 'ACTIVE'
                            ? 'success'
                            : selectedLibrary.status === 'MAINTENANCE'
                            ? 'warning'
                            : 'error'
                        }
                      />
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.description || 'No description available'}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Location
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.address}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      City
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.city}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Postal Code
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.postal_code || 'Not specified'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Contact Information
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Phone Number
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.phone_number || 'Not specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.email || 'Not specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Website
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.website || 'Not specified'}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Operating Hours
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Hours
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.is_24_hours
                        ? '24 Hours'
                        : `${selectedLibrary.opening_time} - ${selectedLibrary.closing_time}`}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Capacity and Features
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Capacity
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.total_capacity}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Seats
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.total_seats}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Study Rooms
                    </Typography>
                    <Typography variant="body1">
                      {selectedLibrary.total_study_rooms}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Amenities
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {selectedLibrary.has_wifi && (
                        <Chip icon={<Wifi />} label="WiFi" size="small" />
                      )}
                      {selectedLibrary.has_printing && (
                        <Chip icon={<LocalPrintshop />} label="Printing" size="small" />
                      )}
                      {selectedLibrary.has_scanning && (
                        <Chip icon={<Scanner />} label="Scanning" size="small" />
                      )}
                      {selectedLibrary.has_cafeteria && (
                        <Chip icon={<Restaurant />} label="Cafeteria" size="small" />
                      )}
                      {selectedLibrary.has_parking && (
                        <Chip icon={<LocalParking />} label="Parking" size="small" />
                      )}
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Total Visits
                      </Typography>
                      <Typography variant="body1">
                        {selectedLibrary.total_visits.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Average Rating
                      </Typography>
                      <Typography variant="body1">
                        {selectedLibrary.average_rating.toFixed(1)} ({selectedLibrary.total_reviews} reviews)
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Current Occupancy
                      </Typography>
                      <Typography variant="body1">
                        {selectedLibrary.occupancy_rate.toFixed(1)}% ({selectedLibrary.occupied_seats}/{selectedLibrary.total_seats})
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(selectedLibrary.created_at)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setViewDialogOpen(false)
                setEditDialogOpen(true)
              }}
            >
              Edit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Library Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => !isSubmitting && setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create New Library</DialogTitle>
          <DialogContent dividers>
            <Box component="form" noValidate sx={{ mt: 1 }}>
              {renderLibraryForm()}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit(handleCreateLibrary)}
              disabled={isSubmitting}
              startIcon={isSubmitting ? <LoadingSpinner size="sm" /> : <Save />}
            >
              Create Library
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Library Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => !isSubmitting && setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Edit Library</DialogTitle>
          <DialogContent dividers>
            <Box component="form" noValidate sx={{ mt: 1 }}>
              {renderLibraryForm()}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit(handleUpdateLibrary)}
              disabled={isSubmitting}
              startIcon={isSubmitting ? <LoadingSpinner size="sm" /> : <Save />}
            >
              Update Library
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Library Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !isSubmitting && setDeleteDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Delete Library</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to delete {selectedLibrary?.name}?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This action cannot be undone. All associated data will be permanently removed.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteLibrary}
              disabled={isSubmitting}
              startIcon={isSubmitting ? <LoadingSpinner size="sm" /> : <Delete />}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Box>
  )
}