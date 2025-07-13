"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Users,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  User,
  Search,
  Filter,
  RefreshCw,
  X,
  ArrowRight,
  MapPin,
  Timer,
  UserCheck,
  Zap,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  DollarSign,
  Route,
  DoorOpen,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QueueSpinner } from "@/components/queue-spinner"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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
  createdAt: string
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
  actuallyStarted?: boolean
  cashCleared?: boolean | null
}

interface DepartmentQueueEntry {
  departmentId: string
  departmentName: string
  roomId?: string
  processed: boolean
  order: number
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
  departmentQueue?: DepartmentQueueEntry[]
  currentQueueIndex?: number
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
  // Check for pending payment (cash tickets that haven't been cleared)
  if (ticket.userType === "Cash" && !ticket.completed && !ticket.noShow) {
    const currentDept = ticket.departmentHistory?.find(
      (history) => !history.completed && history.department !== "Reception",
    )

    if (currentDept && (currentDept.cashCleared === null || currentDept.cashCleared === undefined)) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          Pending Payment
        </Badge>
      )
    }
  }

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

  // IMPROVED LOGIC: Check if ticket is actually being served
  // A ticket is being served if it has roomId, startedAt, and actuallyStarted is not false
  const isBeingServed = ticket.departmentHistory?.some(
    (history) => !history.completed && history.roomId && history.startedAt && history.actuallyStarted !== false,
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

// Component to display department queue
const DepartmentQueueBadge = ({ ticket }: { ticket: Ticket }) => {
  if (!ticket.departmentQueue || ticket.departmentQueue.length === 0) {
    return null
  }

  const currentIndex = ticket.currentQueueIndex || 0
  const remainingDepartments = ticket.departmentQueue.slice(currentIndex)

  if (remainingDepartments.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Badge className="bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1 text-xs">
        <Route className="h-3 w-3" />
        Queue: {remainingDepartments.length} remaining
      </Badge>
      <div className="flex items-center gap-1">
        {remainingDepartments.slice(0, 3).map((dept, index) => (
          <Badge
            key={dept.departmentId}
            className={`text-xs ${
              index === 0 ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            {dept.departmentName}
            {index === 0 && " (Current)"}
          </Badge>
        ))}
        {remainingDepartments.length > 3 && (
          <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
            +{remainingDepartments.length - 3} more
          </Badge>
        )}
      </div>
    </div>
  )
}

// Quick Stats Component
const QuickStats = ({ tickets }: { tickets: Ticket[] }) => {
  const stats = {
    total: tickets.length,
    waiting: tickets.filter(
      (t) =>
        !t.completed &&
        !t.noShow &&
        !t.held &&
        !t.departmentHistory?.some((h) => !h.completed && h.roomId && h.startedAt && h.actuallyStarted !== false),
    ).length,
    serving: tickets.filter(
      (t) =>
        !t.completed &&
        !t.noShow &&
        !t.held &&
        t.departmentHistory?.some((h) => !h.completed && h.roomId && h.startedAt && h.actuallyStarted !== false),
    ).length,
    emergency: tickets.filter((t) => t.emergency && !t.completed && !t.noShow).length,
    completed: tickets.filter((t) => t.completed).length,
    held: tickets.filter((t) => t.held).length,
    queued: tickets.filter((t) => t.departmentQueue && t.departmentQueue.length > 0 && !t.completed).length,
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
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

      <Card className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-orange-600" />
          <div>
            <p className="text-xs text-orange-600 font-medium">Queued</p>
            <p className="text-lg font-bold text-orange-700">{stats.queued}</p>
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
  activeTab,
  setActiveTab,
  departments,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  filterStatus,
  setFilterStatus,
  selectedDepartment,
  selectedRoom,
  setSelectedRoom,
  getCurrentDepartmentRooms,
}: {
  searchQuery: string
  setSearchQuery: (value: string) => void
  filterDepartment: string
  setFilterDepartment: (value: string) => void
  activeTab: string
  setActiveTab: (value: string) => void
  departments: Department[]
  sortBy: string
  setSortBy: (value: string) => void
  sortOrder: "asc" | "desc"
  setSortOrder: (value: "asc" | "desc") => void
  filterStatus: string
  setFilterStatus: (value: string) => void
  selectedDepartment: string
  selectedRoom: string
  setSelectedRoom: (value: string) => void
  getCurrentDepartmentRooms: () => Room[]
}) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden bg-transparent">
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

          {/* Room Filter in Mobile Sheet */}
          <div>
            <label className="text-sm font-medium mb-2 block">Room</label>
            <Select value={selectedRoom} onValueChange={setSelectedRoom} disabled={filterDepartment === "all"}>
              <SelectTrigger>
                <SelectValue placeholder="All Rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                {getCurrentDepartmentRooms().map((room) => (
                  <SelectItem key={room._id} value={room._id}>
                    <div className="flex items-center justify-between w-full">
                      <span>Room {room.roomNumber}</span>
                      <span className="text-sm text-slate-500 ml-2">
                        {room.staff.firstName} {room.staff.lastName}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {getCurrentDepartmentRooms().length === 0 && filterDepartment !== "all" && (
                  <SelectItem value="no-rooms" disabled>
                    No rooms created today
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status Category</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={activeTab === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("active")}
                className="text-xs"
              >
                Active
              </Button>
              <Button
                variant={activeTab === "held" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("held")}
                className="text-xs"
              >
                On Hold
              </Button>
              <Button
                variant={activeTab === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("completed")}
                className="text-xs"
              >
                Completed
              </Button>
              <Button
                variant={activeTab === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("all")}
                className="text-xs"
              >
                All
              </Button>
            </div>
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

          <div>
            <label className="text-sm font-medium mb-2 block">Status Filter</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
                className="text-xs"
              >
                All
              </Button>
              <Button
                variant={filterStatus === "waiting" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("waiting")}
                className="text-xs"
              >
                Waiting
              </Button>
              <Button
                variant={filterStatus === "serving" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("serving")}
                className="text-xs"
              >
                Serving
              </Button>
              <Button
                variant={filterStatus === "held" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("held")}
                className="text-xs"
              >
                On Hold
              </Button>
              <Button
                variant={filterStatus === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("completed")}
                className="text-xs"
              >
                Completed
              </Button>
              <Button
                variant={filterStatus === "noshow" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("noshow")}
                className="text-xs"
              >
                No Show
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
  const [activeTab, setActiveTab] = useState<string>("active")
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

  // Add filterStatus state variable (around line 600)
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // Date state for filtering rooms
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])

  // State for room filtering
  const [todaysRooms, setTodaysRooms] = useState<Record<string, Room[]>>({})
  const [selectedRoom, setSelectedRoom] = useState<string>("all")

  // Helper function to check if ticket is at the last department in queue
  const isAtLastDepartmentInQueue = (ticket: Ticket): boolean => {
    if (!ticket.departmentQueue || ticket.departmentQueue.length === 0) {
      return false
    }

    const currentIndex = ticket.currentQueueIndex || 0
    return currentIndex >= ticket.departmentQueue.length - 1
  }

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

  // Fetch all rooms for the selected date
  const fetchAllTodaysRooms = useCallback(
    async (date: string) => {
      const roomsData: Record<string, Room[]> = {}

      for (const department of departments) {
        try {
          const response = await fetch(`/api/hospital/department/${department._id}/rooms?date=${date}`)
          if (!response.ok) {
            console.warn(`Failed to fetch rooms for department ${department.title}`)
            roomsData[department._id] = []
            continue
          }

          const data = await response.json()
          // Ensure we only get rooms created on the selected date
          const todaysRooms = (data.rooms || []).filter((room: Room) => {
            if (!room.createdAt) return false
            const roomDate = new Date(room.createdAt).toISOString().split("T")[0]
            return roomDate === date
          })

          roomsData[department._id] = todaysRooms
          console.log(`Fetched ${todaysRooms.length} rooms for ${department.title} on ${date}`)
        } catch (error) {
          console.error(`Error fetching rooms for department ${department.title}:`, error)
          roomsData[department._id] = []
        }
      }

      setTodaysRooms(roomsData)
    },
    [departments],
  )

  // Get current department rooms for room filter
  const getCurrentDepartmentRooms = () => {
    if (filterDepartment === "all") return []
    const rooms = todaysRooms[filterDepartment] || []
    console.log(`Rooms for ${filterDepartment} on ${selectedDate}:`, rooms.length)
    return rooms
  }

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

    // Apply room filter
    if (selectedRoom !== "all") {
      result = result.filter((ticket) =>
        ticket.departmentHistory?.some((history) => history.roomId === selectedRoom && !history.completed),
      )
    }

    // Apply tab filter
    switch (activeTab) {
      case "active":
        result = result.filter((ticket) => !ticket.completed && !ticket.noShow && !ticket.held)
        break
      case "held":
        result = result.filter((ticket) => ticket.held === true)
        break
      case "completed":
        result = result.filter((ticket) => ticket.completed === true || ticket.noShow === true)
        break
      case "all":
        // Show all tickets
        break
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
              !ticket.departmentHistory?.some(
                (history) =>
                  !history.completed && history.roomId && history.startedAt && history.actuallyStarted !== false,
              ),
          )
          break
        case "serving":
          result = result.filter(
            (ticket) =>
              ticket.completed !== true &&
              ticket.noShow !== true &&
              ticket.held !== true &&
              ticket.departmentHistory?.some(
                (history) =>
                  !history.completed && history.roomId && history.startedAt && history.actuallyStarted !== false,
              ),
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
  }, [tickets, searchQuery, filterDepartment, activeTab, filterStatus, sortBy, sortOrder, selectedRoom])

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

  // Load todays rooms on department change
  useEffect(() => {
    fetchAllTodaysRooms(selectedDate)
  }, [fetchAllTodaysRooms, selectedDate])

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

  const handleNextStep = async (departments?: Array<{ departmentId: string; roomId?: string }>) => {
    if (!selectedTicket) return

    try {
      const currentDepartment =
        selectedTicket.departmentHistory?.find((history) => !history.completed)?.department || "Unknown"

      // Find the current department history entry with roomId before moving to next step
      const currentDeptHistory = selectedTicket.departmentHistory?.find(
        (history) => !history.completed && history.roomId,
      )

      // Check if ticket has a department queue and we should auto-progress
      if (
        selectedTicket.departmentQueue &&
        selectedTicket.departmentQueue.length > 0 &&
        !isAtLastDepartmentInQueue(selectedTicket)
      ) {
        // Use the queue progression endpoint
        const response = await fetch(`/api/hospital/ticket/${selectedTicket._id}/next-step`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentDepartment,
            departmentNote,
          }),
        })

        if (!response.ok) throw new Error("Failed to progress in queue")

        const responseData = await response.json()

        if (responseData.message === "Department queue completed") {
          toast({
            title: "Queue Complete",
            description: "All departments in the queue have been processed",
          })
        } else {
          toast({
            title: "Success",
            description: "Ticket moved to next department in queue",
          })
        }
      } else {
        // Regular next step with new department selection - only if departments are provided
        if (!departments) {
          // If we're at the last department in queue or no queue exists, open dialog
          setShowNextStepDialog(true)
          setShowTicketDetailsDialog(false)
          return
        }

        const response = await fetch(`/api/hospital/ticket/${selectedTicket._id}/next-step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            departments: departments,
            departmentNote,
            currentDepartment,
          }),
        })

        if (!response.ok) throw new Error("Failed to assign next step")

        toast({
          title: "Success",
          description:
            departments.length > 1
              ? `Ticket queued for ${departments.length} departments`
              : "Ticket forwarded to next department",
        })
      }

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
                  className="flex items-center gap-2 shrink-0 bg-transparent"
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

                {/* Room Filter */}
                <Select value={selectedRoom} onValueChange={setSelectedRoom} disabled={filterDepartment === "all"}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-slate-500" />
                      <SelectValue placeholder="All Rooms" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    {getCurrentDepartmentRooms().map((room) => (
                      <SelectItem key={room._id} value={room._id}>
                        <div className="flex items-center justify-between w-full">
                          <span>Room {room.roomNumber}</span>
                          <span className="text-sm text-slate-500 ml-2">
                            {room.staff.firstName} {room.staff.lastName}
                          </span>
                          <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-800">
                            Created: {new Date(room.createdAt).toLocaleDateString()}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                    {getCurrentDepartmentRooms().length === 0 && filterDepartment !== "all" && (
                      <SelectItem value="no-rooms" disabled>
                        No rooms created on {new Date(selectedDate).toLocaleDateString()}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {/* Status Category Tabs - Now in filter section */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 min-w-[320px]">
                  <Button
                    variant={activeTab === "active" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("active")}
                    className="text-xs px-3"
                  >
                    Active
                  </Button>
                  <Button
                    variant={activeTab === "held" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("held")}
                    className="text-xs px-3"
                  >
                    On Hold
                  </Button>
                  <Button
                    variant={activeTab === "completed" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("completed")}
                    className="text-xs px-3"
                  >
                    Completed
                  </Button>
                  <Button
                    variant={activeTab === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("all")}
                    className="text-xs px-3"
                  >
                    All
                  </Button>
                </div>
              </div>

              {/* Mobile/Tablet Controls */}
              <div className="flex items-center gap-2 lg:hidden">
                <MobileFiltersSheet
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filterDepartment={filterDepartment}
                  setFilterDepartment={setFilterDepartment}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  departments={departments}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  sortOrder={sortOrder}
                  setSortOrder={setSortOrder}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  selectedDepartment={filterDepartment}
                  selectedRoom={selectedRoom}
                  setSelectedRoom={setSelectedRoom}
                  getCurrentDepartmentRooms={getCurrentDepartmentRooms}
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200">
              {/* Status Filter Navbar - Now vertical like tabs */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Tickets</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("all")}
                  className="text-xs px-3"
                >
                  All Statuses
                </Button>
                <Button
                  variant={filterStatus === "waiting" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("waiting")}
                  className="text-xs px-3"
                >
                  <Timer className="h-3 w-3 mr-1" />
                  Waiting
                </Button>
                <Button
                  variant={filterStatus === "serving" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("serving")}
                  className="text-xs px-3"
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  Being Served
                </Button>
                <Button
                  variant={filterStatus === "held" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("held")}
                  className="text-xs px-3"
                >
                  <PauseCircle className="h-3 w-3 mr-1" />
                  On Hold
                </Button>
                <Button
                  variant={filterStatus === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("completed")}
                  className="text-xs px-3"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Button>
                <Button
                  variant={filterStatus === "noshow" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("noshow")}
                  className="text-xs px-3"
                >
                  <X className="h-3 w-3 mr-1" />
                  No Show
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {filteredTickets.length > 0 ? (
                <div
                  className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-4"}
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
            </div>
          </div>
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

                      {/* Department Queue Display */}
                      {selectedTicket.departmentQueue && selectedTicket.departmentQueue.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-slate-500">Department Queue</p>
                          <div className="flex items-center mt-1">
                            <DepartmentQueueBadge ticket={selectedTicket} />
                          </div>
                        </div>
                      )}

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

                {/* Department Queue Details */}
                {selectedTicket.departmentQueue && selectedTicket.departmentQueue.length > 0 && (
                  <Card className="border-slate-200 mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Route className="h-5 w-5" />
                        Department Queue
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedTicket.departmentQueue.map((queueItem, index) => (
                          <div
                            key={queueItem.departmentId}
                            className={`p-3 rounded-lg border flex items-center justify-between ${
                              queueItem.processed
                                ? "bg-green-50/30 border-green-200"
                                : index === (selectedTicket.currentQueueIndex || 0)
                                  ? "bg-blue-50/30 border-blue-200"
                                  : "bg-gray-50/30 border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Badge
                                className={`${
                                  queueItem.processed
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : index === (selectedTicket.currentQueueIndex || 0)
                                      ? "bg-blue-100 text-blue-800 border-blue-200"
                                      : "bg-gray-100 text-gray-600 border-gray-200"
                                }`}
                              >
                                {index + 1}
                              </Badge>
                              <span className="font-medium">{queueItem.departmentName}</span>
                              {queueItem.processed && (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                              {!queueItem.processed && index === (selectedTicket.currentQueueIndex || 0) && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  <Timer className="h-3 w-3 mr-1" />
                                  Current
                                </Badge>
                              )}
                              {!queueItem.processed && index > (selectedTicket.currentQueueIndex || 0) && (
                                <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                                  <Timer className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </div>
                            {selectedTicket.departmentQueue && index < selectedTicket.departmentQueue.length - 1 && (
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                      className="border-red-400 text-red-600 hover:bg-red-50 w-full sm:w-auto bg-transparent"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Cancel Ticket
                    </Button>

                    {!selectedTicket.held ? (
                      <Button
                        variant="outline"
                        onClick={handleHoldTicket}
                        className="border-amber-400 text-amber-600 hover:bg-amber-50 w-full sm:w-auto bg-transparent"
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
                      onClick={() => handleNextStep()}
                      className="bg-[#0e4480] hover:bg-blue-800 text-white w-full sm:w-auto"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      {selectedTicket.departmentQueue && selectedTicket.departmentQueue.length > 0
                        ? isAtLastDepartmentInQueue(selectedTicket)
                          ? "Clear"
                          : "Clear"
                        : "Clear"}
                    </Button>

                    <Button
                      onClick={handleClearTicket}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      End Journey
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
          currentDepartment={selectedTicket?.departmentHistory?.find((h) => !h.completed)?.department}
          currentDepartmentId={
            departments.find(
              (d) => d.title === selectedTicket?.departmentHistory?.find((h) => !h.completed)?.department,
            )?._id
          }
          currentRoomId={selectedTicket?.departmentHistory?.find((h) => !h.completed)?.roomId as string}
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
                {isServingTicket ? <>Serving...</> : <>Serve Ticket</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}

const TicketCard: React.FC<{
  ticket: Ticket
  isExpanded: boolean
  onToggleExpand: () => void
  onViewDetails: () => void
  onUnhold: () => void
  onServe: () => void
  viewMode: "grid" | "list"
}> = ({ ticket, isExpanded, onToggleExpand, onViewDetails, onUnhold, onServe, viewMode }) => {
  const currentDept = ticket.departmentHistory?.find((history) => !history.completed)

  // Check if ticket is being served (has room and actually started)
  const isBeingServed = ticket.departmentHistory?.some(
    (history) => !history.completed && history.roomId && history.startedAt && history.actuallyStarted !== false,
  )

  // Check if ticket can be served (waiting in department but no room assigned)
  const canBeServed = currentDept && !currentDept.roomId && !ticket.held && !ticket.completed && !ticket.noShow

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md border-l-4 ${
        ticket.emergency
          ? "border-l-red-500 bg-red-50/30"
          : ticket.held
            ? "border-l-amber-500 bg-amber-50/30"
            : ticket.completed
              ? "border-l-green-500 bg-green-50/30"
              : ticket.noShow
                ? "border-l-red-500 bg-red-50/30"
                : isBeingServed
                  ? "border-l-blue-500 bg-blue-50/30"
                  : "border-l-purple-500 bg-purple-50/30"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <Badge className="bg-[#0e4480] text-white px-3 py-1 text-base font-mono">{ticket.ticketNo}</Badge>
              <TicketStatusBadge ticket={ticket} />
              {ticket.emergency && (
                <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  EMERGENCY
                </Badge>
              )}
            </div>

            {/* Patient Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-slate-500 font-medium">Patient Name</p>
                <p className="font-medium">{ticket.patientName || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">User Type</p>
                <p className="text-sm">{ticket.userType || "Not specified"}</p>
              </div>
            </div>

            {/* Department Info */}
            <div className="mb-3">
              <p className="text-xs text-slate-500 font-medium mb-1">Current Department</p>
              <CurrentDepartmentBadge ticket={ticket} />
            </div>

            {/* Department Queue Info */}
            {ticket.departmentQueue && ticket.departmentQueue.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Department Queue</p>
                <DepartmentQueueBadge ticket={ticket} />
              </div>
            )}

            {/* Expandable Content */}
            {isExpanded && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Reason for Visit</p>
                  <p className="text-sm">{ticket.reasonforVisit || "Not provided"}</p>
                </div>

                {ticket.receptionistNote && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Receptionist Note</p>
                    <p className="text-sm p-2 bg-slate-50 rounded-md">{ticket.receptionistNote}</p>
                  </div>
                )}

                {/* Time Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Total Time</p>
                    <p className="font-medium">
                      {ticket.completed ? (
                        formatDuration(ticket.totalDuration)
                      ) : (
                        <RealTimeDuration
                          startTime={ticket.createdAt}
                          endTime={ticket.completed ? ticket.completedAt : null}
                          isActive={!ticket.completed && !ticket.noShow}
                        />
                      )}
                    </p>
                  </div>

                  {/* Current department processing time */}
                  {currentDept && currentDept.startedAt && (
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Processing Time</p>
                      <p className="font-medium">
                        <RealTimeDuration
                          startTime={currentDept.startedAt}
                          endTime={currentDept.completedAt}
                          isActive={!currentDept.completed}
                        />
                      </p>
                    </div>
                  )}
                </div>

                {/* Department History Summary */}
                {ticket.departmentHistory && ticket.departmentHistory.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-2">Department Journey</p>
                    <div className="flex flex-wrap gap-1">
                      {ticket.departmentHistory.map((history, index) => (
                        <Badge
                          key={index}
                          className={`text-xs ${
                            history.completed
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-blue-100 text-blue-800 border-blue-200"
                          }`}
                        >
                          {history.icon} {history.department}
                          {history.completed && <CheckCircle2 className="h-3 w-3 ml-1" />}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Department Queue Summary */}
                {ticket.departmentQueue && ticket.departmentQueue.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-2">Remaining Queue</p>
                    <div className="flex flex-wrap gap-1">
                      {ticket.departmentQueue
                        .slice(ticket.currentQueueIndex || 0)
                        .slice(0, 3)
                        .map((dept, index) => (
                          <Badge
                            key={dept.departmentId}
                            className={`text-xs ${
                              index === 0
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {dept.departmentName}
                            {index === 0 && " (Next)"}
                          </Badge>
                        ))}
                      {ticket.departmentQueue.length - (ticket.currentQueueIndex || 0) > 3 && (
                        <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
                          +{ticket.departmentQueue.length - (ticket.currentQueueIndex || 0) - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 min-w-[120px]">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleExpand}
              className="flex items-center gap-2 bg-transparent"
            >
              {isExpanded ? (
                <>
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  <span className="hidden sm:inline">Expand</span>
                </>
              )}
            </Button>

            <Button
              onClick={onViewDetails}
              size="sm"
              className="bg-[#0e4480] hover:bg-blue-800 text-white flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
            </Button>

            {/* Conditional Action Buttons */}
            {ticket.held && !ticket.completed && (
              <Button
                onClick={onUnhold}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Unhold</span>
              </Button>
            )}

            {canBeServed && (
              <Button
                onClick={onServe}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Serve</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TicketsPage
