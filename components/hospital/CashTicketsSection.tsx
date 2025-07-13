"use client"

import React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, ArrowRight, Clock, User, Volume2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  clearPayment?: string | null
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

interface Department {
  _id: string
  title: string
  icon: string
  rooms: {
    _id: string
    roomNumber: string
    staff: {
      _id: string
      firstName: string
      lastName: string
    }
    available: boolean
  }[]
}

interface CashTicketsSectionProps {
  cashTickets: Ticket[]
  departments: Department[]
  onRefresh: () => Promise<void>
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

  React.useEffect(() => {
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
      <User className="h-3 w-3" />
      {roomInfo?.roomNumber ? `R${roomInfo.roomNumber}` : "Room"}: {roomInfo?.staffName?.split(" ")[0] || "Unknown"}
    </Badge>
  )
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

export const CashTicketsSection: React.FC<CashTicketsSectionProps> = ({ cashTickets, departments, onRefresh }) => {
  const [selectedCashTicket, setSelectedCashTicket] = useState<Ticket | null>(null)
  const [showCashDetailsDialog, setShowCashDetailsDialog] = useState(false)
  const [showCashClearDialog, setShowCashClearDialog] = useState(false)
  const { toast } = useToast()

  const handleEndCashVisit = async (ticketId: string) => {
    try {
      // Find the current department from the ticket's department history
      const ticket = cashTickets.find((t) => t._id === ticketId)
      const currentDept = ticket?.departmentHistory?.find((h) => !h.completed)

      if (!currentDept) {
        toast({
          title: "Error",
          description: "No active department found for this ticket",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/hospital/ticket/${ticketId}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentDepartment: currentDept.department,
        }),
      })

      if (!response.ok) throw new Error("Failed to end visit")

      toast({
        title: "Success",
        description: "Cash ticket visit ended successfully",
      })

      await onRefresh()
    } catch (error) {
      console.error("Error ending cash visit:", error)
      toast({
        title: "Error",
        description: "Failed to end cash visit",
        variant: "destructive",
      })
    }
  }

  const handleCashClear = async (departments?: Array<{ departmentId: string; roomId?: string }>) => {
    if (!selectedCashTicket || !departments) return

    try {
      // Find the current department from the ticket's department history
      const currentDept = selectedCashTicket.departmentHistory?.find((h) => !h.completed)

      if (!currentDept) {
        toast({
          title: "Error",
          description: "No active department found for this ticket",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/hospital/ticket/${selectedCashTicket._id}/next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departments: departments,
          currentDepartment: currentDept.department,
          cashCleared: "Cleared", // Set cashCleared to "Cleared" for the new department
        }),
      })

      if (!response.ok) throw new Error("Failed to clear cash ticket")

      toast({
        title: "Success",
        description: "Cash ticket cleared and sent to new department (Payment cleared)",
      })

      setSelectedCashTicket(null)
      setShowCashClearDialog(false)
      await onRefresh()
    } catch (error) {
      console.error("Error clearing cash ticket:", error)
      toast({
        title: "Error",
        description: "Failed to clear cash ticket",
        variant: "destructive",
      })
    }
  }

  const callTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call: true }),
      })

      if (!response.ok) throw new Error("Failed to call ticket")

      toast({
        title: "Success",
        description: "Ticket called successfully",
      })

      await onRefresh()
    } catch (error) {
      console.error("Error calling ticket:", error)
      toast({
        title: "Error",
        description: "Failed to call ticket",
        variant: "destructive",
      })
    }
  }

  // Filter to ensure only Cash userType tickets are included
  const filteredCashTickets = cashTickets.filter((ticket) => ticket.userType === "Cash")

  return (
    <>
      <Card className="border-none shadow-md overflow-hidden">
        {/* <CardHeader className="bg-green-600 text-white py-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5" />
            Cash Tickets
          </CardTitle>
          <CardDescription className="text-green-100">
            {filteredCashTickets.length} cash ticket{filteredCashTickets.length !== 1 ? "s" : ""} in system
          </CardDescription>
        </CardHeader> */}
        <CardContent className="p-6 bg-white overflow-auto max-h-[600px]">
          {filteredCashTickets.length > 0 ? (
            <div className="space-y-4">
              {filteredCashTickets.map((ticket) => {
                const currentDept = ticket.departmentHistory?.find((h) => !h.completed)
                const waitingTime = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 1000)

                return (
                  <Card key={ticket._id} className="border-l-4 border-l-green-400 bg-green-50/30 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-[#0e4480]">{ticket.ticketNo}</h3>
                            <Badge className="bg-green-100 text-green-800 border-green-200">Cash</Badge>
                            {ticket.emergency && (
                              <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse">
                                🚨 EMERGENCY
                              </Badge>
                            )}
                            {ticket.call && (
                              <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1 text-xs">Called</Badge>
                            )}
                          </div>

                          {ticket.patientName && (
                            <p className="text-sm text-slate-600 mb-1">Patient: {ticket.patientName}</p>
                          )}

                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-slate-500">Status:</span>
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              {currentDept ? currentDept.department : "Completed"}
                            </Badge>
                            {currentDept?.cashCleared === "Cleared" && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                Payment Cleared
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="h-4 w-4" />
                            <span>Waiting: {formatDuration(waitingTime)}</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => callTicket(ticket._id)}
                          disabled={ticket.call}
                          className="border-[#0e4480] text-[#0e4480] hover:bg-blue-50 bg-transparent"
                        >
                          <Volume2 className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                      </div>

                      {/* Ticket Journey */}
                      {ticket.departmentHistory && ticket.departmentHistory.length > 0 && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-800 mb-2 text-sm">Journey</h4>
                          <div className="space-y-2">
                            {ticket.departmentHistory.map((history, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-1">
                                  {history.icon && <span className="text-sm">{history.icon}</span>}
                                  {history.department}
                                  {history.completed && (
                                    <Badge className="ml-1 bg-green-100 text-green-800 border-green-200 text-xs">
                                      ✓
                                    </Badge>
                                  )}
                                  {!history.completed && (
                                    <Badge className="ml-1 bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                      Current
                                    </Badge>
                                  )}
                                  {history.cashCleared === "Cleared" && (
                                    <Badge className="ml-1 bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                                      Paid
                                    </Badge>
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
                                <span className="text-xs text-slate-500">
                                  {new Date(history.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCashTicket(ticket)
                            setShowCashDetailsDialog(true)
                          }}
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          More Details
                        </Button>
                        {currentDept && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCashTicket(ticket)
                                setShowCashClearDialog(true)
                              }}
                              className="border-amber-300 text-amber-600 hover:bg-amber-50"
                            >
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Clear
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEndCashVisit(ticket._id)}
                              className="border-green-300 text-green-600 hover:bg-green-50"
                            >
                              End Visit
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Users className="h-12 w-12 mb-4 opacity-30" />
              <p>No cash tickets in the system</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Details Dialog */}
      <Dialog open={showCashDetailsDialog} onOpenChange={setShowCashDetailsDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cash Ticket Details - {selectedCashTicket?.ticketNo}</DialogTitle>
          </DialogHeader>
          {selectedCashTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Patient Name:</p>
                  <p>{selectedCashTicket.patientName || "Not provided"}</p>
                </div>
                <div>
                  <p className="font-semibold">User Type:</p>
                  <p>{selectedCashTicket.userType}</p>
                </div>
                <div>
                  <p className="font-semibold">Reason for Visit:</p>
                  <p>{selectedCashTicket.reasonforVisit || "Not provided"}</p>
                </div>
                <div>
                  <p className="font-semibold">Created:</p>
                  <p>{new Date(selectedCashTicket.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Ticket Journey</h3>
                <div className="space-y-3">
                  {selectedCashTicket.departmentHistory?.map((history, index) => (
                    <div key={index} className="p-3 rounded-lg border bg-gradient-to-r from-blue-50/50 to-green-50/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium flex items-center">
                          {history.icon && <span className="mr-2 text-lg">{history.icon}</span>}
                          {history.department}
                          {history.completed && (
                            <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">Completed</Badge>
                          )}
                          {!history.completed && (
                            <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">Current</Badge>
                          )}
                          {history.cashCleared === "Cleared" && (
                            <Badge className="ml-2 bg-emerald-100 text-emerald-800 border-emerald-200">
                              Payment Cleared
                            </Badge>
                          )}
                        </span>
                        <span className="text-sm text-blue-600">{new Date(history.timestamp).toLocaleString()}</span>
                      </div>
                      {history.note && <p className="text-sm mt-2 bg-white p-2 rounded-md shadow-sm">{history.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cash Clear Dialog */}
      <DepartmentSelectionDialog
        isOpen={showCashClearDialog}
        onClose={() => {
          setShowCashClearDialog(false)
          setSelectedCashTicket(null)
        }}
        onSubmit={handleCashClear}
        departments={departments}
        currentDepartment="Billing"
        currentDepartmentId={departments.find((d) => d.title === "Billing")?._id}
        currentRoomId={undefined}
      />
    </>
  )
}
