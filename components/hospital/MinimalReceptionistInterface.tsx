"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Volume2, Clock, CheckCircle2, PauseCircle, AlertCircle, Users, ArrowLeft } from "lucide-react"
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

interface MinimalReceptionistInterfaceProps {
  ticket: Ticket
  department: Department
  room: Room
  onComplete: () => void
  onCancel: () => void
}

const USER_TYPES = ["Cash", "Insurance", "Staff"]

// Helper function to check if ticket has remaining queue departments
const hasRemainingQueueDepartments = (ticket: Ticket): boolean => {
  if (!ticket.departmentQueue || ticket.departmentQueue.length === 0) {
    return false
  }
  const currentIndex = ticket.currentQueueIndex || 0
  return currentIndex < ticket.departmentQueue.length - 1
}

const MinimalReceptionistInterface: React.FC<MinimalReceptionistInterfaceProps> = ({
  ticket,
  department,
  room,
  onComplete,
  onCancel,
}) => {
  const [userType, setUserType] = useState<string>(ticket.userType || "")
  const [patientName, setPatientName] = useState<string>(ticket.patientName || "")
  const [receptionistNote, setReceptionistNote] = useState<string>(ticket.receptionistNote || "")
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
    if (!departments) {
      setShowNextStepDialog(true)
      return
    }

    // For returned tickets, we don't need to validate user type
    const isReturnedTicket = ticket.departmentHistory && ticket.departmentHistory.length > 1

    if (!isReturnedTicket && !userType) {
      toast({
        title: "Error",
        description: "Please select a user type",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/hospital/ticket/${ticket._id}/next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departments: departments,
          userType: isReturnedTicket ? ticket.userType : userType,
          patientName: isReturnedTicket ? ticket.patientName : patientName,
          receptionistNote: receptionistNote,
          note: receptionistNote,
          departmentNote: receptionistNote,
          currentDepartment: "Reception",
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
    const isReturnedTicket = ticket.departmentHistory && ticket.departmentHistory.length > 1

    if (!isReturnedTicket && !userType) {
      toast({
        title: "Error",
        description: "Please select a user type",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/hospital/ticket/${ticket._id}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: isReturnedTicket ? ticket.userType : userType,
          patientName: isReturnedTicket ? ticket.patientName : patientName,
          receptionistNote: receptionistNote,
          note: receptionistNote,
          departmentNote: receptionistNote,
          currentDepartment: "Reception",
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
      const isReturnedTicket = ticket.departmentHistory && ticket.departmentHistory.length > 1

      const response = await fetch(`/api/hospital/ticket/${ticket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          held: true,
          patientName: isReturnedTicket ? ticket.patientName : patientName,
          receptionistNote: receptionistNote,
          note: receptionistNote,
          departmentNote: receptionistNote,
          currentDepartment: "Reception",
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

      const requestBody: any = {
        departments: departmentSelections,
        receptionistNote: receptionistNote,
        note: receptionistNote,
        currentDepartment: "Reception",
      }

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
          receptionistNote: receptionistNote,
          note: receptionistNote,
          departmentNote: receptionistNote,
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
            Reception - Serving Ticket
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

            {/* Check if this is a returned ticket */}
            {ticket.departmentHistory && ticket.departmentHistory.length > 1 ? (
              <>
                {/* Department History for returned tickets */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-sm mb-3 text-blue-800">Ticket Journey</h3>
                  <div className="space-y-2">
                    {ticket.departmentHistory.map((history, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border bg-gradient-to-r from-blue-50/50 to-green-50/50"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium flex items-center text-sm">
                            {history.icon && <span className="mr-2">{history.icon}</span>}
                            {history.department}
                            {history.completed && (
                              <Badge className="ml-2 bg-green-100 text-green-800 border-green-200 text-xs">
                                Completed
                              </Badge>
                            )}
                            {!history.completed && (
                              <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200 text-xs">Pending</Badge>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-600">
                              {new Date(history.timestamp).toLocaleString()}
                            </span>
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
                          <p className="text-xs mt-2 bg-white p-2 rounded-md shadow-sm">{history.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Original form for new tickets */
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">User Type</label>
                    <Select value={userType} onValueChange={setUserType}>
                      <SelectTrigger className="border-slate-300 focus:ring-[#0e4480]">
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Patient Name</label>
                    <Input
                      placeholder="Enter patient name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="border-slate-300 focus:ring-[#0e4480]"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Receptionist Note</label>
              <Textarea
                placeholder="Add any additional notes here..."
                value={receptionistNote}
                onChange={(e) => setReceptionistNote(e.target.value)}
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
              disabled={isLoading || (!(ticket.departmentHistory && ticket.departmentHistory.length > 1) && !userType)}
              className="bg-[#0e4480] hover:bg-blue-800 text-white"
            >
              <Users className="h-4 w-4 mr-1" />
              Next Step
            </Button>
            <Button
              onClick={handleClearTicket}
              disabled={isLoading || (!(ticket.departmentHistory && ticket.departmentHistory.length > 1) && !userType)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              End Visit
            </Button>
          </div>
        </CardFooter>
      </Card>

      <DepartmentSelectionDialog
        isOpen={showNextStepDialog}
        onClose={() => setShowNextStepDialog(false)}
        onSubmit={handleNextStep}
        departments={departments}
        currentDepartment="Reception"
        currentDepartmentId={departments.find((d) => d.title === "Reception")?._id}
        currentRoomId={room._id}
      />
    </>
  )
}

export default MinimalReceptionistInterface
