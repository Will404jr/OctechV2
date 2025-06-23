"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { AlertCircle, Clock, CheckCircle2, DollarSign, CreditCard, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QueueSpinner } from "@/components/queue-spinner"
import { Badge } from "@/components/ui/badge"
import type { SessionData } from "@/lib/session"
import { Navbar } from "@/components/hospitalNavbar"
import { ProtectedRoute } from "@/components/ProtectedRoute"

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
        <span>{currentDept.department}</span>
      </Badge>
    </div>
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

const BillingPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<SessionData | null>(null)
  const [processingTickets, setProcessingTickets] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const router = useRouter()

  // Fetch tickets that need payment clearance
  const fetchPendingPaymentTickets = useCallback(async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0]

      // Fetch all tickets for today
      const response = await fetch(`/api/hospital/ticket?date=${today}`)
      if (!response.ok) throw new Error("Failed to fetch tickets")
      const allTickets = await response.json()

      // Filter for cash tickets that need payment clearance
      const pendingPaymentTickets = allTickets.filter((ticket: Ticket) => {
        // Must be cash user type
        if (ticket.userType !== "Cash") return false

        // Must not be completed or cancelled
        if (ticket.completed || ticket.noShow) return false

        // Find current department (not completed and not Reception)
        const currentDept = ticket.departmentHistory?.find(
          (history) => !history.completed && history.department !== "Reception",
        )

        // Must have a current department and cashCleared must be null
        return currentDept && (currentDept.cashCleared === null || currentDept.cashCleared === undefined)
      })

      // Sort by creation time (oldest first)
      pendingPaymentTickets.sort(
        (a: Ticket, b: Ticket) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )

      setTickets(pendingPaymentTickets)
      return pendingPaymentTickets
    } catch (error) {
      console.error("Error fetching pending payment tickets:", error)
      toast({
        title: "Error",
        description: "Failed to fetch pending payment tickets",
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

  // Clear payment for a ticket
  const handleClearPayment = async (ticketId: string) => {
    if (processingTickets.has(ticketId)) return

    setProcessingTickets((prev) => new Set(prev).add(ticketId))

    try {
      const ticket = tickets.find((t) => t._id === ticketId)
      if (!ticket) throw new Error("Ticket not found")

      // Find the current department that needs payment clearance
      const currentDept = ticket.departmentHistory?.find(
        (history) => !history.completed && history.department !== "Reception",
      )

      if (!currentDept) {
        throw new Error("No department found for payment clearance")
      }

      const response = await fetch(`/api/hospital/ticket/${ticketId}/clear-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department: currentDept.department,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to clear payment")
      }

      toast({
        title: "Payment Cleared",
        description: `Payment cleared for ticket ${ticket.ticketNo}. Patient can now be served.`,
      })

      // Refresh the tickets list
      await fetchPendingPaymentTickets()
    } catch (error: any) {
      console.error("Error clearing payment:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to clear payment",
        variant: "destructive",
      })
    } finally {
      setProcessingTickets((prev) => {
        const newSet = new Set(prev)
        newSet.delete(ticketId)
        return newSet
      })
    }
  }

  // Initial data loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchPendingPaymentTickets(), fetchDepartments()])
      setIsLoading(false)
    }
    loadData()

    // Set up polling interval to refresh tickets every 5 seconds
    const pollingInterval = setInterval(async () => {
      console.log("Auto-refreshing pending payment tickets (5s interval)")
      await fetchPendingPaymentTickets()
    }, 5000)

    // Clean up interval on component unmount
    return () => clearInterval(pollingInterval)
  }, [fetchPendingPaymentTickets, fetchDepartments])

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

  const refreshTickets = async () => {
    setIsLoading(true)
    await fetchPendingPaymentTickets()
    setIsLoading(false)

    toast({
      title: "Refreshed",
      description: "Pending payment tickets have been updated",
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
          <p className="text-slate-500">Loading pending payments...</p>
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
    <ProtectedRoute requiredPermission="Billing">
      <Navbar staffId={session?.userId || ""} />
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
        <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header Section */}
          <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mb-1 bg-gradient-to-r from-[#0e4480] to-blue-600 bg-clip-text text-transparent">
                  Billing & Payments
                </h1>
                <p className="text-slate-500 text-sm sm:text-base">
                  Clear payments for cash patients before they can be served
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-[#0e4480]/10 px-3 py-2 rounded-full flex-1 sm:flex-none">
                  <DollarSign className="h-4 w-4 text-[#0e4480]" />
                  <span className="font-medium text-[#0e4480] text-sm">{tickets.length} pending</span>
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

          {/* Pending Payments List */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#0e4480]" />
                Pending Payment Clearance
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Cash patients waiting for payment clearance before they can be served
              </p>
            </div>

            <div className="p-4 sm:p-6">
              {tickets.length > 0 ? (
                <div className="space-y-4">
                  {tickets.map((ticket) => {
                    const currentDept = ticket.departmentHistory?.find(
                      (history) => !history.completed && history.department !== "Reception",
                    )
                    const isProcessing = processingTickets.has(ticket._id)

                    return (
                      <Card
                        key={ticket._id}
                        className="border-l-4 border-l-amber-400 bg-amber-50/30 hover:shadow-lg transition-all duration-200"
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex-1">
                              {/* Header */}
                              <div className="flex items-center gap-3 mb-3">
                                <Badge className="bg-[#0e4480] text-white px-3 py-1 text-base font-mono">
                                  {ticket.ticketNo}
                                </Badge>
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  Cash Payment
                                </Badge>
                                {ticket.emergency && (
                                  <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
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
                                  <p className="text-xs text-slate-500 font-medium">Reason for Visit</p>
                                  <p className="text-sm">{ticket.reasonforVisit || "Not provided"}</p>
                                </div>
                              </div>

                              {/* Department Info */}
                              <div className="mb-3">
                                <p className="text-xs text-slate-500 font-medium mb-1">Waiting for Service in</p>
                                <CurrentDepartmentBadge ticket={ticket} />
                              </div>

                              {/* Waiting Time */}
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Clock className="h-4 w-4" />
                                <span>
                                  Waiting for payment clearance:{" "}
                                  {formatDuration(
                                    Math.floor(
                                      (Date.now() - new Date(currentDept?.timestamp || ticket.createdAt).getTime()) /
                                        1000,
                                    ),
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex items-center">
                              <Button
                                onClick={() => handleClearPayment(ticket._id)}
                                disabled={isProcessing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                              >
                                {isProcessing ? (
                                  <>
                                    <QueueSpinner size="sm" color="bg-white" dotCount={3} />
                                    <span className="ml-2">Processing...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Clear Payment
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Alert className="bg-slate-50 border-slate-100">
                  <CheckCircle2 className="h-4 w-4 text-slate-600" />
                  <AlertDescription className="text-slate-700">
                    No cash patients are currently waiting for payment clearance.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>

        <Toaster />
      </div>
    </ProtectedRoute>
  )
}

export default BillingPage
