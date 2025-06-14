"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  PauseCircle,
  User,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  X,
  Eye,
  Play,
  ArrowRight,
  MapPin,
  Timer,
  UserCheck,
  Zap,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QueueSpinner } from "@/components/queue-spinner"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Progress } from "@/components/ui/progress"
import type { SessionData } from "@/lib/session"
import { DepartmentSelectionDialog } from "@/components/hospital/DepartmentSelectionDialog"
import { ProtectedRoute } from "@/components/ProtectedRoute"

interface Room {
  _id: string
  roomNumber: string
  staff: {
    _id: string
    firstName: string
    lastName: string
  }
  available: boolean
}

interface Department {
  _id: string
  title: string
  icon: string
  rooms: Room[]
}

interface DepartmentHistoryEntry {
  department: string
  icon?: string
  timestamp: string
  startedAt?: string | null
  completedAt?: string | null
  processingDuration: number
  waitingDuration: number
  note?: string
  completed?: boolean
  roomId?: string
  holdStartedAt?: string | null
  holdDuration: number
}

interface Ticket {
  _id: string
  ticketNo: string
  patientName?: string
  call: boolean
  noShow?: boolean
  reasonforVisit?: string
  receptionistNote?: string
  departmentNote?: string
  held?: boolean
  emergency?: boolean
  departmentHistory?: DepartmentHistoryEntry[]
  userType?: string
  language?: string
  completed?: boolean
  completedAt?: string | null
  totalDuration?: number
  createdAt: string
  updatedAt: string
}

// Format duration in seconds to a readable format
const formatDuration = (seconds: number | undefined): string => {
  if (!seconds) return "0s"

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}

// Component to render room and staff information
const DepartmentRoomBadge = ({
  department,
  roomIdPartial,
}: {
  department: string
  roomIdPartial: string
}) => {
  const [roomInfo, setRoomInfo] = useState<{
    roomNumber: string
    staffName: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const loadRoomInfo = async () => {
      setIsLoading(true)
      setHasError(false)
      try {
        const response = await fetch("/api/hospital/department")
        if (!response.ok) {
          throw new Error("Failed to fetch departments")
        }

        const allDepartments = await response.json()
        const dept = allDepartments.find((d: Department) => d.title === department)

        if (!dept) {
          throw new Error(`Department ${department} not found`)
        }

        const room = dept.rooms.find((r: any) => r._id.toString().includes(roomIdPartial))

        if (!room) {
          throw new Error(`Room not found in ${department}`)
        }

        let staffName = "Unknown Staff"
        if (room.staff) {
          if (typeof room.staff === "object" && room.staff.firstName && room.staff.lastName) {
            staffName = `${room.staff.firstName} ${room.staff.lastName}`
          } else if (typeof room.staff === "string") {
            try {
              const staffResponse = await fetch(`/api/hospital/staff?id=${room.staff}`)
              if (staffResponse.ok) {
                const staffData = await staffResponse.json()
                if (staffData.firstName && staffData.lastName) {
                  staffName = `${staffData.firstName} ${staffData.lastName}`
                } else if (staffData.username) {
                  staffName = staffData.username
                }
              }
            } catch (staffError) {
              console.error("Error fetching staff details:", staffError)
            }
          }
        }

        setRoomInfo({
          roomNumber: room.roomNumber || "Unknown",
          staffName: staffName,
        })
      } catch (error) {
        console.error("Error loading room info:", error)
        setHasError(true)
        setRoomInfo({
          roomNumber: "Unknown",
          staffName: "Staff not found",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadRoomInfo()
  }, [department, roomIdPartial])

  if (isLoading) {
    return (
      <Badge className="ml-2 bg-purple-100 text-purple-800 border-purple-200 animate-pulse text-xs">Loading...</Badge>
    )
  }

  if (hasError) {
    return (
      <Badge className="ml-2 bg-red-100 text-red-800 border-red-200 flex items-center gap-1 text-xs">
        <User className="h-3 w-3" />
        Room: Unknown
      </Badge>
    )
  }

  return (
    <Badge className="ml-2 bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1 text-xs">
      <MapPin className="h-3 w-3" />
      {roomInfo?.roomNumber ? `R${roomInfo.roomNumber}` : "Room"}: {roomInfo?.staffName?.split(" ")[0] || "Unknown"}
    </Badge>
  )
}

// Component to display real-time duration
const RealTimeDuration = ({
  startTime,
  endTime,
  isActive = false,
}: {
  startTime: string | null | undefined
  endTime: string | null | undefined
  isActive?: boolean
}) => {
  const [duration, setDuration] = useState<number>(0)

  useEffect(() => {
    if (!startTime) {
      setDuration(0)
      return
    }

    const start = new Date(startTime).getTime()

    if (endTime) {
      const end = new Date(endTime).getTime()
      setDuration(Math.floor((end - start) / 1000))
      return
    }

    if (!isActive) {
      setDuration(0)
      return
    }

    // For active timers, update every second
    const intervalId = setInterval(() => {
      const now = new Date().getTime()
      setDuration(Math.floor((now - start) / 1000))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [startTime, endTime, isActive])

  return <span>{formatDuration(duration)}</span>
}

// Component to display ticket status
const TicketStatusBadge = ({ ticket }: { ticket: Ticket }) => {
  if (ticket.emergency && !ticket.completed && !ticket.noShow) {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse flex items-center gap-1">
        <Zap className="h-3 w-3" />
        EMERGENCY
      </Badge>
    )
  }

  if (ticket.completed) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </Badge>
    )
  }

  if (ticket.noShow) {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
        <X className="h-3 w-3" />
        No Show
      </Badge>
    )
  }

  if (ticket.held) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
        <PauseCircle className="h-3 w-3" />
        On Hold
      </Badge>
    )
  }

  // Check if ticket is being served in any department
  const isBeingServed = ticket.departmentHistory?.some(
    (history) => !history.completed && history.startedAt && !history.completedAt,
  )

  if (isBeingServed) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
        <UserCheck className="h-3 w-3" />
        Being Served
      </Badge>
    )
  }

  return (
    <Badge className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1">
      <Timer className="h-3 w-3" />
      Waiting
    </Badge>
  )
}

// Component to display current department
const CurrentDepartmentBadge = ({ ticket }: { ticket: Ticket }) => {
  // Find the current active department (not completed)
  const currentDept = ticket.departmentHistory?.find((history) => !history.completed)

  if (!currentDept) {
    return <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-xs">No Department</Badge>
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 flex items-center gap-1 text-xs">
        {currentDept.icon && <span className="text-sm">{currentDept.icon}</span>}
        <span className="hidden sm:inline">{currentDept.department}</span>
        <span className="sm:hidden">{currentDept.department.substring(0, 3)}</span>
      </Badge>
      {currentDept.roomId && (
        <DepartmentRoomBadge
          department={currentDept.department}
          roomIdPartial={(() => {
            if (!currentDept.roomId) return "unknown"
            if (typeof currentDept.roomId === "string") {
              return currentDept.roomId.substring(0, 6)
            }
            if (typeof currentDept.roomId === "object") {
              if (currentDept.roomId && "oid" in currentDept.roomId) {
                return (currentDept.roomId as any).$oid.substring(0, 6)
              }
              return JSON.stringify(currentDept.roomId).substring(0, 6)
            }
            return String(currentDept.roomId).substring(0, 6)
          })()}
        />
      )}
    </div>
  )
}

// Quick Stats Component
const QuickStats = ({ tickets }: { tickets: Ticket[] }) => {
  const stats = {
    total: tickets.length,
    waiting: tickets.filter(
      (t) => !t.completed && !t.noShow && !t.held && !t.departmentHistory?.some((h) => !h.completed && h.startedAt),
    ).length,
    serving: tickets.filter(
      (t) => !t.completed && !t.noShow && !t.held && t.departmentHistory?.some((h) => !h.completed && h.startedAt),
    ).length,
    emergency: tickets.filter((t) => t.emergency && !t.completed && !t.noShow).length,
    completed: tickets.filter((t) => t.completed).length,
    held: tickets.filter((t) => t.held).length,
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-xs text-blue-600 font-medium">Total</p>
            <p className="text-lg font-bold text-blue-700">{stats.total}</p>
          </div>
        </div>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-purple-600" />
          <div>
            <p className="text-xs text-purple-600 font-medium">Waiting</p>
            <p className="text-lg font-bold text-purple-700">{stats.waiting}</p>
          </div>
        </div>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-xs text-blue-600 font-medium">Serving</p>
            <p className="text-lg font-bold text-blue-700">{stats.serving}</p>
          </div>
        </div>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-red-600" />
          <div>
            <p className="text-xs text-red-600 font-medium">Emergency</p>
            <p className="text-lg font-bold text-red-700">{stats.emergency}</p>
          </div>
        </div>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-xs text-green-600 font-medium">Done</p>
            <p className="text-lg font-bold text-green-700">{stats.completed}</p>
          </div>
        </div>
      </Card>

      <Card className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
        <div className="flex items-center gap-2">
          <PauseCircle className="h-4 w-4 text-amber-600" />
          <div>
            <p className="text-xs text-amber-600 font-medium">Hold</p>
            <p className="text-lg font-bold text-amber-700">{stats.held}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Mobile Filters Sheet
const MobileFiltersSheet = ({
  searchQuery,
  setSearchQuery,
  filterDepartment,
  setFilterDepartment,
  filterStatus,
  setFilterStatus,
  departments,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
}: {
  searchQuery: string
  setSearchQuery: (value: string) => void
  filterDepartment: string
  setFilterDepartment: (value: string) => void
  filterStatus: string
  setFilterStatus: (value: string) => void
  departments: Department[]
  sortBy: string
  setSortBy: (value: string) => void
  sortOrder: "asc" | "desc"
  setSortOrder: (value: "asc" | "desc") => void
}) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Filters & Search</SheetTitle>
          <SheetDescription>Filter and search through tickets</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Department</label>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept.title}>
                    {dept.icon} {dept.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="serving">Being Served</SelectItem>
                <SelectItem value="held">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="noshow">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Sort By</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Created Time</SelectItem>
                <SelectItem value="ticket">Ticket Number</SelectItem>
                <SelectItem value="patient">Patient Name</SelectItem>
                <SelectItem value="department">Department</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Sort Order</label>
            <div className="flex gap-2">
              <Button
                variant={sortOrder === "asc" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOrder("asc")}
                className="flex-1"
              >
                <SortAsc className="h-4 w-4 mr-2" />
                Ascending
              </Button>
              <Button
                variant={sortOrder === "desc" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortOrder("desc")}
                className="flex-1"
              >
                <SortDesc className="h-4 w-4 mr-2" />
                Descending
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<SessionData | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDepartment, setFilterDepartment] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showTicketDetailsDialog, setShowTicketDetailsDialog] = useState(false)
  const [showNextStepDialog, setShowNextStepDialog] = useState(false)
  const [departmentNote, setDepartmentNote] = useState("")
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [sortBy, setSortBy] = useState("created")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const { toast } = useToast()
  const router = useRouter()

  const [isEditingPatient, setIsEditingPatient] = useState(false)
  const [editPatientName, setEditPatientName] = useState("")
  const [editUserType, setEditUserType] = useState("")
  const [editReasonForVisit, setEditReasonForVisit] = useState("")

  const [showServeDialog, setShowServeDialog] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState("")
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [isServingTicket, setIsServingTicket] = useState(false)

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0]

      // Fetch active tickets (not completed)
      const activeResponse = await fetch(`/api/hospital/ticket?date=${today}`)
      if (!activeResponse.ok) throw new Error("Failed to fetch active tickets")
      const activeTickets = await activeResponse.json()

      console.log("Fetched active tickets:", activeTickets.length)

      // We need to manually fetch completed tickets by modifying the URL
      // Since the API filters out completed tickets by default, we'll use a custom parameter
      const completedResponse = await fetch(`/api/hospital/ticket/completed?date=${today}`)
      let completedTickets = []

      if (completedResponse.ok) {
        completedTickets = await completedResponse.json()
        console.log("Fetched completed tickets:", completedTickets.length)
      } else {
        console.warn("Could not fetch completed tickets, API endpoint may not exist")
      }

      // Combine both sets of tickets
      const allTickets = [...activeTickets, ...completedTickets]
      console.log("Total tickets:", allTickets.length)

      // Log completed tickets for debugging
      const completed = allTickets.filter((t) => t.completed === true)
      console.log("Completed tickets in combined set:", completed.length)

      setTickets(allTickets)
      return allTickets
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      })
      return []
    }
  }, [toast])

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch("/api/hospital/department")
      if (!response.ok) throw new Error("Failed to fetch departments")
      const data = await response.json()
      setDepartments(data)
    } catch (error) {
      console.error("Error fetching departments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive",
      })
    }
  }, [toast])

  // Apply filters, search, and sorting
  useEffect(() => {
    let result = [...tickets]

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (ticket) =>
          ticket.ticketNo.toLowerCase().includes(query) ||
          ticket.patientName?.toLowerCase().includes(query) ||
          ticket.reasonforVisit?.toLowerCase().includes(query),
      )
    }

    // Apply department filter
    if (filterDepartment !== "all") {
      result = result.filter((ticket) =>
        ticket.departmentHistory?.some((history) => history.department === filterDepartment && !history.completed),
      )
    }

    // Apply status filter
    if (filterStatus !== "all") {
      switch (filterStatus) {
        case "waiting":
          result = result.filter(
            (ticket) =>
              ticket.completed !== true &&
              ticket.noShow !== true &&
              ticket.held !== true &&
              !ticket.departmentHistory?.some((history) => !history.completed && history.startedAt),
          )
          break
        case "serving":
          result = result.filter(
            (ticket) =>
              ticket.completed !== true &&
              ticket.noShow !== true &&
              ticket.held !== true &&
              ticket.departmentHistory?.some((history) => !history.completed && history.startedAt),
          )
          break
        case "held":
          result = result.filter((ticket) => ticket.held === true)
          break
        case "completed":
          result = result.filter((ticket) => ticket.completed === true)
          break
        case "noshow":
          result = result.filter((ticket) => ticket.noShow === true)
          break
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case "created":
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case "ticket":
          aValue = a.ticketNo
          bValue = b.ticketNo
          break
        case "patient":
          aValue = a.patientName || ""
          bValue = b.patientName || ""
          break
        case "department":
          aValue = a.departmentHistory?.find((h) => !h.completed)?.department || ""
          bValue = b.departmentHistory?.find((h) => !h.completed)?.department || ""
          break
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredTickets(result)
  }, [tickets, searchQuery, filterDepartment, filterStatus, sortBy, sortOrder])

  // Initial data loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchTickets(), fetchDepartments()])
      setIsLoading(false)
    }
    loadData()

    // Set up polling interval to refresh tickets every 30 seconds
    const pollingInterval = setInterval(async () => {
      console.log("Auto-refreshing tickets (30s interval)")
      await fetchTickets()
    }, 30000)

    // Clean up interval on component unmount
    return () => clearInterval(pollingInterval)
  }, [fetchTickets, fetchDepartments])

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      const response = await fetch("/api/session")
      if (response.ok) {
        const sessionData: SessionData = await response.json()
        setSession(sessionData)
      }
    }
    fetchSession()
  }, [])

  // Toggle ticket expansion
  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTickets((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }))
  }

  const handleViewTicketDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setShowTicketDetailsDialog(true)
    setDepartmentNote(ticket.departmentNote || "")

    // Initialize edit fields
    setEditPatientName(ticket.patientName || "")
    setEditUserType(ticket.userType || "")
    setEditReasonForVisit(ticket.reasonforVisit || "")
    setIsEditingPatient(false)
  }

  const handleNextStep = async (departmentId: string, roomId?: string) => {
    if (!selectedTicket) return

    try {
      const currentDepartment =
        selectedTicket.departmentHistory?.find((history) => !history.completed)?.department || "Unknown"

      // Find the current department history entry with roomId before moving to next step
      const currentDeptHistory = selectedTicket.departmentHistory?.find(
        (history) => !history.completed && history.roomId,
      )

      const response = await fetch(`/api/hospital/ticket/${selectedTicket._id}/next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId,
          roomId,
          departmentNote,
          currentDepartment,
        }),
      })

      if (!response.ok) throw new Error("Failed to assign next step")

      // If the ticket was being served in a room, clear the room's currentTicket
      if (currentDeptHistory && currentDeptHistory.roomId) {
        try {
          const roomId =
            typeof currentDeptHistory.roomId === "string"
              ? currentDeptHistory.roomId
              : currentDeptHistory.roomId &&
                  typeof currentDeptHistory.roomId === "object" &&
                  "oid" in currentDeptHistory.roomId
                ? (currentDeptHistory.roomId as any).$oid
                : String(currentDeptHistory.roomId)

          const roomResponse = await fetch(`/api/hospital/room/${roomId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentTicket: null,
              available: true,
            }),
          })

          if (!roomResponse.ok) {
            console.warn("Failed to clear room's currentTicket, but ticket was moved to next step successfully")
          }
        } catch (roomError) {
          console.error("Error clearing room's currentTicket:", roomError)
          // Don't throw here as the ticket was successfully moved
        }
      }

      toast({
        title: "Success",
        description: "Ticket forwarded to next department",
      })

      // Close dialogs
      setShowNextStepDialog(false)
      setShowTicketDetailsDialog(false)
      setSelectedTicket(null)
      setDepartmentNote("")

      // Refresh tickets
      await fetchTickets()
    } catch (error) {
      console.error("Error assigning next step:", error)
      toast({
        title: "Error",
        description: "Failed to assign next step",
        variant: "destructive",
      })
    }
  }

  const handleClearTicket = async () => {
    if (!selectedTicket) return

    try {
      const currentDepartment =
        selectedTicket.departmentHistory?.find((history) => !history.completed)?.department || "Unknown"

      // Find the current department history entry with roomId
      const currentDeptHistory = selectedTicket.departmentHistory?.find(
        (history) => !history.completed && history.roomId,
      )

      const response = await fetch(`/api/hospital/ticket/${selectedTicket._id}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentNote,
          currentDepartment,
        }),
      })

      if (!response.ok) throw new Error("Failed to clear ticket")

      // If the ticket was being served in a room, clear the room's currentTicket
      if (currentDeptHistory && currentDeptHistory.roomId) {
        try {
          const roomId =
            typeof currentDeptHistory.roomId === "string"
              ? currentDeptHistory.roomId
              : currentDeptHistory.roomId &&
                  typeof currentDeptHistory.roomId === "object" &&
                  "oid" in currentDeptHistory.roomId
                ? (currentDeptHistory.roomId as any).$oid
                : String(currentDeptHistory.roomId)

          const roomResponse = await fetch(`/api/hospital/room/${roomId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentTicket: null,
              available: true,
            }),
          })

          if (!roomResponse.ok) {
            console.warn("Failed to clear room's currentTicket, but ticket was cleared successfully")
          }
        } catch (roomError) {
          console.error("Error clearing room's currentTicket:", roomError)
          // Don't throw here as the ticket was successfully cleared
        }
      }

      toast({
        title: "Success",
        description: "Ticket cleared successfully",
      })

      // Close dialog
      setShowTicketDetailsDialog(false)
      setSelectedTicket(null)
      setDepartmentNote("")

      // Refresh tickets
      await fetchTickets()
    } catch (error) {
      console.error("Error clearing ticket:", error)
      toast({
        title: "Error",
        description: "Failed to clear ticket",
        variant: "destructive",
      })
    }
  }

  const handleHoldTicket = async () => {
    if (!selectedTicket) return

    try {
      const currentDepartment =
        selectedTicket.departmentHistory?.find((history) => !history.completed)?.department || "Unknown"

      // Find the current department history entry with roomId before putting on hold
      const currentDeptHistory = selectedTicket.departmentHistory?.find(
        (history) => !history.completed && history.roomId,
      )

      const response = await fetch(`/api/hospital/ticket/${selectedTicket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          held: true,
          departmentNote,
          currentDepartment,
        }),
      })

      if (!response.ok) throw new Error("Failed to hold ticket")

      // If the ticket was being served in a room, clear the room's currentTicket
      if (currentDeptHistory && currentDeptHistory.roomId) {
        try {
          const roomId =
            typeof currentDeptHistory.roomId === "string"
              ? currentDeptHistory.roomId
              : currentDeptHistory.roomId &&
                  typeof currentDeptHistory.roomId === "object" &&
                  "oid" in currentDeptHistory.roomId
                ? (currentDeptHistory.roomId as any).$oid
                : String(currentDeptHistory.roomId)

          const roomResponse = await fetch(`/api/hospital/room/${roomId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentTicket: null,
              available: true,
            }),
          })

          if (!roomResponse.ok) {
            console.warn("Failed to clear room's currentTicket, but ticket was put on hold successfully")
          }
        } catch (roomError) {
          console.error("Error clearing room's currentTicket:", roomError)
          // Don't throw here as the ticket was successfully put on hold
        }
      }

      toast({
        title: "Success",
        description: "Ticket placed on hold",
      })

      // Close dialog
      setShowTicketDetailsDialog(false)
      setSelectedTicket(null)
      setDepartmentNote("")

      // Refresh tickets
      await fetchTickets()
    } catch (error) {
      console.error("Error holding ticket:", error)
      toast({
        title: "Error",
        description: "Failed to hold ticket",
        variant: "destructive",
      })
    }
  }

  const handleUnholdTicket = async (ticketId: string) => {
    try {
      const ticket = tickets.find((t) => t._id === ticketId)
      if (!ticket) return

      const currentDepartment = ticket.departmentHistory?.find((history) => !history.completed)?.department || "Unknown"

      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          held: false,
          currentDepartment,
        }),
      })

      if (!response.ok) throw new Error("Failed to unhold ticket")

      toast({
        title: "Success",
        description: "Ticket returned to queue",
      })

      // Refresh tickets
      await fetchTickets()
    } catch (error) {
      console.error("Error unholding ticket:", error)
      toast({
        title: "Error",
        description: "Failed to return ticket to queue",
        variant: "destructive",
      })
    }
  }

  const handleCancelTicket = async () => {
    if (!selectedTicket) return

    try {
      // Find the current department history entry with roomId
      const currentDeptHistory = selectedTicket.departmentHistory?.find(
        (history) => !history.completed && history.roomId,
      )

      const response = await fetch(`/api/hospital/ticket/${selectedTicket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noShow: true,
          departmentNote,
        }),
      })

      if (!response.ok) throw new Error("Failed to cancel ticket")

      // If the ticket was being served in a room, clear the room's currentTicket
      if (currentDeptHistory && currentDeptHistory.roomId) {
        try {
          const roomId =
            typeof currentDeptHistory.roomId === "string"
              ? currentDeptHistory.roomId
              : currentDeptHistory.roomId &&
                  typeof currentDeptHistory.roomId === "object" &&
                  "oid" in currentDeptHistory.roomId
                ? (currentDeptHistory.roomId as any).$oid
                : String(currentDeptHistory.roomId)

          const roomResponse = await fetch(`/api/hospital/room/${roomId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentTicket: null,
              available: true,
            }),
          })

          if (!roomResponse.ok) {
            console.warn("Failed to clear room's currentTicket, but ticket was cancelled successfully")
          }
        } catch (roomError) {
          console.error("Error clearing room's currentTicket:", roomError)
          // Don't throw here as the ticket was successfully cancelled
        }
      }

      toast({
        title: "Success",
        description: "Ticket cancelled successfully",
      })

      // Close dialog
      setShowTicketDetailsDialog(false)
      setSelectedTicket(null)
      setDepartmentNote("")

      // Refresh tickets
      await fetchTickets()
    } catch (error) {
      console.error("Error cancelling ticket:", error)
      toast({
        title: "Error",
        description: "Failed to cancel ticket",
        variant: "destructive",
      })
    }
  }

  const handleSavePatientDetails = async () => {
    if (!selectedTicket) return

    try {
      const response = await fetch(`/api/hospital/ticket/${selectedTicket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: editPatientName,
          userType: editUserType,
          reasonforVisit: editReasonForVisit,
          // Add these additional fields to ensure the API processes the update
          updatePatientDetails: true,
          currentDepartment: selectedTicket.departmentHistory?.find((h) => !h.completed)?.department || "Unknown",
        }),
      })

      if (!response.ok) throw new Error("Failed to update patient details")

      toast({
        title: "Success",
        description: "Patient details updated successfully",
      })

      // Update the selected ticket with new values
      setSelectedTicket({
        ...selectedTicket,
        patientName: editPatientName,
        userType: editUserType,
        reasonforVisit: editReasonForVisit,
      })

      // Exit edit mode
      setIsEditingPatient(false)

      // Refresh tickets
      await fetchTickets()
    } catch (error) {
      console.error("Error updating patient details:", error)
      toast({
        title: "Error",
        description: "Failed to update patient details",
        variant: "destructive",
      })
    }
  }

  const handleServeTicket = async (ticket: Ticket) => {
    // Find the current department for this ticket (one that's not completed and has no roomId)
    const currentDept = ticket.departmentHistory?.find((history) => !history.completed && !history.roomId)

    if (!currentDept) {
      toast({
        title: "Error",
        description: "No department waiting for room assignment found for this ticket",
        variant: "destructive",
      })
      return
    }

    // Find the department
    const department = departments.find((d) => d.title === currentDept.department)

    if (!department) {
      toast({
        title: "Error",
        description: "Department not found",
        variant: "destructive",
      })
      return
    }

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0]

      // Fetch today's rooms for this specific department
      const response = await fetch(`/api/hospital/department/${department._id}/rooms?date=${today}`)

      if (!response.ok) {
        throw new Error("Failed to fetch today's rooms")
      }

      const data = await response.json()
      const todaysRooms = data.rooms || []

      if (todaysRooms.length === 0) {
        toast({
          title: "No Rooms Available",
          description: `No rooms created today in ${currentDept.department} department`,
          variant: "destructive",
        })
        return
      }

      setSelectedTicket(ticket)
      setAvailableRooms(todaysRooms) // Show all rooms, not just available ones
      setShowServeDialog(true)
    } catch (error) {
      console.error("Error fetching today's rooms:", error)
      toast({
        title: "Error",
        description: "Failed to fetch available rooms for today",
        variant: "destructive",
      })
    }
  }

  const handleConfirmServe = async () => {
    if (!selectedTicket || !selectedRoomId) {
      toast({
        title: "Error",
        description: "Please select a room",
        variant: "destructive",
      })
      return
    }

    setIsServingTicket(true)

    try {
      // First, assign the room to the ticket
      const response = await fetch(`/api/hospital/ticket/${selectedTicket._id}/assign-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoomId,
          department: selectedTicket.departmentHistory?.find((h) => !h.completed)?.department || "Unknown",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to assign room to ticket")
      }

      // Update the room to show it's serving this ticket
      const roomResponse = await fetch(`/api/hospital/room/${selectedRoomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentTicket: selectedTicket._id, // Set to ticket ID, not null
          available: true, // Mark room as actively serving
        }),
      })

      if (!roomResponse.ok) {
        throw new Error("Failed to update room status")
      }

      toast({
        title: "Success",
        description: `Ticket ${selectedTicket.ticketNo} is now being served`,
      })

      // Close dialog and refresh tickets
      setShowServeDialog(false)
      setSelectedTicket(null)
      setSelectedRoomId("")
      setAvailableRooms([])
      await fetchTickets()
    } catch (error: any) {
      console.error("Error serving ticket:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to serve ticket",
        variant: "destructive",
      })
    } finally {
      setIsServingTicket(false)
    }
  }

  const refreshTickets = async () => {
    setIsLoading(true)
    await fetchTickets()
    setIsLoading(false)

    toast({
      title: "Refreshed",
      description: "Ticket list has been updated",
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
          <p className="text-slate-500">Loading tickets...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You are not authorized to access this page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <ProtectedRoute requiredPermission="Tickets">
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
        <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header Section */}
          <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mb-1 bg-gradient-to-r from-[#0e4480] to-blue-600 bg-clip-text text-transparent">
                  Ticket Management
                </h1>
                <p className="text-slate-500 text-sm sm:text-base">Monitor and manage all tickets in real-time</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-[#0e4480]/10 px-3 py-2 rounded-full flex-1 sm:flex-none">
                  <Users className="h-4 w-4 text-[#0e4480]" />
                  <span className="font-medium text-[#0e4480] text-sm">{filteredTickets.length} tickets</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshTickets}
                  className="flex items-center gap-2 shrink-0"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <QuickStats tickets={tickets} />

          {/* Search and Filter Section */}
          <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search - Full width on mobile */}
              <div className="relative flex-1 lg:flex-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search by ticket number, patient name, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-slate-300 focus:ring-[#0e4480] bg-white/50"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Desktop Filters */}
              <div className="hidden lg:flex gap-4">
                <div className="relative min-w-[200px]">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="pl-10 border-slate-300 focus:ring-[#0e4480] bg-white/50">
                      <SelectValue placeholder="Filter by department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept._id} value={dept.title}>
                          {dept.icon} {dept.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative min-w-[180px]">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="pl-10 border-slate-300 focus:ring-[#0e4480] bg-white/50">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="serving">Being Served</SelectItem>
                      <SelectItem value="held">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="noshow">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mobile/Tablet Controls */}
              <div className="flex items-center gap-2 lg:hidden">
                <MobileFiltersSheet
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filterDepartment={filterDepartment}
                  setFilterDepartment={setFilterDepartment}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  departments={departments}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  sortOrder={sortOrder}
                  setSortOrder={setSortOrder}
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tickets List */}
          <Tabs defaultValue="active" className="w-full">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-200">
                <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
                  <TabsTrigger value="active" className="text-xs sm:text-sm">
                    Active
                  </TabsTrigger>
                  <TabsTrigger value="held" className="text-xs sm:text-sm">
                    On Hold
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs sm:text-sm">
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs sm:text-sm">
                    All
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-4 sm:p-6">
                <TabsContent value="active" className="space-y-3 sm:space-y-4 mt-0">
                  {filteredTickets.filter((t) => !t.completed && !t.noShow && !t.held).length > 0 ? (
                    <div
                      className={
                        viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-4"
                      }
                    >
                      {filteredTickets
                        .filter((t) => !t.completed && !t.noShow && !t.held)
                        .map((ticket) => (
                          <TicketCard
                            key={ticket._id}
                            ticket={ticket}
                            isExpanded={!!expandedTickets[ticket._id]}
                            onToggleExpand={() => toggleTicketExpansion(ticket._id)}
                            onViewDetails={() => handleViewTicketDetails(ticket)}
                            onUnhold={() => handleUnholdTicket(ticket._id)}
                            onServe={() => handleServeTicket(ticket)}
                            viewMode={viewMode}
                          />
                        ))}
                    </div>
                  ) : (
                    <Alert className="bg-blue-50 border-blue-100">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-700">
                        No active tickets found matching your filters.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="held" className="space-y-3 sm:space-y-4 mt-0">
                  {filteredTickets.filter((t) => t.held).length > 0 ? (
                    <div
                      className={
                        viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-4"
                      }
                    >
                      {filteredTickets
                        .filter((t) => t.held)
                        .map((ticket) => (
                          <TicketCard
                            key={ticket._id}
                            ticket={ticket}
                            isExpanded={!!expandedTickets[ticket._id]}
                            onToggleExpand={() => toggleTicketExpansion(ticket._id)}
                            onViewDetails={() => handleViewTicketDetails(ticket)}
                            onUnhold={() => handleUnholdTicket(ticket._id)}
                            onServe={() => handleServeTicket(ticket)}
                            viewMode={viewMode}
                          />
                        ))}
                    </div>
                  ) : (
                    <Alert className="bg-amber-50 border-amber-100">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700">
                        No tickets on hold found matching your filters.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-3 sm:space-y-4 mt-0">
                  {filteredTickets.filter((t) => t.completed === true || t.noShow === true).length > 0 ? (
                    <div
                      className={
                        viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-4"
                      }
                    >
                      {filteredTickets
                        .filter((t) => t.completed === true || t.noShow === true)
                        .map((ticket) => (
                          <TicketCard
                            key={ticket._id}
                            ticket={ticket}
                            isExpanded={!!expandedTickets[ticket._id]}
                            onToggleExpand={() => toggleTicketExpansion(ticket._id)}
                            onViewDetails={() => handleViewTicketDetails(ticket)}
                            onUnhold={() => handleUnholdTicket(ticket._id)}
                            onServe={() => handleServeTicket(ticket)}
                            viewMode={viewMode}
                          />
                        ))}
                    </div>
                  ) : (
                    <Alert className="bg-green-50 border-green-100">
                      <AlertCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        No completed tickets found matching your filters.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="all" className="space-y-3 sm:space-y-4 mt-0">
                  {filteredTickets.length > 0 ? (
                    <div
                      className={
                        viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-4"
                      }
                    >
                      {filteredTickets.map((ticket) => (
                        <TicketCard
                          key={ticket._id}
                          ticket={ticket}
                          isExpanded={!!expandedTickets[ticket._id]}
                          onToggleExpand={() => toggleTicketExpansion(ticket._id)}
                          onViewDetails={() => handleViewTicketDetails(ticket)}
                          onUnhold={() => handleUnholdTicket(ticket._id)}
                          onServe={() => handleServeTicket(ticket)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  ) : (
                    <Alert className="bg-slate-50 border-slate-100">
                      <AlertCircle className="h-4 w-4 text-slate-600" />
                      <AlertDescription className="text-slate-700">
                        No tickets found matching your filters.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>

        {/* Ticket Details Dialog */}
        <Dialog open={showTicketDetailsDialog} onOpenChange={setShowTicketDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className="bg-[#0e4480] text-white text-lg px-4 py-1.5 rounded-lg">
                        {selectedTicket.ticketNo}
                      </Badge>
                      <TicketStatusBadge ticket={selectedTicket} />
                    </div>
                    <div className="text-sm text-slate-500">
                      Created: {new Date(selectedTicket.createdAt).toLocaleString()}
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                  {/* Patient Information */}
                  <Card className="border-slate-200">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Patient Information</CardTitle>
                      {!selectedTicket.completed && !selectedTicket.noShow && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingPatient(!isEditingPatient)}
                          className="h-8 text-blue-600"
                        >
                          {isEditingPatient ? "Cancel" : "Edit"}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isEditingPatient ? (
                        // Edit mode
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Patient Name</label>
                            <Input
                              value={editPatientName}
                              onChange={(e) => setEditPatientName(e.target.value)}
                              className="border-slate-300 focus:ring-[#0e4480]"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">User Type</label>
                            <Select value={editUserType} onValueChange={setEditUserType}>
                              <SelectTrigger className="border-slate-300 focus:ring-[#0e4480]">
                                <SelectValue placeholder="Select user type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Not specified</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Insurance">Insurance</SelectItem>
                                <SelectItem value="Staff">Staff</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Reason for Visit</label>
                            <Textarea
                              value={editReasonForVisit}
                              onChange={(e) => setEditReasonForVisit(e.target.value)}
                              className="border-slate-300 focus:ring-[#0e4480]"
                              rows={3}
                            />
                          </div>
                          <Button
                            onClick={handleSavePatientDetails}
                            className="w-full bg-[#0e4480] hover:bg-blue-800 text-white"
                          >
                            Save Patient Details
                          </Button>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Patient Name</p>
                            <p className="font-medium">{selectedTicket.patientName || "Not provided"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">User Type</p>
                            <p>{selectedTicket.userType || "Not specified"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Language</p>
                            <p>{selectedTicket.language || "English"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Reason for Visit</p>
                            <p>{selectedTicket.reasonforVisit || "Not provided"}</p>
                          </div>
                          {selectedTicket.receptionistNote && (
                            <div>
                              <p className="text-sm font-medium text-slate-500">Receptionist Note</p>
                              <p className="p-2 bg-slate-50 rounded-md text-sm">{selectedTicket.receptionistNote}</p>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Emergency Status */}
                  <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        Emergency Status
                        {selectedTicket.emergency && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">🚨 EMERGENCY</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!selectedTicket.completed && !selectedTicket.noShow ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Mark as Emergency</p>
                            <p className="text-xs text-slate-500">Emergency tickets will be prioritized in the queue</p>
                          </div>
                          <Button
                            variant={selectedTicket.emergency ? "destructive" : "outline"}
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/hospital/ticket/${selectedTicket._id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    emergency: !selectedTicket.emergency,
                                    currentDepartment:
                                      selectedTicket.departmentHistory?.find((h) => !h.completed)?.department ||
                                      "Unknown",
                                  }),
                                })

                                if (!response.ok) throw new Error("Failed to update emergency status")

                                toast({
                                  title: "Success",
                                  description: `Ticket ${selectedTicket.emergency ? "removed from" : "marked as"} emergency`,
                                })

                                // Update the selected ticket
                                setSelectedTicket({
                                  ...selectedTicket,
                                  emergency: !selectedTicket.emergency,
                                })

                                // Refresh tickets
                                await fetchTickets()
                              } catch (error) {
                                console.error("Error updating emergency status:", error)
                                toast({
                                  title: "Error",
                                  description: "Failed to update emergency status",
                                  variant: "destructive",
                                })
                              }
                            }}
                            className={
                              selectedTicket.emergency
                                ? "bg-red-600 hover:bg-red-700"
                                : "border-red-300 text-red-600 hover:bg-red-50"
                            }
                          >
                            {selectedTicket.emergency ? "🚨 Remove Emergency" : "🚨 Mark Emergency"}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500">
                          {selectedTicket.emergency ? (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              🚨 This was an emergency ticket
                            </Badge>
                          ) : (
                            "This ticket was not marked as emergency"
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Current Status */}
                  <Card className="border-slate-200 lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Current Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-500">Current Department</p>
                        <CurrentDepartmentBadge ticket={selectedTicket} />
                      </div>

                      {/* Room Information */}
                      {selectedTicket.departmentHistory &&
                        selectedTicket.departmentHistory.find((h) => !h.completed && h.roomId) && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-slate-500">Current Room</p>
                            <div className="flex items-center mt-1">
                              {(() => {
                                const currentDept = selectedTicket.departmentHistory.find((h) => !h.completed)
                                if (currentDept && currentDept.roomId) {
                                  return (
                                    <DepartmentRoomBadge
                                      department={currentDept.department}
                                      roomIdPartial={(() => {
                                        if (!currentDept.roomId) return "unknown"
                                        if (typeof currentDept.roomId === "string") {
                                          return currentDept.roomId.substring(0, 6)
                                        }
                                        if (typeof currentDept.roomId === "object") {
                                          if (currentDept.roomId && "oid" in currentDept.roomId) {
                                            return (currentDept.roomId as any).$oid.substring(0, 6)
                                          }
                                          return JSON.stringify(currentDept.roomId).substring(0, 6)
                                        }
                                        return String(currentDept.roomId).substring(0, 6)
                                      })()}
                                    />
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </div>
                        )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Total Time</p>
                          <p className="font-medium">
                            {selectedTicket.completed ? (
                              formatDuration(selectedTicket.totalDuration)
                            ) : (
                              <RealTimeDuration
                                startTime={selectedTicket.createdAt}
                                endTime={selectedTicket.completed ? selectedTicket.completedAt : null}
                                isActive={!selectedTicket.completed && !selectedTicket.noShow}
                              />
                            )}
                          </p>
                        </div>

                        {/* Current department processing time */}
                        {selectedTicket.departmentHistory &&
                          selectedTicket.departmentHistory.find((h) => !h.completed) && (
                            <div>
                              <p className="text-sm font-medium text-slate-500">Current Processing Time</p>
                              <p className="font-medium">
                                <RealTimeDuration
                                  startTime={
                                    selectedTicket.departmentHistory.find((h) => !h.completed)?.startedAt || null
                                  }
                                  endTime={null}
                                  isActive={!!selectedTicket.departmentHistory.find((h) => !h.completed)?.startedAt}
                                />
                              </p>
                            </div>
                          )}

                        {/* If on hold, show hold duration */}
                        {selectedTicket.held && selectedTicket.departmentHistory && (
                          <div>
                            <p className="text-sm font-medium text-slate-500">Hold Duration</p>
                            <p className="font-medium">
                              <RealTimeDuration
                                startTime={
                                  selectedTicket.departmentHistory.find((h) => !h.completed)?.holdStartedAt || null
                                }
                                endTime={null}
                                isActive={true}
                              />
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Department History */}
                <Card className="border-slate-200 mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Department History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedTicket.departmentHistory && selectedTicket.departmentHistory.length > 0 ? (
                        selectedTicket.departmentHistory.map((history, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border ${
                              history.completed ? "bg-green-50/30 border-green-200" : "bg-blue-50/30 border-blue-200"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row justify-between mb-2 gap-2">
                              <span className="font-medium flex items-center flex-wrap gap-2">
                                {history.icon && <span className="text-lg">{history.icon}</span>}
                                <span>{history.department}</span>
                                {history.completed ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>
                                )}
                                {history.roomId && (
                                  <DepartmentRoomBadge
                                    department={history.department}
                                    roomIdPartial={(() => {
                                      if (!history.roomId) return "unknown"
                                      if (typeof history.roomId === "string") {
                                        return history.roomId.substring(0, 6)
                                      }
                                      if (typeof history.roomId === "object") {
                                        if (history.roomId && "oid" in history.roomId) {
                                          return (history.roomId as any).$oid.substring(0, 6)
                                        }
                                        return JSON.stringify(history.roomId).substring(0, 6)
                                      }
                                      return String(history.roomId).substring(0, 6)
                                    })()}
                                  />
                                )}
                              </span>
                              <span className="text-sm text-blue-600">
                                {new Date(history.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-sm">
                              <div className="bg-white p-2 rounded-md shadow-sm">
                                <p className="text-xs text-slate-500">Waiting Time</p>
                                <p className="font-medium">{formatDuration(history.waitingDuration)}</p>
                              </div>
                              <div className="bg-white p-2 rounded-md shadow-sm">
                                <p className="text-xs text-slate-500">Processing Time</p>
                                <p className="font-medium">
                                  {history.completed ? (
                                    formatDuration(history.processingDuration)
                                  ) : (
                                    <RealTimeDuration
                                      startTime={history.startedAt || null}
                                      endTime={history.completedAt || null}
                                      isActive={!history.completed && !!history.startedAt}
                                    />
                                  )}
                                </p>
                              </div>
                              <div className="bg-white p-2 rounded-md shadow-sm">
                                <p className="text-xs text-slate-500">Hold Time</p>
                                <p className="font-medium">{formatDuration(history.holdDuration)}</p>
                              </div>
                            </div>

                            {history.note && (
                              <div className="mt-3 p-3 bg-white rounded-md text-sm border border-slate-100">
                                <p className="font-medium mb-1 text-slate-700">Notes:</p>
                                <p className="text-slate-600">{history.note}</p>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 text-center py-4">No department history available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Department Note */}
                {!selectedTicket.completed && !selectedTicket.noShow && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-slate-700 block mb-2">Department Note</label>
                    <Textarea
                      placeholder="Add notes about this ticket..."
                      value={departmentNote}
                      onChange={(e) => setDepartmentNote(e.target.value)}
                      className="h-24 border-slate-300 focus:ring-[#0e4480]"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                {!selectedTicket.completed && !selectedTicket.noShow && (
                  <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCancelTicket}
                      className="border-red-400 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Cancel Ticket
                    </Button>

                    {!selectedTicket.held ? (
                      <Button
                        variant="outline"
                        onClick={handleHoldTicket}
                        className="border-amber-400 text-amber-600 hover:bg-amber-50 w-full sm:w-auto"
                      >
                        <PauseCircle className="h-4 w-4 mr-2" />
                        Hold Ticket
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleUnholdTicket(selectedTicket._id)}
                        className="border-green-400 text-green-600 hover:bg-green-50 w-full sm:w-auto"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Return to Queue
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        setShowNextStepDialog(true)
                        setShowTicketDetailsDialog(false)
                      }}
                      className="bg-[#0e4480] hover:bg-blue-800 text-white w-full sm:w-auto"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Next Step
                    </Button>

                    <Button
                      onClick={handleClearTicket}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Clear Ticket
                    </Button>
                  </DialogFooter>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Next Step Dialog */}
        <DepartmentSelectionDialog
          isOpen={showNextStepDialog}
          onClose={() => {
            setShowNextStepDialog(false)
            setShowTicketDetailsDialog(true)
          }}
          onSubmit={handleNextStep}
          departments={departments}
        />

        {/* Serve Ticket Dialog */}
        <Dialog open={showServeDialog} onOpenChange={setShowServeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Serve Ticket {selectedTicket?.ticketNo}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  This ticket is waiting in{" "}
                  {selectedTicket?.departmentHistory?.find((h) => !h.completed && !h.roomId)?.department}. Select from
                  today's rooms to start serving:
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Today's Rooms</label>
                  <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                    <SelectTrigger className="border-slate-300 focus:ring-[#0e4480]">
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((room) => (
                        <SelectItem key={room._id} value={room._id}>
                          <div className="flex items-center gap-2 w-full">
                            <span>Room {room.roomNumber}</span>
                            <span className="text-sm text-slate-500">
                              - {room.staff.firstName} {room.staff.lastName}
                            </span>
                            <Badge
                              variant={room.available ? "default" : "secondary"}
                              className={`ml-auto text-xs ${
                                room.available
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-red-100 text-red-800 border-red-200"
                              }`}
                            >
                              {room.available ? "Available" : "Occupied"}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowServeDialog(false)
                  setSelectedRoomId("")
                  setAvailableRooms([])
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmServe}
                disabled={!selectedRoomId || isServingTicket}
                className="bg-[#0e4480] hover:bg-blue-800 text-white w-full sm:w-auto"
              >
                {isServingTicket ? (
                  <>
                    <QueueSpinner size="sm" color="bg-white" dotCount={3} />
                    <span className="ml-2">Serving...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Serving
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Toaster />
      </div>
    </ProtectedRoute>
  )
}

// Enhanced Ticket Card Component
const TicketCard = ({
  ticket,
  isExpanded,
  onToggleExpand,
  onViewDetails,
  onUnhold,
  onServe,
  viewMode = "list",
}: {
  ticket: Ticket
  isExpanded: boolean
  onToggleExpand: () => void
  onViewDetails: () => void
  onUnhold: () => void
  onServe?: () => void
  viewMode?: "grid" | "list"
}) => {
  // Find current department
  const currentDept = ticket.departmentHistory?.find((history) => !history.completed)

  // Calculate total time since creation
  const creationTime = new Date(ticket.createdAt).getTime()
  const now = new Date().getTime()
  const totalTimeSeconds = Math.floor((now - creationTime) / 1000)

  // Calculate progress for visual indicator
  const maxTime = 3600 // 1 hour in seconds
  const progress = Math.min((totalTimeSeconds / maxTime) * 100, 100)

  const getStatusColor = () => {
    if (ticket.noShow) return "border-l-red-400 bg-red-50/30"
    if (ticket.completed) return "border-l-green-400 bg-green-50/30"
    if (ticket.held) return "border-l-amber-400 bg-amber-50/30"
    if (currentDept?.startedAt) return "border-l-blue-400 bg-blue-50/30"
    return "border-l-purple-400 bg-purple-50/30"
  }

  return (
    <Card
      className={`border-l-4 ${getStatusColor()} hover:shadow-lg transition-all duration-200 ${viewMode === "grid" ? "h-fit" : ""}`}
    >
      <CardContent className="p-0">
        <div className="p-3 sm:p-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-[#0e4480] text-white px-2 sm:px-3 py-1 text-sm sm:text-base font-mono">
                {ticket.ticketNo}
              </Badge>
              {ticket.emergency && !ticket.completed && !ticket.noShow && (
                <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse flex items-center gap-1 text-xs">
                  <Zap className="h-3 w-3" />
                  <span className="hidden sm:inline">EMERGENCY</span>
                  <span className="sm:hidden">EMG</span>
                </Badge>
              )}
              <TicketStatusBadge ticket={ticket} />
            </div>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs sm:text-sm">
                      <Clock className="h-3 w-3 text-slate-600" />
                      <span>
                        {ticket.completed ? formatDuration(ticket.totalDuration) : formatDuration(totalTimeSeconds)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total time since creation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onViewDetails}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {!ticket.completed &&
                    !ticket.noShow &&
                    !ticket.held &&
                    ticket.departmentHistory?.some((h) => !h.completed && !h.roomId) && (
                      <DropdownMenuItem onClick={() => onServe && onServe()}>
                        <Play className="h-4 w-4 mr-2" />
                        Serve Ticket
                      </DropdownMenuItem>
                    )}
                  {ticket.held && (
                    <DropdownMenuItem onClick={onUnhold}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Return to Queue
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onToggleExpand}>
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Expand
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <Progress value={progress} className="h-1" />
          </div>

          {/* Department Badge */}
          <div className="mt-3">
            <CurrentDepartmentBadge ticket={ticket} />
          </div>

          {/* Main Info */}
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500 font-medium">Patient</p>
                <p className="font-medium truncate">{ticket.patientName || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Created</p>
                <p className="text-xs">{new Date(ticket.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {ticket.reasonforVisit && (
              <div>
                <p className="text-xs text-slate-500 font-medium">Reason</p>
                <p className="text-sm line-clamp-2">{ticket.reasonforVisit}</p>
              </div>
            )}
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
              {/* Department History */}
              <div>
                <h4 className="font-medium text-slate-700 mb-2 text-sm">Department History</h4>
                <div className="space-y-2">
                  {ticket.departmentHistory && ticket.departmentHistory.length > 0 ? (
                    ticket.departmentHistory.map((history, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded-md border text-xs ${
                          history.completed ? "bg-green-50/50 border-green-200" : "bg-blue-50/50 border-blue-200"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium flex items-center gap-1">
                            {history.icon && <span className="text-sm">{history.icon}</span>}
                            <span className="truncate">{history.department}</span>
                            {history.completed ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Done</Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Active</Badge>
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-xs">
                          <div>
                            <p className="text-slate-500">Wait</p>
                            <p className="font-medium">{formatDuration(history.waitingDuration)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Process</p>
                            <p className="font-medium">
                              {history.completed ? (
                                formatDuration(history.processingDuration)
                              ) : (
                                <RealTimeDuration
                                  startTime={history.startedAt || null}
                                  endTime={history.completedAt || null}
                                  isActive={!history.completed && !!history.startedAt}
                                />
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Hold</p>
                            <p className="font-medium">{formatDuration(history.holdDuration)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-xs">No department history available</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {(ticket.receptionistNote || ticket.departmentNote) && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-2 text-sm">Notes</h4>
                  <div className="space-y-2">
                    {ticket.receptionistNote && (
                      <div className="p-2 bg-slate-50 rounded-md">
                        <p className="text-xs text-slate-500 font-medium">Receptionist</p>
                        <p className="text-xs">{ticket.receptionistNote}</p>
                      </div>
                    )}
                    {ticket.departmentNote && (
                      <div className="p-2 bg-slate-50 rounded-md">
                        <p className="text-xs text-slate-500 font-medium">Department</p>
                        <p className="text-xs">{ticket.departmentNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewDetails}
                  className="text-[#0e4480] border-[#0e4480] text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default TicketsPage
