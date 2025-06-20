import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  CircularProgress,
  Alert,
  Rating,
  IconButton,
  Divider,
} from '@mui/material'
import {
  Search,
  FilterList,
  LocationOn,
  AccessTime,
  Wifi,
  LocalParking,
  Restaurant,
  ChevronRight,
  Close,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { libraryService } from '../../services/libraryService'
import { Library, PaginatedResponse } from '../../types'
import { LoadingSpinner } from '../../components/ui/loading-spinner'

export function LibrariesPage() {
  const navigate = useNavigate()
  const [libraries, setLibraries] = useState<Library[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [libraryTypeFilter, setLibraryTypeFilter] = useState('')
  const [hasWifiFilter, setHasWifiFilter] = useState<boolean | null>(null)
  const [hasParkingFilter, setHasParkingFilter] = useState<boolean | null>(null)
  const [hasCafeteriaFilter, setHasCafeteriaFilter] = useState<boolean | null>(null)
  const [is24HoursFilter, setIs24HoursFilter] = useState<boolean | null>(null)

  useEffect(() => {
    fetchLibraries()
  }, [currentPage])

  const fetchLibraries = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Build query parameters
      const params: any = {
        page: currentPage,
      }

      if (searchQuery) {
        params.search = searchQuery
      }

      if (cityFilter) {
        params.city = cityFilter
      }

      if (libraryTypeFilter) {
        params.library_type = libraryTypeFilter
      }

      if (hasWifiFilter !== null) {
        params.has_wifi = hasWifiFilter
      }

      if (hasParkingFilter !== null) {
        params.has_parking = hasParkingFilter
      }

      if (hasCafeteriaFilter !== null) {
        params.has_cafeteria = hasCafeteriaFilter
      }

      if (is24HoursFilter !== null) {
        params.is_24_hours = is24HoursFilter
      }

      const response = await libraryService.getLibraries(params)
      setLibraries(response.results)
      setTotalPages(Math.ceil(response.count / 20)) // Assuming 20 items per page
    } catch (error: any) {
      setError(error.message || 'Failed to fetch libraries')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchLibraries()
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setCityFilter('')
    setLibraryTypeFilter('')
    setHasWifiFilter(null)
    setHasParkingFilter(null)
    setHasCafeteriaFilter(null)
    setIs24HoursFilter(null)
    setCurrentPage(1)
    fetchLibraries()
  }

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value)
  }

  return (
    <Box sx={{ p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Libraries
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse and discover our network of libraries and study centers.
          </Typography>
        </Box>

        {/* Search and Filters */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Search Libraries"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>City</InputLabel>
                  <Select
                    value={cityFilter}
                    label="City"
                    onChange={(e) => setCityFilter(e.target.value)}
                  >
                    <MenuItem value="">All Cities</MenuItem>
                    <MenuItem value="Karachi">Karachi</MenuItem>
                    <MenuItem value="Lahore">Lahore</MenuItem>
                    <MenuItem value="Islamabad">Islamabad</MenuItem>
                    <MenuItem value="Peshawar">Peshawar</MenuItem>
                    <MenuItem value="Quetta">Quetta</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => setShowFilters(!showFilters)}
                    sx={{ flexGrow: 1 }}
                  >
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSearch}
                  >
                    Search
                  </Button>
                </Box>
              </Grid>

              {showFilters && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }}>Advanced Filters</Divider>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Library Type</InputLabel>
                      <Select
                        value={libraryTypeFilter}
                        label="Library Type"
                        onChange={(e) => setLibraryTypeFilter(e.target.value)}
                      >
                        <MenuItem value="">All Types</MenuItem>
                        <MenuItem value="MAIN">Main Library</MenuItem>
                        <MenuItem value="BRANCH">Branch Library</MenuItem>
                        <MenuItem value="STUDY_CENTER">Study Center</MenuItem>
                        <MenuItem value="DIGITAL_HUB">Digital Hub</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Has WiFi</InputLabel>
                      <Select
                        value={hasWifiFilter === null ? '' : hasWifiFilter.toString()}
                        label="Has WiFi"
                        onChange={(e) => {
                          const value = e.target.value
                          setHasWifiFilter(value === '' ? null : value === 'true')
                        }}
                      >
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value="true">Yes</MenuItem>
                        <MenuItem value="false">No</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Has Parking</InputLabel>
                      <Select
                        value={hasParkingFilter === null ? '' : hasParkingFilter.toString()}
                        label="Has Parking"
                        onChange={(e) => {
                          const value = e.target.value
                          setHasParkingFilter(value === '' ? null : value === 'true')
                        }}
                      >
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value="true">Yes</MenuItem>
                        <MenuItem value="false">No</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Has Cafeteria</InputLabel>
                      <Select
                        value={hasCafeteriaFilter === null ? '' : hasCafeteriaFilter.toString()}
                        label="Has Cafeteria"
                        onChange={(e) => {
                          const value = e.target.value
                          setHasCafeteriaFilter(value === '' ? null : value === 'true')
                        }}
                      >
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value="true">Yes</MenuItem>
                        <MenuItem value="false">No</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>24 Hours</InputLabel>
                      <Select
                        value={is24HoursFilter === null ? '' : is24HoursFilter.toString()}
                        label="24 Hours"
                        onChange={(e) => {
                          const value = e.target.value
                          setIs24HoursFilter(value === '' ? null : value === 'true')
                        }}
                      >
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value="true">Yes</MenuItem>
                        <MenuItem value="false">No</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={handleResetFilters}
                      startIcon={<Close />}
                    >
                      Reset Filters
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <LoadingSpinner size="lg" />
          </Box>
        ) : (
          <>
            {/* Libraries Grid */}
            {libraries.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No libraries found
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Try adjusting your search or filters
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {libraries.map((library, index) => (
                  <Grid item xs={12} md={6} lg={4} key={library.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    >
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardMedia
                          component="img"
                          height="160"
                          image={library.main_image || 'https://images.pexels.com/photos/590493/pexels-photo-590493.jpeg'}
                          alt={library.name}
                        />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" component="div">
                              {library.name}
                            </Typography>
                            <Chip
                              label={library.status}
                              size="small"
                              color={
                                library.status === 'ACTIVE'
                                  ? 'success'
                                  : library.status === 'MAINTENANCE'
                                  ? 'warning'
                                  : 'error'
                              }
                            />
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <LocationOn fontSize="small" color="action" sx={{ mr: 0.5 }} />
                            <Typography variant="body2" color="text.secondary">
                              {library.city}, {library.address}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AccessTime fontSize="small" color="action" sx={{ mr: 0.5 }} />
                            <Typography variant="body2" color="text.secondary">
                              {library.is_24_hours
                                ? '24 Hours'
                                : `${library.opening_time} - ${library.closing_time}`}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Rating
                              value={library.average_rating}
                              precision={0.5}
                              size="small"
                              readOnly
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              ({library.total_reviews})
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                            <Chip
                              label={library.library_type.replace('_', ' ')}
                              size="small"
                              variant="outlined"
                            />
                            {library.has_wifi && (
                              <Chip
                                icon={<Wifi fontSize="small" />}
                                label="WiFi"
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {library.has_parking && (
                              <Chip
                                icon={<LocalParking fontSize="small" />}
                                label="Parking"
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {library.has_cafeteria && (
                              <Chip
                                icon={<Restaurant fontSize="small" />}
                                label="Cafeteria"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip
                              label={`${library.available_seats}/${library.total_seats} seats available`}
                              size="small"
                              color={
                                library.occupancy_rate < 50
                                  ? 'success'
                                  : library.occupancy_rate < 80
                                  ? 'warning'
                                  : 'error'
                              }
                            />
                            <Button
                              size="small"
                              endIcon={<ChevronRight />}
                              onClick={() => navigate(`/libraries/${library.id}`)}
                            >
                              Details
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </motion.div>
    </Box>
  )
}