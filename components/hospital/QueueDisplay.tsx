"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Users, Timer, PauseCircle, CheckCircle2, RefreshCw, AlertCircle, DoorOpen } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QueueSpinner } from "@/components/queue-spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import MinimalReceptionistInterface from "./MinimalReceptionistInterface"
import MinimalServingInterface from "./MinimalServingInterface"

interface Room {
  _id: string
  roomNumber: string
  label?: string
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
  cashCleared?: string | null
  paidAt?: string | null
}

interface DepartmentQueueEntry {
  departmentId: string
  departmentName: string
  roomId?: string
  processed: boolean
  order: number
}

interface QueueTicket {
  _id: string
  ticketNo: string
  patientName?: string
  emergency?: boolean
  held?: boolean
  completed?: boolean
  noShow?: boolean
  userType?: string
  departmentHistory?: DepartmentHistoryEntry[]
  createdAt: string
  roomNumber?: string
  roomLabel?: string
  waitingTime: number
  status: "waiting" | "serving" | "held" | "completed"
  call: boolean
  reasonforVisit?: string
  receptionistNote?: string
  departmentNote?: string
  departmentQueue?: DepartmentQueueEntry[]
  currentQueueIndex?: number
  language?: string
  completedAt?: string | null
  totalDuration?: number
  updatedAt: string
}

interface RoomQueue {
  roomId?: string
  roomNumber?: string
  roomLabel?: string
  tickets: QueueTicket[]
}

interface DepartmentQueue {
  departmentId: string
  departmentName: string
  departmentIcon: string
  rooms: Map<string, RoomQueue>
  totalTickets: number
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

const QueueDisplay: React.FC = () => {
  const [queues, setQueues] = useState<DepartmentQueue[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Dialog state
  const [showRoomSelectionDialog, setShowRoomSelectionDialog] = useState(false)
  const [showServingDialog, setShowServingDialog] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<QueueTicket | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch("/api/hospital/department")
      if (!response.ok) throw new Error("Failed to fetch departments")
      const data = await response.json()
      setDepartments(data)
      return data
    } catch (error) {
      console.error("Error fetching departments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive",
      })
      return []
    }
  }, [toast])

  // Fetch queue data
  const fetchQueueData = useCallback(async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0]

      // Fetch active tickets
      const activeResponse = await fetch(`/api/hospital/ticket?date=${today}`)
      if (!activeResponse.ok) throw new Error("Failed to fetch active tickets")
      const activeTickets = await activeResponse.json()

      // Fetch completed tickets
      const completedResponse = await fetch(`/api/hospital/ticket/completed?date=${today}`)
      let completedTickets = []
      if (completedResponse.ok) {
        completedTickets = await completedResponse.json()
      }

      // Combine all tickets
      const allTickets = [...activeTickets, ...completedTickets]

      // Get departments data
      const departmentsData = await fetchDepartments()

      // Group tickets by department, then by room within each department
      const departmentMap = new Map<string, DepartmentQueue>()

      for (const ticket of allTickets) {
        if (!ticket.departmentHistory || ticket.departmentHistory.length === 0) continue

        // Find current department (not completed)
        const currentDept = ticket.departmentHistory.find((history: { completed: any }) => !history.completed)
        if (!currentDept) continue

        // Find department info
        const department = departmentsData.find((d: { title: any }) => d.title === currentDept.department)
        if (!department) continue

        // Determine status
        let status: "waiting" | "serving" | "held" | "completed" = "waiting"
        if (ticket.held) {
          status = "held"
        } else if (ticket.completed || ticket.noShow) {
          status = "completed"
        } else if (currentDept.roomId && currentDept.startedAt && currentDept.actuallyStarted !== false) {
          status = "serving"
        }

        // Calculate waiting time
        const waitingTime = Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / 1000)

        // Find room info if roomId exists
        let roomNumber = ""
        let roomLabel = ""
        if (currentDept.roomId) {
          const room = department.rooms.find((r: { _id: any }) => r._id === currentDept.roomId)
          if (room) {
            roomNumber = room.roomNumber
            roomLabel = room.label || ""
          }
        }

        // Create or get department entry
        if (!departmentMap.has(department._id)) {
          departmentMap.set(department._id, {
            departmentId: department._id,
            departmentName: department.title,
            departmentIcon: department.icon,
            rooms: new Map<string, RoomQueue>(),
            totalTickets: 0,
          })
        }

        const deptEntry = departmentMap.get(department._id)!

        // Create room key (use "general" for tickets without specific room)
        const roomKey = currentDept.roomId || "general"

        // Create or get room entry within department
        if (!deptEntry.rooms.has(roomKey)) {
          deptEntry.rooms.set(roomKey, {
            roomId: currentDept.roomId,
            roomNumber: roomNumber,
            roomLabel: roomLabel,
            tickets: [],
          })
        }

        const roomEntry = deptEntry.rooms.get(roomKey)!
        roomEntry.tickets.push({
          _id: ticket._id,
          ticketNo: ticket.ticketNo,
          patientName: ticket.patientName,
          emergency: ticket.emergency,
          held: ticket.held,
          completed: ticket.completed,
          noShow: ticket.noShow,
          userType: ticket.userType,
          departmentHistory: ticket.departmentHistory,
          createdAt: ticket.createdAt,
          roomNumber: roomNumber,
          roomLabel: roomLabel,
          waitingTime: waitingTime,
          status: status,
          call: ticket.call || false,
          reasonforVisit: ticket.reasonforVisit,
          receptionistNote: ticket.receptionistNote,
          departmentNote: ticket.departmentNote,
          departmentQueue: ticket.departmentQueue,
          currentQueueIndex: ticket.currentQueueIndex,
          language: ticket.language,
          completedAt: ticket.completedAt,
          totalDuration: ticket.totalDuration,
          updatedAt: ticket.updatedAt,
        })

        deptEntry.totalTickets++
      }

      // Convert to array format and sort
      const departmentsArray = Array.from(departmentMap.values()).sort((a, b) =>
        a.departmentName.localeCompare(b.departmentName),
      )

      // Sort rooms within each department and tickets within each room
      departmentsArray.forEach((dept) => {
        // Convert rooms map to array and sort
        const roomsArray = Array.from(dept.rooms.entries()).sort(([keyA, roomA], [keyB, roomB]) => {
          // General room (no specific room) comes first
          if (keyA === "general" && keyB !== "general") return -1
          if (keyA !== "general" && keyB === "general") return 1

          // Sort by room number
          if (roomA.roomNumber && roomB.roomNumber) {
            return roomA.roomNumber.localeCompare(roomB.roomNumber)
          }
          return 0
        })

        // Sort tickets within each room
        roomsArray.forEach(([, room]) => {
          room.tickets.sort((a, b) => {
            // Emergency tickets first
            if (a.emergency && !b.emergency) return -1
            if (!a.emergency && b.emergency) return 1

            // Then by status priority (serving > waiting > held > completed)
            const statusPriority = { serving: 0, waiting: 1, held: 2, completed: 3 }
            const aPriority = statusPriority[a.status]
            const bPriority = statusPriority[b.status]
            if (aPriority !== bPriority) return aPriority - bPriority

            // Finally by creation time (oldest first)
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          })
        })

        // Update the rooms map with sorted data
        dept.rooms = new Map(roomsArray)
      })

      setQueues(departmentsArray)
    } catch (error) {
      console.error("Error fetching queue data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch queue data",
        variant: "destructive",
      })
    }
  }, [fetchDepartments, toast])

  // Initial data loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await fetchQueueData()
      setIsLoading(false)
    }
    loadData()

    // Set up polling interval to refresh every 30 seconds
    const pollingInterval = setInterval(async () => {
      console.log("Auto-refreshing queue data (30s interval)")
      await fetchQueueData()
    }, 30000)

    // Clean up interval on component unmount
    return () => clearInterval(pollingInterval)
  }, [fetchQueueData])

  const refreshQueues = async () => {
    setIsLoading(true)
    await fetchQueueData()
    setIsLoading(false)

    toast({
      title: "Refreshed",
      description: "Queue data has been updated",
    })
  }

  const handleServeTicket = (department: Department, ticket: QueueTicket) => {
    setSelectedDepartment(department)
    setSelectedTicket(ticket)
    setShowRoomSelectionDialog(true)
  }

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room)
    setShowRoomSelectionDialog(false)
    setShowServingDialog(true)
  }

  const handleServingComplete = () => {
    setSelectedTicket(null)
    setSelectedDepartment(null)
    setSelectedRoom(null)
    setShowServingDialog(false)
    // Refresh the queue data
    fetchQueueData()
  }

  const handleServingCancel = () => {
    setSelectedTicket(null)
    setSelectedDepartment(null)
    setSelectedRoom(null)
    setShowServingDialog(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
          <p className="text-slate-500">Loading queues...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1 bg-gradient-to-r from-[#0e4480] to-blue-600 bg-clip-text text-transparent">
            Department Queues
          </h2>
          <p className="text-slate-500 text-sm sm:text-base">Real-time view of all department and room queues</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#0e4480]/10 px-3 py-2 rounded-full">
            <Users className="h-4 w-4 text-[#0e4480]" />
            <span className="font-medium text-[#0e4480] text-sm">{queues.length} queues</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshQueues}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Queue Cards */}
      {queues.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {queues.map((dept) => (
            <Card key={dept.departmentId} className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{dept.departmentIcon}</span>
                    <div className="font-semibold text-slate-800">{dept.departmentName}</div>
                  </div>
                  <Badge className="bg-[#0e4480]/10 text-[#0e4480] border-[#0e4480]/20">
                    {dept.totalTickets} tickets
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from(dept.rooms.entries()).map(([roomKey, room]) => (
                  <div key={roomKey} className="space-y-3">
                    {/* Room Header */}
                    {roomKey !== "general" && (
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                            Room {room.roomNumber}
                          </Badge>
                          {room.roomLabel && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                              {room.roomLabel}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {room.tickets.length} ticket{room.tickets.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {/* General Queue Header */}
                    {roomKey === "general" && room.tickets.length > 0 && (
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">General Queue</Badge>
                        </div>
                        <span className="text-xs text-slate-500">
                          {room.tickets.length} ticket{room.tickets.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {/* Tickets */}
                    <div className="space-y-2">
                      {room.tickets.map((ticket) => {
                        const currentDept = ticket.departmentHistory?.find((h) => !h.completed)
                        const isServing = ticket.status === "serving"
                        const isHeld = ticket.status === "held"
                        const isCompleted = ticket.status === "completed"

                        return (
                          <div
                            key={ticket._id}
                            className={`p-3 rounded-lg border transition-all duration-200 ${
                              ticket.emergency
                                ? "border-red-200 bg-red-50/50 shadow-sm"
                                : isServing
                                  ? "border-green-200 bg-green-50/50"
                                  : isHeld
                                    ? "border-amber-200 bg-amber-50/50"
                                    : isCompleted
                                      ? "border-slate-200 bg-slate-50/50"
                                      : "border-slate-200 bg-white hover:bg-slate-50/50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={`text-xs font-medium ${
                                    ticket.emergency
                                      ? "bg-red-100 text-red-800 border-red-200"
                                      : "bg-[#0e4480] text-white"
                                  }`}
                                >
                                  {ticket.ticketNo}
                                </Badge>
                                {ticket.emergency && (
                                  <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse text-xs">
                                    🚨 EMERGENCY
                                  </Badge>
                                )}
                                {ticket.call && (
                                  <Badge className="bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs">Called</Badge>
                                )}
                                {ticket.userType && (
                                  <Badge className="bg-blue-100 text-blue-800 px-2 py-0.5 text-xs">
                                    {ticket.userType}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {isServing && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                {isHeld && <PauseCircle className="h-4 w-4 text-amber-600" />}
                                {!isServing && !isHeld && !isCompleted && <Timer className="h-4 w-4 text-blue-600" />}
                                {isCompleted && <CheckCircle2 className="h-4 w-4 text-slate-400" />}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <div className="flex items-center gap-3">
                                {ticket.patientName && <span className="font-medium">{ticket.patientName}</span>}
                                <span className="flex items-center gap-1">
                                  <Timer className="h-3 w-3" />
                                  {currentDept?.startedAt && isServing ? (
                                    <RealTimeDuration
                                      startTime={currentDept.startedAt}
                                      endTime={currentDept.completedAt}
                                      isActive={!currentDept.completedAt}
                                    />
                                  ) : (
                                    <RealTimeDuration
                                      startTime={ticket.createdAt}
                                      endTime={ticket.completedAt}
                                      isActive={!ticket.completed}
                                    />
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={`text-xs ${
                                    isServing
                                      ? "bg-green-100 text-green-800 border-green-200"
                                      : isHeld
                                        ? "bg-amber-100 text-amber-800 border-amber-200"
                                        : isCompleted
                                          ? "bg-slate-100 text-slate-600 border-slate-200"
                                          : "bg-blue-100 text-blue-800 border-blue-200"
                                  }`}
                                >
                                  {isServing ? "Serving" : isHeld ? "On Hold" : isCompleted ? "Completed" : "Waiting"}
                                </Badge>
                                {/* {!isCompleted && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleServeTicket(departments.find((d) => d._id === dept.departmentId)!, ticket)
                                    }
                                    className="bg-[#0e4480] hover:bg-blue-800 text-white text-xs px-2 py-1 h-6"
                                  >
                                    <DoorOpen className="h-3 w-3 mr-1" />
                                    Serve
                                  </Button>
                                )} */}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {dept.totalTickets === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tickets in queue</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No active queues found. Tickets will appear here as they are created.</AlertDescription>
        </Alert>
      )}

      {/* Room Selection Dialog */}
      <Dialog open={showRoomSelectionDialog} onOpenChange={setShowRoomSelectionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Select a room in {selectedDepartment?.title} to serve ticket {selectedTicket?.ticketNo}:
            </p>
            <div className="grid gap-2">
              {selectedDepartment?.rooms.map((room) => (
                <Button
                  key={room._id}
                  variant="outline"
                  onClick={() => handleRoomSelect(room)}
                  className="justify-start h-auto p-3"
                  disabled={!room.available}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-700">Room {room.roomNumber}</Badge>
                      {room.label && <span className="text-sm text-slate-600">{room.label}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {room.staff.firstName} {room.staff.lastName}
                      </span>
                      <Badge className={room.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {room.available ? "Available" : "Busy"}
                      </Badge>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoomSelectionDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Serving Dialog */}
      <Dialog open={showServingDialog} onOpenChange={setShowServingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && selectedDepartment && selectedRoom && (
            <>
              {selectedDepartment.title === "Reception" ? (
                <MinimalReceptionistInterface
                  ticket={selectedTicket}
                  department={selectedDepartment}
                  room={selectedRoom}
                  onComplete={handleServingComplete}
                  onCancel={handleServingCancel}
                />
              ) : (
                <MinimalServingInterface
                  ticket={selectedTicket}
                  department={selectedDepartment}
                  room={selectedRoom}
                  onComplete={handleServingComplete}
                  onCancel={handleServingCancel}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default QueueDisplay
