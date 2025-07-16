"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  DollarSign,
  CreditCard,
  RefreshCw,
  Building2,
  TicketIcon as Queue,
  Settings,
  Users,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QueueSpinner } from "@/components/queue-spinner"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SessionData } from "@/lib/session"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { CashTicketsSection } from "@/components/hospital/CashTicketsSection"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"

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

// Component to display pending departments for a ticket
const PendingDepartmentsList = ({ ticket }: { ticket: Ticket }) => {
  // Check if ticket has a queue with uncleared payments
  if (ticket.departmentQueue && ticket.departmentQueue.length > 0) {
    const pendingQueueDepartments = ticket.departmentQueue.filter(
      (queueItem) => !queueItem.processed && queueItem.clearPayment !== "Cleared",
    )

    if (pendingQueueDepartments.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1 text-xs">
            <Queue className="h-3 w-3" />
            Queue: {pendingQueueDepartments.length} departments
          </Badge>
          {pendingQueueDepartments.map((dept, index) => (
            <Badge key={index} className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
              {dept.departmentName}
            </Badge>
          ))}
        </div>
      )
    }
  }

  // Fallback to checking department history
  const pendingDepartments =
    ticket.departmentHistory?.filter(
      (history) => !history.completed && history.department !== "Reception" && history.cashCleared !== "Cleared",
    ) || []

  if (pendingDepartments.length === 0) {
    return <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-xs">No Pending Departments</Badge>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {pendingDepartments.map((dept, index) => (
        <Badge key={index} className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1 text-xs">
          {dept.icon && <span className="text-sm">{dept.icon}</span>}
          <span>{dept.department}</span>
        </Badge>
      ))}
    </div>
  )
}

// Selective Department Clearing Dialog
const SelectiveClearingDialog = ({
  isOpen,
  onClose,
  ticket,
  onClear,
  isProcessing,
}: {
  isOpen: boolean
  onClose: () => void
  ticket: Ticket | null
  onClear: (selectedDepartments: string[]) => void
  isProcessing: boolean
}) => {
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])

  // Get pending departments
  const getPendingDepartments = () => {
    if (!ticket) return []

    const pending: { name: string; icon?: string; source: "queue" | "history" }[] = []

    // Check queue first
    if (ticket.departmentQueue && ticket.departmentQueue.length > 0) {
      ticket.departmentQueue.forEach((queueItem) => {
        if (!queueItem.processed && queueItem.clearPayment !== "Cleared") {
          pending.push({
            name: queueItem.departmentName,
            source: "queue",
          })
        }
      })
    }

    // Fallback to history if no queue items
    if (pending.length === 0 && ticket.departmentHistory) {
      ticket.departmentHistory.forEach((historyItem) => {
        if (!historyItem.completed && historyItem.department !== "Reception" && historyItem.cashCleared !== "Cleared") {
          pending.push({
            name: historyItem.department,
            icon: historyItem.icon,
            source: "history",
          })
        }
      })
    }

    return pending
  }

  const pendingDepartments = getPendingDepartments()

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDepartments([])
    }
  }, [isOpen])

  const handleDepartmentToggle = (departmentName: string, checked: boolean) => {
    setSelectedDepartments((prev) => {
      if (checked) {
        return [...prev, departmentName]
      } else {
        return prev.filter((name) => name !== departmentName)
      }
    })
  }

  const handleSelectAll = () => {
    setSelectedDepartments(pendingDepartments.map((dept) => dept.name))
  }

  const handleClearAll = () => {
    setSelectedDepartments([])
  }

  const handleSubmit = () => {
    if (selectedDepartments.length > 0) {
      onClear(selectedDepartments)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Select Departments to Clear
          </DialogTitle>
          <DialogDescription>
            Choose which departments you want to clear payment for ticket {ticket?.ticketNo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {pendingDepartments.length > 0 ? (
            <>
              {/* Select All/Clear All buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll} className="flex-1 bg-transparent">
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearAll} className="flex-1 bg-transparent">
                  Clear All
                </Button>
              </div>

              {/* Department list */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {pendingDepartments.map((dept, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 rounded-lg border bg-slate-50">
                    <Checkbox
                      id={`dept-${index}`}
                      checked={selectedDepartments.includes(dept.name)}
                      onCheckedChange={(checked) => handleDepartmentToggle(dept.name, checked as boolean)}
                    />
                    <label htmlFor={`dept-${index}`} className="flex items-center gap-2 cursor-pointer flex-1">
                      {dept.icon && <span className="text-lg">{dept.icon}</span>}
                      <span className="font-medium">{dept.name}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${dept.source === "queue" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                      >
                        {dept.source === "queue" ? "Queue" : "History"}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>

              {/* Selection summary */}
              {selectedDepartments.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Selected {selectedDepartments.length} of {pendingDepartments.length} departments
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedDepartments.map((name, index) => (
                      <Badge key={index} className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No departments found that need payment clearance.</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedDepartments.length === 0 || isProcessing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isProcessing ? (
              <>
                <QueueSpinner size="sm" color="bg-white" dotCount={3} />
                <span className="ml-2">Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Clear Selected ({selectedDepartments.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [pendingPaymentTickets, setPendingPaymentTickets] = useState<Ticket[]>([])
  const [cashTickets, setCashTickets] = useState<Ticket[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<SessionData | null>(null)
  const [processingTickets, setProcessingTickets] = useState<Set<string>>(new Set())
  const [selectiveDialog, setSelectiveDialog] = useState<{
    isOpen: boolean
    ticket: Ticket | null
  }>({
    isOpen: false,
    ticket: null,
  })
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

        // Check if ticket has a queue with uncleared payments
        if (ticket.departmentQueue && ticket.departmentQueue.length > 0) {
          const hasUncleared = ticket.departmentQueue.some(
            (queueItem) => !queueItem.processed && queueItem.clearPayment !== "Cleared",
          )
          if (hasUncleared) return true
        }

        // Check department history for pending payments
        // A ticket needs payment clearance if it has any non-completed department
        // (except Reception) that doesn't have cashCleared set to "Cleared"
        const hasPendingPayment = ticket.departmentHistory?.some(
          (history) => !history.completed && history.department !== "Reception" && history.cashCleared !== "Cleared",
        )

        return hasPendingPayment
      })

      // Sort by creation time (oldest first)
      pendingPaymentTickets.sort(
        (a: Ticket, b: Ticket) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )

      console.log(
        "Filtered pending payment tickets:",
        pendingPaymentTickets.map((t: { ticketNo: any; departmentHistory: any[] }) => ({
          ticketNo: t.ticketNo,
          departmentHistory: t.departmentHistory?.map((h: { department: any; completed: any; cashCleared: any }) => ({
            department: h.department,
            completed: h.completed,
            cashCleared: h.cashCleared,
          })),
        })),
      )

      setPendingPaymentTickets(pendingPaymentTickets)
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

  // Fetch all cash tickets
  const fetchCashTickets = useCallback(async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0]

      // Fetch cash tickets for today
      const response = await fetch(`/api/hospital/ticket?userType=Cash&date=${today}&completed=false`)
      if (!response.ok) throw new Error("Failed to fetch cash tickets")
      const cashData = await response.json()

      // Filter to ensure only Cash userType tickets are included
      const filteredCashTickets = cashData.filter((ticket: Ticket) => ticket.userType === "Cash")
      setCashTickets(filteredCashTickets)

      return filteredCashTickets
    } catch (error) {
      console.error("Error fetching cash tickets:", error)
      toast({
        title: "Error",
        description: "Failed to fetch cash tickets",
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

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    await Promise.all([fetchPendingPaymentTickets(), fetchCashTickets(), fetchDepartments()])
  }, [fetchPendingPaymentTickets, fetchCashTickets, fetchDepartments])

  // Clear queue payment for a ticket
  const handleClearQueuePayment = async (ticketId: string) => {
    if (processingTickets.has(ticketId)) return

    setProcessingTickets((prev) => new Set(prev).add(ticketId))

    try {
      const ticket = pendingPaymentTickets.find((t) => t._id === ticketId)
      if (!ticket) throw new Error("Ticket not found")

      const response = await fetch(`/api/hospital/ticket/${ticketId}/clear-queue-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to clear queue payment")
      }

      const result = await response.json()

      toast({
        title: "Payment Cleared",
        description: `Payment cleared for ticket ${ticket.ticketNo}. ${result.message}`,
      })

      // Refresh the tickets list
      await fetchAllData()
    } catch (error: any) {
      console.error("Error clearing queue payment:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to clear queue payment",
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

  // Clear payment for selected departments
  const handleSelectivePaymentClear = async (selectedDepartments: string[]) => {
    const ticketId = selectiveDialog.ticket?._id
    if (!ticketId || processingTickets.has(ticketId)) return

    setProcessingTickets((prev) => new Set(prev).add(ticketId))

    try {
      const ticket = selectiveDialog.ticket
      if (!ticket) throw new Error("Ticket not found")

      const response = await fetch(`/api/hospital/ticket/${ticketId}/clear-selective-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedDepartments }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to clear selective payment")
      }

      const result = await response.json()

      toast({
        title: "Payment Cleared",
        description: `Payment cleared for ticket ${ticket.ticketNo} in departments: ${result.clearedDepartments.join(", ")}`,
      })

      // Close dialog and refresh tickets
      setSelectiveDialog({ isOpen: false, ticket: null })
      await fetchAllData()
    } catch (error: any) {
      console.error("Error clearing selective payment:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to clear selective payment",
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

  // Clear payment for individual department (fallback for non-queue tickets)
  const handleClearIndividualPayment = async (ticketId: string, department: string) => {
    if (processingTickets.has(ticketId)) return

    setProcessingTickets((prev) => new Set(prev).add(ticketId))

    try {
      const ticket = pendingPaymentTickets.find((t) => t._id === ticketId)
      if (!ticket) throw new Error("Ticket not found")

      const response = await fetch(`/api/hospital/ticket/${ticketId}/clear-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to clear payment")
      }

      toast({
        title: "Payment Cleared",
        description: `Payment cleared for ticket ${ticket.ticketNo} in ${department}`,
      })

      // Refresh the tickets list
      await fetchAllData()
    } catch (error: any) {
      console.error("Error clearing individual payment:", error)
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

  // Open selective clearing dialog
  const openSelectiveDialog = (ticket: Ticket) => {
    setSelectiveDialog({ isOpen: true, ticket })
  }

  // Close selective clearing dialog
  const closeSelectiveDialog = () => {
    setSelectiveDialog({ isOpen: false, ticket: null })
  }

  // Initial data loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await fetchAllData()
      setIsLoading(false)
    }

    loadData()

    // Set up polling interval to refresh tickets every 5 seconds
    const pollingInterval = setInterval(async () => {
      console.log("Auto-refreshing billing tickets (5s interval)")
      await fetchAllData()
    }, 5000)

    // Clean up interval on component unmount
    return () => clearInterval(pollingInterval)
  }, [fetchAllData])

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
    await fetchAllData()
    setIsLoading(false)
    toast({
      title: "Refreshed",
      description: "Billing tickets have been updated",
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
          <p className="text-slate-500">Loading billing data...</p>
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
                  Manage cash patient payments and ticket processing
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-[#0e4480]/10 px-3 py-2 rounded-full flex-1 sm:flex-none">
                  <DollarSign className="h-4 w-4 text-[#0e4480]" />
                  <span className="font-medium text-[#0e4480] text-sm">{pendingPaymentTickets.length} pending</span>
                </div>
                <div className="flex items-center gap-2 bg-green-100 px-3 py-2 rounded-full flex-1 sm:flex-none">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600 text-sm">{cashTickets.length} cash</span>
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

          {/* Tabs Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 m-4 rounded-lg">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pending Payment Clearance
                  {pendingPaymentTickets.length > 0 && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 ml-1">
                      {pendingPaymentTickets.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="cash" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Cash Tickets
                  {cashTickets.length > 0 && (
                    <Badge className="bg-green-100 text-green-800 border-green-200 ml-1">{cashTickets.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="p-4 sm:p-6 pt-0">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-[#0e4480]" />
                    Pending Payment Clearance
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Cash patients waiting for payment clearance before they can be served
                  </p>
                </div>

                {pendingPaymentTickets.length > 0 ? (
                  <div className="space-y-4">
                    {pendingPaymentTickets.map((ticket) => {
                      const isProcessing = processingTickets.has(ticket._id)
                      const hasQueue = ticket.departmentQueue && ticket.departmentQueue.length > 0

                      // Count pending departments
                      let pendingCount = 0
                      if (hasQueue) {
                        pendingCount =
                          ticket.departmentQueue?.filter(
                            (queueItem) => !queueItem.processed && queueItem.clearPayment !== "Cleared",
                          ).length || 0
                      } else {
                        pendingCount =
                          ticket.departmentHistory?.filter(
                            (history) =>
                              !history.completed &&
                              history.department !== "Reception" &&
                              history.cashCleared !== "Cleared",
                          ).length || 0
                      }

                      const hasMultipleDepartments = pendingCount > 1

                      return (
                        <Card
                          key={ticket._id}
                          className="border-l-4 border-l-amber-400 bg-amber-50/30 hover:shadow-lg transition-all duration-200"
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-4">
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
                                {hasQueue && (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                                    <Queue className="h-3 w-3" />
                                    Queue ({pendingCount} pending)
                                  </Badge>
                                )}
                                {!hasQueue && hasMultipleDepartments && (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {pendingCount} Departments
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

                              {/* Pending Departments Summary */}
                              <div className="mb-3">
                                <p className="text-xs text-slate-500 font-medium mb-1">
                                  {hasQueue ? "Queue Status" : `Pending Payment Clearance (${pendingCount})`}
                                </p>
                                <PendingDepartmentsList ticket={ticket} />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-2 pt-2 border-t border-amber-200">
                                {hasMultipleDepartments ? (
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    {/* Clear All Button */}
                                    <Button
                                      onClick={() =>
                                        hasQueue
                                          ? handleClearQueuePayment(ticket._id)
                                          : handleClearIndividualPayment(
                                              ticket._id,
                                              ticket.departmentHistory?.find(
                                                (h) =>
                                                  !h.completed &&
                                                  h.department !== "Reception" &&
                                                  h.cashCleared !== "Cleared",
                                              )?.department || "",
                                            )
                                      }
                                      disabled={isProcessing}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                                    >
                                      {isProcessing ? (
                                        <>
                                          <QueueSpinner size="sm" color="bg-white" dotCount={3} />
                                          <span className="ml-2">Processing...</span>
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-4 w-4 mr-2" />
                                          Clear All ({pendingCount})
                                        </>
                                      )}
                                    </Button>

                                    {/* Selective Clear Button */}
                                    <Button
                                      onClick={() => openSelectiveDialog(ticket)}
                                      disabled={isProcessing}
                                      variant="outline"
                                      className="border-blue-300 text-blue-600 hover:bg-blue-50 flex-1 sm:flex-none"
                                    >
                                      <Settings className="h-4 w-4 mr-2" />
                                      Select Departments
                                    </Button>
                                  </div>
                                ) : (
                                  // Single department - just show clear button
                                  <Button
                                    onClick={() =>
                                      hasQueue
                                        ? handleClearQueuePayment(ticket._id)
                                        : handleClearIndividualPayment(
                                            ticket._id,
                                            ticket.departmentHistory?.find(
                                              (h) =>
                                                !h.completed &&
                                                h.department !== "Reception" &&
                                                h.cashCleared !== "Cleared",
                                            )?.department || "",
                                          )
                                    }
                                    disabled={isProcessing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
                                )}
                              </div>

                              {/* Waiting Time */}
                              <div className="flex items-center gap-2 text-sm text-slate-600 pt-2">
                                <Clock className="h-4 w-4" />
                                <span>
                                  Total waiting time:{" "}
                                  {formatDuration(
                                    Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 1000),
                                  )}
                                </span>
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
              </TabsContent>

              <TabsContent value="cash" className="p-4 sm:p-6 pt-0">
                <CashTicketsSection cashTickets={cashTickets} departments={departments} onRefresh={fetchAllData} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Selective Clearing Dialog */}
        <SelectiveClearingDialog
          isOpen={selectiveDialog.isOpen}
          onClose={closeSelectiveDialog}
          ticket={selectiveDialog.ticket}
          onClear={handleSelectivePaymentClear}
          isProcessing={processingTickets.has(selectiveDialog.ticket?._id || "")}
        />

        <Toaster />
      </div>
    </ProtectedRoute>
  )
}

export default BillingPage
