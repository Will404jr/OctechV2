"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DepartmentSelectionDialog } from "./DepartmentSelectionDialog"

interface Ticket {
  createdAt: string | number | Date
  _id: string
  ticketNo: string
  call: boolean
  noShow?: boolean
  patientName?: string
  reasonforVisit?: string
  receptionistNote?: string
  held?: boolean
  emergency?: boolean
  departmentHistory?: {
    department: string
    icon?: string
    timestamp: string
    note?: string
    completed?: boolean
    roomId?: string
  }[]
  userType?: string
  departmentQueue?: string[]
  currentQueueIndex?: number
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

interface InsuranceTicketsSectionProps {
  insuranceTickets: Ticket[]
  departments: Department[]
  onRefresh: () => Promise<void>
}

export const InsuranceTicketsSection: React.FC<InsuranceTicketsSectionProps> = ({
  insuranceTickets,
  departments,
  onRefresh,
}) => {
  const [selectedInsuranceTicket, setSelectedInsuranceTicket] = useState<Ticket | null>(null)
  const [showInsuranceDetailsDialog, setShowInsuranceDetailsDialog] = useState(false)
  const [showInsuranceClearDialog, setShowInsuranceClearDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const handleEndInsuranceVisit = async (ticketId: string) => {
    try {
      // Find the current department from the ticket's department history
      const ticket = insuranceTickets.find((t) => t._id === ticketId)
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
        description: "Insurance ticket visit ended successfully",
      })

      await onRefresh()
    } catch (error) {
      console.error("Error ending insurance visit:", error)
      toast({
        title: "Error",
        description: "Failed to end insurance visit",
        variant: "destructive",
      })
    }
  }

  const handleInsuranceClear = async (departments?: Array<{ departmentId: string; roomId?: string }>) => {
    if (!selectedInsuranceTicket || !departments) return

    try {
      // Find the current department from the ticket's department history
      const currentDept = selectedInsuranceTicket.departmentHistory?.find((h) => !h.completed)

      if (!currentDept) {
        toast({
          title: "Error",
          description: "No active department found for this ticket",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/hospital/ticket/${selectedInsuranceTicket._id}/next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departments: departments,
          currentDepartment: currentDept.department, // Use the actual current department
        }),
      })

      if (!response.ok) throw new Error("Failed to clear insurance ticket")

      toast({
        title: "Success",
        description: "Insurance ticket cleared and sent to new department",
      })

      setSelectedInsuranceTicket(null)
      setShowInsuranceClearDialog(false)
      await onRefresh()
    } catch (error) {
      console.error("Error clearing insurance ticket:", error)
      toast({
        title: "Error",
        description: "Failed to clear insurance ticket",
        variant: "destructive",
      })
    }
  }

  // Filter to ensure only Insurance userType tickets are included and apply search
  const filteredInsuranceTickets = insuranceTickets
    .filter((ticket) => ticket.userType === "Insurance")
    .filter((ticket) => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        ticket.ticketNo.toLowerCase().includes(searchLower) ||
        ticket.patientName?.toLowerCase().includes(searchLower) ||
        ticket.reasonforVisit?.toLowerCase().includes(searchLower) ||
        ticket.departmentHistory?.some((dept) => dept.department.toLowerCase().includes(searchLower))
      )
    })

  return (
    <>
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-blue-600 text-white py-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5" />
            Insurance Tickets
          </CardTitle>
          <CardDescription className="text-blue-100">
            {filteredInsuranceTickets.length} insurance ticket
            {filteredInsuranceTickets.length !== 1 ? "s" : ""} in system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 bg-white">
          {/* Search Bar */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by ticket number, patient name, reason, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="overflow-auto max-h-[600px]">
            {filteredInsuranceTickets.length > 0 ? (
              <div className="space-y-4">
                {filteredInsuranceTickets.map((ticket) => {
                  const currentDept = ticket.departmentHistory?.find((h) => !h.completed)
                  return (
                    <Card key={ticket._id} className="border-l-4 border-l-blue-400 bg-blue-50/30 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold mb-1 text-[#0e4480]">{ticket.ticketNo}</h3>
                            {ticket.patientName && (
                              <p className="text-sm text-slate-600 mb-1">Patient: {ticket.patientName}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-500">Status:</span>
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                {currentDept ? currentDept.department : "Completed"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInsuranceTicket(ticket)
                              setShowInsuranceDetailsDialog(true)
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
                                  setSelectedInsuranceTicket(ticket)
                                  setShowInsuranceClearDialog(true)
                                }}
                                className="border-amber-300 text-amber-600 hover:bg-amber-50"
                              >
                                Clear
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEndInsuranceVisit(ticket._id)}
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
                <p>
                  {searchTerm
                    ? "No insurance tickets found matching your search"
                    : "No insurance tickets in the system"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insurance Details Dialog */}
      <Dialog open={showInsuranceDetailsDialog} onOpenChange={setShowInsuranceDetailsDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insurance Ticket Details - {selectedInsuranceTicket?.ticketNo}</DialogTitle>
          </DialogHeader>
          {selectedInsuranceTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Patient Name:</p>
                  <p>{selectedInsuranceTicket.patientName || "Not provided"}</p>
                </div>
                <div>
                  <p className="font-semibold">User Type:</p>
                  <p>{selectedInsuranceTicket.userType}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Ticket Journey</h3>
                <div className="space-y-3">
                  {selectedInsuranceTicket.departmentHistory?.map((history, index) => (
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

      {/* Insurance Clear Dialog */}
      <DepartmentSelectionDialog
        isOpen={showInsuranceClearDialog}
        onClose={() => {
          setShowInsuranceClearDialog(false)
          setSelectedInsuranceTicket(null)
        }}
        onSubmit={handleInsuranceClear}
        departments={departments}
        currentDepartment="Reception"
        currentDepartmentId={departments.find((d) => d.title === "Reception")?._id}
        currentRoomId={undefined}
      />
    </>
  )
}
