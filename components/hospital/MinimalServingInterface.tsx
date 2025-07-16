"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Volume2, Clock, CheckCircle2, PauseCircle, AlertCircle, Users, ArrowLeft, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DepartmentSelectionDialog } from "./DepartmentSelectionDialog"

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
  roomNumber?: string
  roomLabel?: string
  waitingTime?: number
  status?: "waiting" | "serving" | "held" | "completed"
}

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

interface MinimalServingInterfaceProps {
  ticket: Ticket
  department: Department
  room: Room
  onComplete: () => void
  onCancel: () => void
}

// Helper function to check if ticket is at the last department in queue
const isAtLastDepartmentInQueue = (ticket: Ticket): boolean => {
  if (!ticket.departmentQueue || ticket.departmentQueue.length === 0) {
    return false
  }
  const currentIndex = ticket.currentQueueIndex || 0
  return currentIndex >= ticket.departmentQueue.length - 1
}

// Helper function to check if ticket has remaining queue departments
const hasRemainingQueueDepartments = (ticket: Ticket): boolean => {
  if (!ticket.departmentQueue || ticket.departmentQueue.length === 0) {
    return false
  }
  const currentIndex = ticket.currentQueueIndex || 0
  return currentIndex < ticket.departmentQueue.length - 1
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

  useEffect(() => {
    const loadRoomInfo = async () => {
      setIsLoading(true)
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
          }
        }

        setRoomInfo({
          roomNumber: room.roomNumber || "Unknown",
          staffName: staffName,
        })
      } catch (error) {
        console.error("Error loading room info:", error)
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

  return (
    <Badge className="ml-2 bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1 text-xs">
      <User className="h-3 w-3" />
      {roomInfo?.roomNumber ? `R${roomInfo.roomNumber}` : "Room"}: {roomInfo?.staffName?.split(" ")[0] || "Unknown"}
    </Badge>
  )
}

const MinimalServingInterface: React.FC<MinimalServingInterfaceProps> = ({
  ticket,
  department,
  room,
  onComplete,
  onCancel,
}) => {
  const [departmentNote, setDepartmentNote] = useState<string>(ticket.departmentNote || "")
  const [showNextStepDialog, setShowNextStepDialog] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch("/api/hospital/department")
        if (!response.ok) throw new Error("Failed to fetch departments")
        const data = await response.json()
        setDepartments(data)
      } catch (error) {
        console.error("Error fetching departments:", error)
      }
    }
    fetchDepartments()
  }, [])

  const handleCallTicket = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/hospital/ticket/${ticket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call: true }),
      })

      if (!response.ok) throw new Error("Failed to call ticket")

      toast({
        title: "Success",
        description: "Ticket called successfully",
      })
    } catch (error) {
      console.error("Error calling ticket:", error)
      toast({
        title: "Error",
        description: "Failed to call ticket",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNextStep = async (departments?: Array<{ departmentId: string; roomId?: string }>) => {
    // Check if ticket has a department queue and we should auto-progress
    if (
      !departments &&
      ticket.departmentQueue &&
      ticket.departmentQueue.length > 0 &&
      !isAtLastDepartmentInQueue(ticket)
    ) {
      setIsLoading(true)
      try {
        // Use the queue progression endpoint
        const response = await fetch(`/api/hospital/ticket/${ticket._id}/next-step`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentDepartment: department.title,
            departmentNote: departmentNote,
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

        onComplete()
        return
      } catch (error) {
        console.error("Error progressing in queue:", error)
        toast({
          title: "Error",
          description: "Failed to progress in queue",
          variant: "destructive",
        })
        return
      } finally {
        setIsLoading(false)
      }
    }

    // If no departments provided, open the dialog for manual selection
    if (!departments) {
      setShowNextStepDialog(true)
      return
    }

    setIsLoading(true)
    try {
      // Regular next step with new department selection
      const response = await fetch(`/api/hospital/ticket/${ticket._id}/next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departments: departments,
          departmentNote: departmentNote,
          note: departmentNote,
          currentDepartment: department.title,
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

      onComplete()
    } catch (error) {
      console.error("Error assigning next step:", error)
      toast({
        title: "Error",
        description: "Failed to assign next step",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearTicket = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/hospital/ticket/${ticket._id}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentNote: departmentNote,
          note: departmentNote,
          currentDepartment: department.title,
          roomId: room._id,
        }),
      })

      if (!response.ok) throw new Error("Failed to clear ticket")

      toast({
        title: "Success",
        description: "Ticket cleared successfully",
      })

      onComplete()
    } catch (error) {
      console.error("Error clearing ticket:", error)
      toast({
        title: "Error",
        description: "Failed to clear ticket",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleHoldTicket = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/hospital/ticket/${ticket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          held: true,
          departmentNote: departmentNote,
          note: departmentNote,
          currentDepartment: department.title,
          roomId: room._id,
        }),
      })

      if (!response.ok) throw new Error("Failed to hold ticket")

      toast({
        title: "Success",
        description: "Ticket placed on hold",
      })

      onComplete()
    } catch (error) {
      console.error("Error holding ticket:", error)
      toast({
        title: "Error",
        description: "Failed to hold ticket",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReturnToDepartment = async (departmentName: string, roomId?: string) => {
    setIsLoading(true)
    try {
      // Find the department ID
      const dept = departments.find((d) => d.title === departmentName)
      if (!dept) {
        toast({
          title: "Error",
          description: "Department not found",
          variant: "destructive",
        })
        return
      }

      const departmentSelections = [
        {
          departmentId: dept._id,
          roomId: roomId,
        },
      ]

      // Prepare the request body
      const requestBody: any = {
        departments: departmentSelections,
        departmentNote: departmentNote,
        note: departmentNote,
        currentDepartment: department.title,
      }

      // If the ticket is a Cash ticket, set cashCleared to "Cleared"
      if (ticket.userType === "Cash") {
        requestBody.cashCleared = "Cleared"
      }

      const response = await fetch(`/api/hospital/ticket/${ticket._id}/next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) throw new Error("Failed to return ticket to department")

      toast({
        title: "Success",
        description: `Ticket sent back to ${departmentName}${ticket.userType === "Cash" ? " (Payment cleared)" : ""}`,
      })

      onComplete()
    } catch (error) {
      console.error("Error returning ticket to department:", error)
      toast({
        title: "Error",
        description: "Failed to return ticket to department",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const cancelTicket = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/hospital/ticket/${ticket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noShow: true,
          departmentNote: departmentNote,
          note: departmentNote,
        }),
      })

      if (!response.ok) throw new Error("Failed to cancel ticket")

      toast({
        title: "Success",
        description: "Ticket cancelled successfully",
      })

      onComplete()
    } catch (error) {
      console.error("Error cancelling ticket:", error)
      toast({
        title: "Error",
        description: "Failed to cancel ticket",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card className="border-none shadow-lg overflow-hidden h-full bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-[#0e4480] to-blue-600 text-white py-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            {department.title} - Serving Ticket
          </CardTitle>
          <div className="text-blue-100 text-sm">
            {ticket.patientName || "Patient"} - {ticket.ticketNo} in Room {room.roomNumber}
          </div>
        </CardHeader>
        <CardContent className="p-4 bg-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-[#0e4480] text-white text-base px-4 py-1.5 rounded-lg">{ticket.ticketNo}</Badge>
                {ticket.emergency && (
                  <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse text-xs">🚨 EMERGENCY</Badge>
                )}
                {ticket.call && <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1 text-xs">Called</Badge>}
                {ticket.userType && (
                  <Badge className="bg-blue-100 text-blue-800 px-3 py-1 text-xs">{ticket.userType}</Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCallTicket}
                disabled={ticket.call || isLoading}
                className="border-[#0e4480] text-[#0e4480] hover:bg-blue-50 bg-transparent"
              >
                <Volume2 className="h-4 w-4 mr-1" />
                Call
              </Button>
            </div>

            {/* Patient Information */}
            {(ticket.patientName || ticket.reasonforVisit) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ticket.patientName && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-sm mb-2 text-blue-800">Patient Name</h3>
                    <p className="text-slate-700 text-sm">{ticket.patientName}</p>
                  </div>
                )}
                {ticket.reasonforVisit && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h3 className="font-semibold text-sm mb-2 text-blue-800">Reason for Visit</h3>
                    <p className="text-slate-700 text-sm">{ticket.reasonforVisit}</p>
                  </div>
                )}
              </div>
            )}

            {/* Ticket Journey */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <h3 className="font-semibold text-sm mb-3 text-blue-800">Ticket Journey</h3>
              <div className="space-y-2">
                {ticket.departmentHistory?.map((history, index) => (
                  <div key={index} className="p-3 rounded-lg border bg-gradient-to-r from-blue-50/50 to-green-50/50">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium flex items-center text-sm">
                        {history.icon && <span className="mr-2">{history.icon}</span>}
                        {history.department}
                        {history.completed && (
                          <Badge className="ml-2 bg-green-100 text-green-800 border-green-200 text-xs">Completed</Badge>
                        )}
                        {!history.completed && (
                          <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200 text-xs">Active</Badge>
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-600">{new Date(history.timestamp).toLocaleString()}</span>
                        {history.completed && !hasRemainingQueueDepartments(ticket) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReturnToDepartment(history.department, history.roomId)}
                            className="border-blue-300 text-blue-600 hover:bg-blue-50 text-xs"
                            disabled={isLoading}
                          >
                            <ArrowLeft className="h-3 w-3 mr-1" />
                            Send back
                          </Button>
                        )}
                      </div>
                    </div>
                    {history.note && (
                      <div className="mt-2 p-2 bg-white rounded-md text-xs border border-slate-100">
                        <p className="font-medium mb-1 text-slate-700">Notes:</p>
                        <p className="text-slate-600">{history.note}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Department Note */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Department Note</label>
              <Textarea
                placeholder="Add any additional notes here..."
                value={departmentNote}
                onChange={(e) => setDepartmentNote(e.target.value)}
                className="h-24 border-slate-300 focus:ring-[#0e4480] text-sm"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-2 bg-slate-50 p-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleHoldTicket}
              disabled={isLoading}
              className="border-amber-400 text-amber-600 hover:bg-amber-50 bg-transparent"
            >
              <PauseCircle className="h-4 w-4 mr-1" />
              Hold
            </Button>
            <Button
              variant="outline"
              onClick={cancelTicket}
              disabled={isLoading}
              className="border-red-400 text-red-600 hover:bg-red-50 bg-transparent"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={() => handleNextStep()}
              disabled={isLoading}
              className="bg-[#0e4480] hover:bg-blue-800 text-white"
            >
              <Users className="h-4 w-4 mr-1" />
              {ticket.departmentQueue && ticket.departmentQueue.length > 0
                ? isAtLastDepartmentInQueue(ticket)
                  ? "Next Step"
                  : "Next in Queue"
                : "Next Step"}
            </Button>
            <Button
              onClick={handleClearTicket}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardFooter>
      </Card>

      <DepartmentSelectionDialog
        isOpen={showNextStepDialog}
        onClose={() => setShowNextStepDialog(false)}
        onSubmit={handleNextStep}
        departments={departments}
        currentDepartment={department.title}
        currentDepartmentId={department._id}
        currentRoomId={room._id}
      />
    </>
  )
}

export default MinimalServingInterface
