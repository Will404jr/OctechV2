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
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QueueSpinner } from "@/components/queue-spinner"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  emergency?: boolean // Add this line
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
    return `${hours}h ${minutes}m ${remainingSeconds}s`
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
    return <Badge className="ml-2 bg-purple-100 text-purple-800 border-purple-200 animate-pulse">Loading...</Badge>
  }

  if (hasError) {
    return (
      <Badge className="ml-2 bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
        <User className="h-3 w-3" />
        Room: Unknown Staff
      </Badge>
    )
  }

  return (
    <Badge className="ml-2 bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1">
      <User className="h-3 w-3" />
      {roomInfo?.roomNumber ? `Room ${roomInfo.roomNumber}` : "Room"}: {roomInfo?.staffName || "Unknown"}
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
    return <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse">🚨 EMERGENCY</Badge>
  }

  if (ticket.completed) {
    return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>
  }

  if (ticket.noShow) {
    return <Badge className="bg-red-100 text-red-800 border-red-200">No Show</Badge>
  }

  if (ticket.held) {
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200">On Hold</Badge>
  }

  // Check if ticket is being served in any department
  const isBeingServed = ticket.departmentHistory?.some(
    (history) => !history.completed && history.startedAt && !history.completedAt,
  )

  if (isBeingServed) {
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Being Served</Badge>
  }

  return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Waiting</Badge>
}

// Component to display current department
const CurrentDepartmentBadge = ({ ticket }: { ticket: Ticket }) => {
  // Find the current active department (not completed)
  const currentDept = ticket.departmentHistory?.find((history) => !history.completed)

  if (!currentDept) {
    return <Badge className="bg-slate-100 text-slate-800 border-slate-200">No Department</Badge>
  }

  return (
    <div className="flex items-center gap-1">
      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 flex items-center gap-1">
        {currentDept.icon && <span className="mr-1">{currentDept.icon}</span>}
        {currentDept.department}
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
  const { toast } = useToast()
  const router = useRouter()

  const [isEditingPatient, setIsEditingPatient] = useState(false)
  const [editPatientName, setEditPatientName] = useState("")
  const [editUserType, setEditUserType] = useState("")
  const [editReasonForVisit, setEditReasonForVisit] = useState("")

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

  // Apply filters and search
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

    setFilteredTickets(result)
  }, [tickets, searchQuery, filterDepartment, filterStatus])

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

      const response = await fetch(`/api/hospital/ticket/${selectedTicket._id}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentNote,
          currentDepartment,
        }),
      })

      if (!response.ok) throw new Error("Failed to clear ticket")

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
      const response = await fetch(`/api/hospital/ticket/${selectedTicket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noShow: true,
          departmentNote,
        }),
      })

      if (!response.ok) throw new Error("Failed to cancel ticket")

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
      <div className="bg-gradient-to-b from-white to-blue-50 min-h-screen">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-blue-100">
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-1 text-[#0e4480]">Ticket Management Dashboard</h1>
              <p className="text-slate-500">Monitor and manage all tickets in the system</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#0e4480]/10 px-4 py-2 rounded-full">
                <Users className="h-5 w-5 text-[#0e4480]" />
                <span className="font-medium text-[#0e4480]">{filteredTickets.length} tickets</span>
              </div>
              <Button variant="outline" size="sm" onClick={refreshTickets} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search by ticket number, patient name, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-300 focus:ring-[#0e4480]"
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

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="pl-10 border-slate-300 focus:ring-[#0e4480]">
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

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="pl-10 border-slate-300 focus:ring-[#0e4480]">
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

          {/* Tickets List */}
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active Tickets</TabsTrigger>
              <TabsTrigger value="held">On Hold</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="all">All Tickets</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {filteredTickets.filter((t) => !t.completed && !t.noShow && !t.held).length > 0 ? (
                filteredTickets
                  .filter((t) => !t.completed && !t.noShow && !t.held)
                  .map((ticket) => (
                    <TicketCard
                      key={ticket._id}
                      ticket={ticket}
                      isExpanded={!!expandedTickets[ticket._id]}
                      onToggleExpand={() => toggleTicketExpansion(ticket._id)}
                      onViewDetails={() => handleViewTicketDetails(ticket)}
                      onUnhold={() => handleUnholdTicket(ticket._id)}
                    />
                  ))
              ) : (
                <Alert className="bg-blue-50 border-blue-100">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    No active tickets found matching your filters.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="held" className="space-y-4">
              {filteredTickets.filter((t) => t.held).length > 0 ? (
                filteredTickets
                  .filter((t) => t.held)
                  .map((ticket) => (
                    <TicketCard
                      key={ticket._id}
                      ticket={ticket}
                      isExpanded={!!expandedTickets[ticket._id]}
                      onToggleExpand={() => toggleTicketExpansion(ticket._id)}
                      onViewDetails={() => handleViewTicketDetails(ticket)}
                      onUnhold={() => handleUnholdTicket(ticket._id)}
                    />
                  ))
              ) : (
                <Alert className="bg-amber-50 border-amber-100">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    No tickets on hold found matching your filters.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {filteredTickets.filter((t) => t.completed === true || t.noShow === true).length > 0 ? (
                filteredTickets
                  .filter((t) => t.completed === true || t.noShow === true)
                  .map((ticket) => (
                    <TicketCard
                      key={ticket._id}
                      ticket={ticket}
                      isExpanded={!!expandedTickets[ticket._id]}
                      onToggleExpand={() => toggleTicketExpansion(ticket._id)}
                      onViewDetails={() => handleViewTicketDetails(ticket)}
                      onUnhold={() => handleUnholdTicket(ticket._id)}
                    />
                  ))
              ) : (
                <Alert className="bg-green-50 border-green-100">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    No completed tickets found matching your filters.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket._id}
                    ticket={ticket}
                    isExpanded={!!expandedTickets[ticket._id]}
                    onToggleExpand={() => toggleTicketExpansion(ticket._id)}
                    onViewDetails={() => handleViewTicketDetails(ticket)}
                    onUnhold={() => handleUnholdTicket(ticket._id)}
                  />
                ))
              ) : (
                <Alert className="bg-slate-50 border-slate-100">
                  <AlertCircle className="h-4 w-4 text-slate-600" />
                  <AlertDescription className="text-slate-700">
                    No tickets found matching your filters.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Ticket Details Dialog */}
        <Dialog open={showTicketDetailsDialog} onOpenChange={setShowTicketDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
                        <div className="flex items-center justify-between">
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
                  <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Current Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
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
                            <div className="flex justify-between mb-2">
                              <span className="font-medium flex items-center">
                                {history.icon && <span className="mr-2 text-lg">{history.icon}</span>}
                                {history.department}
                                {history.completed ? (
                                  <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">Completed</Badge>
                                ) : (
                                  <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">Active</Badge>
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

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm">
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
                  <DialogFooter className="mt-6 flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCancelTicket}
                      className="border-red-400 text-red-600 hover:bg-red-50"
                    >
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Cancel Ticket
                    </Button>

                    {!selectedTicket.held ? (
                      <Button
                        variant="outline"
                        onClick={handleHoldTicket}
                        className="border-amber-400 text-amber-600 hover:bg-amber-50"
                      >
                        <PauseCircle className="h-5 w-5 mr-2" />
                        Hold Ticket
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleUnholdTicket(selectedTicket._id)}
                        className="border-green-400 text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Return to Queue
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        setShowNextStepDialog(true)
                        setShowTicketDetailsDialog(false)
                      }}
                      className="bg-[#0e4480] hover:bg-blue-800 text-white"
                    >
                      <Users className="h-5 w-5 mr-2" />
                      Next Step
                    </Button>

                    <Button onClick={handleClearTicket} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
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

        <Toaster />
      </div>
    </ProtectedRoute>
  )
}

// Ticket Card Component
const TicketCard = ({
  ticket,
  isExpanded,
  onToggleExpand,
  onViewDetails,
  onUnhold,
}: {
  ticket: Ticket
  isExpanded: boolean
  onToggleExpand: () => void
  onViewDetails: () => void
  onUnhold: () => void
}) => {
  // Find current department
  const currentDept = ticket.departmentHistory?.find((history) => !history.completed)

  // Calculate time in current department
  const currentDeptStartTime = currentDept?.startedAt ? new Date(currentDept.startedAt).getTime() : null

  // Calculate total time since creation
  const creationTime = new Date(ticket.createdAt).getTime()
  const now = new Date().getTime()
  const totalTimeSeconds = Math.floor((now - creationTime) / 1000)

  return (
    <Card
      className={`border-l-4 ${
        ticket.noShow
          ? "border-l-red-400"
          : ticket.completed
            ? "border-l-green-400"
            : ticket.held
              ? "border-l-amber-400"
              : currentDept?.startedAt
                ? "border-l-blue-400"
                : "border-l-purple-400"
      }`}
    >
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="flex items-center gap-3 mb-2 md:mb-0 flex-wrap">
              <Badge className="bg-[#0e4480] text-white px-3 py-1 text-base">{ticket.ticketNo}</Badge>
              {ticket.emergency && !ticket.completed && !ticket.noShow && (
                <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse">🚨 EMERGENCY</Badge>
              )}
              <TicketStatusBadge ticket={ticket} />
              <CurrentDepartmentBadge ticket={ticket} />
            </div>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm">
                      <Clock className="h-3.5 w-3.5 text-slate-600" />
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
                  <DropdownMenuItem onClick={onViewDetails}>View Details</DropdownMenuItem>
                  {ticket.held && <DropdownMenuItem onClick={onUnhold}>Return to Queue</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" onClick={onToggleExpand} className="h-8 w-8">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Patient</p>
              <p className="font-medium">{ticket.patientName || "Not provided"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Reason</p>
              <p>{ticket.reasonforVisit || "Not provided"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Created</p>
              <p>{new Date(ticket.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              {/* Department History */}
              <h4 className="font-medium text-slate-700 mb-2">Department History</h4>
              <div className="space-y-3">
                {ticket.departmentHistory && ticket.departmentHistory.length > 0 ? (
                  ticket.departmentHistory.map((history, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        history.completed ? "bg-green-50/30 border-green-200" : "bg-blue-50/30 border-blue-200"
                      }`}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-medium flex items-center">
                          {history.icon && <span className="mr-2 text-lg">{history.icon}</span>}
                          {history.department}
                          {history.completed ? (
                            <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">Completed</Badge>
                          ) : (
                            <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">Active</Badge>
                          )}
                        </span>
                        <span className="text-xs text-blue-600">{new Date(history.timestamp).toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div className="bg-white p-1.5 rounded-md shadow-sm">
                          <p className="text-xs text-slate-500">Waiting</p>
                          <p className="font-medium">{formatDuration(history.waitingDuration)}</p>
                        </div>
                        <div className="bg-white p-1.5 rounded-md shadow-sm">
                          <p className="text-xs text-slate-500">Processing</p>
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
                        <div className="bg-white p-1.5 rounded-md shadow-sm">
                          <p className="text-xs text-slate-500">Hold</p>
                          <p className="font-medium">{formatDuration(history.holdDuration)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">No department history available</p>
                )}
              </div>

              {/* Notes */}
              {(ticket.receptionistNote || ticket.departmentNote) && (
                <div className="mt-3">
                  <h4 className="font-medium text-slate-700 mb-2">Notes</h4>
                  {ticket.receptionistNote && (
                    <div className="mb-2">
                      <p className="text-xs text-slate-500">Receptionist Note</p>
                      <p className="p-2 bg-slate-50 rounded-md text-sm">{ticket.receptionistNote}</p>
                    </div>
                  )}
                  {ticket.departmentNote && (
                    <div>
                      <p className="text-xs text-slate-500">Department Note</p>
                      <p className="p-2 bg-slate-50 rounded-md text-sm">{ticket.departmentNote}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={onViewDetails} className="text-[#0e4480] border-[#0e4480]">
                  View Full Details
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
