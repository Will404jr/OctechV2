"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Users,
  AlertCircle,
  Volume2,
  Clock,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  ArrowRight,
  User,
  RefreshCw,
  ArrowLeft,
  Menu,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QueueSpinner } from "@/components/queue-spinner"
import { Badge } from "@/components/ui/badge"
import type { SessionData } from "@/lib/session"
import { DepartmentSelectionDialog } from "@/components/hospital/DepartmentSelectionDialog"
import { Navbar } from "@/components/hospitalNavbar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import QueueDisplay from "@/components/hospital/QueueDisplay"

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

const ServingPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [heldTickets, setHeldTickets] = useState<Ticket[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null)
  const [departmentNote, setDepartmentNote] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<SessionData | null>(null)
  const [showNextStepDialog, setShowNextStepDialog] = useState(false)
  const [showActionsDialog, setShowActionsDialog] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isServing, setIsServing] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [roomNumber, setRoomNumber] = useState<string>("")
  const [departmentName, setDepartmentName] = useState<string>("")
  const [isLoadingNextTicket, setIsLoadingNextTicket] = useState(false)
  const autoFetchIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(true)

  const updateRoomServingTicket = async (ticketId: string | null) => {
    if (!roomId) return
    try {
      const response = await fetch(`/api/hospital/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentTicket: ticketId,
          // Do not include available field here
        }),
      })
      if (!response.ok) throw new Error("Failed to update room serving ticket")
    } catch (error) {
      console.error("Error updating room serving ticket:", error)
      toast({
        title: "Error",
        description: "Failed to update room serving ticket",
        variant: "destructive",
      })
    }
  }

  // Assign roomId to ticket's department history
  const assignRoomToTicket = async (ticketId: string) => {
    if (!roomId || !session?.department) return
    try {
      const response = await fetch(`/api/hospital/ticket/${ticketId}/assign-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: roomId,
          department: session.department,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to assign room to ticket")
      }
      console.log(`Room ${roomId} assigned to ticket ${ticketId}`)
    } catch (error) {
      console.error("Error assigning room to ticket:", error)
      toast({
        title: "Error",
        description: "Failed to assign room to ticket",
        variant: "destructive",
      })
    }
  }

  // Handle return to previous department
  const handleReturnToDepartment = async (departmentName: string, roomId?: string) => {
    if (!currentTicket || !session?.department) return

    try {
      // Find the department ID
      const department = departments.find((d) => d.title === departmentName)
      if (!department) {
        toast({
          title: "Error",
          description: "Department not found",
          variant: "destructive",
        })
        return
      }

      const departmentSelections = [
        {
          departmentId: department._id,
          roomId: roomId,
        },
      ]

      // Prepare the request body
      const requestBody: any = {
        departments: departmentSelections,
        departmentNote: departmentNote,
        note: departmentNote,
        currentDepartment: session.department,
      }

      // If the ticket is a Cash ticket, set cashCleared to "Cleared"
      if (currentTicket.userType === "Cash") {
        requestBody.cashCleared = "Cleared"
      }

      const response = await fetch(`/api/hospital/ticket/${currentTicket._id}/next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) throw new Error("Failed to return ticket to department")

      toast({
        title: "Success",
        description: `Ticket sent back to ${departmentName}${currentTicket.userType === "Cash" ? " (Payment cleared)" : ""}`,
      })

      // Clear current ticket
      setCurrentTicket(null)
      updateRoomServingTicket(null)
      setShowActionsDialog(true)

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false)
        setIsPausing(false)
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        })
      }

      // Reset form
      setDepartmentNote("")

      // Update tickets list
      await fetchTickets()
    } catch (error) {
      console.error("Error returning ticket to department:", error)
      toast({
        title: "Error",
        description: "Failed to return ticket to department",
        variant: "destructive",
      })
    }
  }

  const fetchTickets = useCallback(async () => {
    if (!session?.department || !roomId) return { regular: [], heldData: [] }

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0]

      // Fetch tickets for this department that are not yet completed
      const response = await fetch(
        `/api/hospital/ticket?date=${today}&department=${session.department}&completed=false`,
      )
      if (!response.ok) throw new Error("Failed to fetch tickets")
      const data = await response.json()

      // Fetch held tickets for this department and room
      const heldResponse = await fetch(
        `/api/hospital/ticket?held=true&date=${today}&department=${session.department}&completed=false`,
      )
      if (!heldResponse.ok) throw new Error("Failed to fetch held tickets")
      const heldData = await heldResponse.json()

      // Filter held tickets to only show those assigned to this room
      const filteredHeldTickets = heldData.filter((ticket: Ticket) => {
        const currentDeptHistory = ticket.departmentHistory?.find(
          (history) => !history.completed && history.department === session.department,
        )
        // If no roomId in history, show in all rooms (for backward compatibility)
        // If roomId exists, only show in matching room
        return !currentDeptHistory?.roomId || currentDeptHistory.roomId === roomId
      })

      setHeldTickets(filteredHeldTickets)

      // Filter regular tickets to only show those assigned to this room
      const filteredRegularTickets = data.filter((ticket: Ticket) => {
        if (ticket.held) return false // Exclude held tickets from regular list

        const currentDeptHistory = ticket.departmentHistory?.find(
          (history) => !history.completed && history.department === session.department,
        )
        // If no roomId in history, show in all rooms (for backward compatibility)
        // If roomId exists, only show in matching room
        return !currentDeptHistory?.roomId || currentDeptHistory.roomId === roomId
      })

      // Filter out current ticket if it exists
      const finalFilteredTickets = currentTicket
        ? filteredRegularTickets.filter((ticket: { _id: string }) => ticket._id !== currentTicket._id)
        : filteredRegularTickets

      setTickets(finalFilteredTickets)
      return { regular: filteredRegularTickets, heldData: filteredHeldTickets }
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      })
      return { regular: [], heldData: [] }
    }
  }, [toast, currentTicket, session?.department, roomId])

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

  const fetchNextTicket = async () => {
    if (currentTicket) {
      toast({
        title: "Warning",
        description: "Please complete the current ticket before fetching the next one",
        variant: "destructive",
      })
      return
    }

    setIsLoadingNextTicket(true)
    try {
      const { regular } = await fetchTickets()

      // Filter tickets to only include those that are ready for this department and room
      const readyTickets = regular.filter((ticket: Ticket) => {
        // Check if the ticket's current department matches this department
        const currentDeptHistory = ticket.departmentHistory?.find(
          (history) => !history.completed && history.department === session?.department,
        )
        if (!currentDeptHistory) return false

        // For cash tickets, check if payment has been cleared
        if (ticket.userType === "Cash" && session?.department !== "Reception") {
          if (currentDeptHistory.cashCleared !== "Cleared") {
            return false // Skip this ticket - payment not cleared
          }
        }

        // If no roomId in history, show in all rooms (for backward compatibility)
        // If no roomId in history, show in all rooms (for backward compatibility)
        // If roomId exists, only show in matching room
        return !currentDeptHistory.roomId || currentDeptHistory.roomId === roomId
      })

      if (readyTickets.length > 0) {
        // Sort tickets: emergency tickets first, then by creation time
        const sortedTickets = readyTickets.sort((a: Ticket, b: Ticket) => {
          // Emergency tickets get priority
          if (a.emergency && !b.emergency) return -1
          if (!a.emergency && b.emergency) return 1
          // If both are emergency or both are not emergency, sort by creation time
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })

        const nextTicket = sortedTickets[0]
        // First, assign the roomId to the ticket's department history
        await assignRoomToTicket(nextTicket._id)
        // Then update the current ticket and room
        setCurrentTicket(nextTicket)
        updateRoomServingTicket(nextTicket._id)
        // Update tickets list without the new current ticket
        setTickets(regular.filter((ticket: { _id: any }) => ticket._id !== nextTicket._id))

        // Set the department note from the ticket if it exists
        if (nextTicket.departmentNote) {
          setDepartmentNote(nextTicket.departmentNote)
        } else {
          setDepartmentNote("")
        }

        toast({
          title: "Success",
          description: `Ticket ${nextTicket.ticketNo}${nextTicket.emergency ? " (EMERGENCY)" : ""} is now being served`,
        })
      } else {
        toast({
          title: "No Tickets",
          description: "There are no tickets waiting to be served",
        })
      }
    } catch (error) {
      console.error("Error fetching next ticket:", error)
      toast({
        title: "Error",
        description: "Failed to fetch next ticket",
        variant: "destructive",
      })
    } finally {
      setIsLoadingNextTicket(false)
    }
  }

  const handleNextStep = async (departments?: Array<{ departmentId: string; roomId?: string }>) => {
    if (!currentTicket || !session?.department) return

    // Check if ticket has a department queue and we should auto-progress
    if (
      !departments &&
      currentTicket.departmentQueue &&
      currentTicket.departmentQueue.length > 0 &&
      !isAtLastDepartmentInQueue(currentTicket)
    ) {
      try {
        // Use the queue progression endpoint
        const response = await fetch(`/api/hospital/ticket/${currentTicket._id}/next-step`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentDepartment: session.department,
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

        // Clear current ticket and continue with cleanup
        setCurrentTicket(null)
        updateRoomServingTicket(null)
        setShowActionsDialog(true)

        // Check if we were in the process of pausing
        if (isPausing) {
          setIsServing(false)
          setIsPausing(false)
          toast({
            title: "Paused",
            description: "Serving has been paused",
            variant: "default",
          })
        }

        // Reset form
        setDepartmentNote("")

        // Update tickets list
        await fetchTickets()
        return
      } catch (error) {
        console.error("Error progressing in queue:", error)
        toast({
          title: "Error",
          description: "Failed to progress in queue",
          variant: "destructive",
        })
        return
      }
    }

    // If no departments provided, open the dialog for manual selection
    if (!departments) {
      setShowNextStepDialog(true)
      return
    }

    try {
      // Regular next step with new department selection
      const response = await fetch(`/api/hospital/ticket/${currentTicket._id}/next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departments: departments,
          departmentNote: departmentNote,
          note: departmentNote,
          currentDepartment: session.department,
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

      // Clear current ticket
      setCurrentTicket(null)
      updateRoomServingTicket(null)
      setShowActionsDialog(true)

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false)
        setIsPausing(false)
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        })
      }

      // Reset form
      setDepartmentNote("")
      setShowNextStepDialog(false)

      // Update tickets list
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

  useEffect(() => {
    const fetchSession = async () => {
      const response = await fetch("/api/session")
      if (response.ok) {
        const sessionData: SessionData = await response.json()
        setSession(sessionData)
        if (sessionData.roomId) {
          setRoomId(sessionData.roomId)
          setDepartmentName(sessionData.department || "")
        }
      }
    }
    fetchSession()
  }, [])

  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (roomId) {
        try {
          const response = await fetch(`/api/hospital/room/${roomId}`)
          if (response.ok) {
            const room = await response.json()
            setRoomNumber(room.roomNumber)
            // Set isServing based on the room's availability status
            setIsServing(room.available)
            // If room is available and has a current ticket, set it
            if (room.available && room.currentTicket) {
              const ticketResponse = await fetch(`/api/hospital/ticket/${room.currentTicket}`)
              if (ticketResponse.ok) {
                const ticketData = await ticketResponse.json()
                setCurrentTicket(ticketData)
                // Set the department note from the ticket if it exists
                if (ticketData.departmentNote) {
                  setDepartmentNote(ticketData.departmentNote)
                }
              }
            }
          }
        } catch (error) {
          console.error("Error fetching room details:", error)
        }
      }
    }
    fetchRoomDetails()
  }, [roomId])

  // Update the useEffect that handles auto-fetching
  useEffect(() => {
    // Disable auto-fetch when dialog is open
    if (showActionsDialog || showNextStepDialog) {
      setAutoFetchEnabled(false)
    } else {
      setAutoFetchEnabled(true)
    }
  }, [showActionsDialog, showNextStepDialog])

  // Separate useEffect for the actual auto-fetch functionality
  useEffect(() => {
    // Clear any existing interval
    if (autoFetchIntervalRef.current) {
      clearInterval(autoFetchIntervalRef.current)
      autoFetchIntervalRef.current = null
    }

    // Only set up the interval if we're serving and auto-fetch is enabled
    if (isServing && autoFetchEnabled) {
      console.log("Setting up auto-fetch interval. Auto-fetch enabled:", autoFetchEnabled)
      autoFetchIntervalRef.current = setInterval(async () => {
        // Double-check all conditions before proceeding
        if (
          isServing &&
          !currentTicket &&
          !isLoadingNextTicket &&
          autoFetchEnabled &&
          !showActionsDialog &&
          !showNextStepDialog
        ) {
          console.log("Auto-checking for next ticket...")
          try {
            // Check if there are tickets waiting
            const { regular } = await fetchTickets()

            // Only fetch tickets that are actually ready to be served in this department and room
            const readyTickets = regular.filter((ticket: Ticket) => {
              // Check if the ticket's current department matches this department
              const currentDeptHistory = ticket.departmentHistory?.find(
                (history) => !history.completed && history.department === session?.department,
              )
              if (!currentDeptHistory) return false

              // For cash tickets, check if payment has been cleared
              if (ticket.userType === "Cash" && session?.department !== "Reception") {
                if (currentDeptHistory.cashCleared !== "Cleared") {
                  return false // Skip this ticket - payment not cleared
                }
              }

              // If no roomId in history, show in all rooms (for backward compatibility)
              // If no roomId in history, show in all rooms (for backward compatibility)
              // If roomId exists, only show in matching room
              return !currentDeptHistory.roomId || currentDeptHistory.roomId === roomId
            })

            // Sort tickets: emergency tickets first
            const sortedTickets = readyTickets.sort((a: Ticket, b: Ticket) => {
              if (a.emergency && !b.emergency) return -1
              if (!a.emergency && b.emergency) return 1
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            })

            if (sortedTickets.length > 0) {
              console.log("Auto-fetching next ticket...")
              await fetchNextTicket()
            }
          } catch (error) {
            console.error("Error in auto-fetch:", error)
          }
        }
      }, 5000) // Check every 5 seconds
    }

    // Clean up on unmount or when dependencies change
    return () => {
      if (autoFetchIntervalRef.current) {
        clearInterval(autoFetchIntervalRef.current)
        autoFetchIntervalRef.current = null
      }
    }
  }, [
    isServing,
    currentTicket,
    isLoadingNextTicket,
    autoFetchEnabled,
    fetchTickets,
    showActionsDialog,
    showNextStepDialog,
    session?.department,
    roomId,
  ])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchTickets(), fetchDepartments()])
      setIsLoading(false)
    }
    loadData()

    // Set up polling interval to refresh tickets every 60 seconds
    const pollingInterval = setInterval(async () => {
      console.log("Auto-refreshing tickets (60s interval)")
      await fetchTickets()
    }, 60000) // 60 seconds

    // Clean up interval on component unmount
    return () => clearInterval(pollingInterval)
  }, [fetchTickets, fetchDepartments])

  useEffect(() => {
    if (session && session.department === "Reception") {
      router.push("/hospital/receptionist")
    }
  }, [session, router])

  const startServing = async () => {
    if (!roomId) return
    try {
      // Update room availability to true when starting to serve
      const response = await fetch(`/api/hospital/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          available: true,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update room availability")
      }

      setIsServing(true)
      // Automatically fetch the next ticket
      await fetchNextTicket()
      toast({
        title: "Serving Started",
        description: "You are now available to serve tickets.",
      })
    } catch (error) {
      console.error("Error starting serving:", error)
      toast({
        title: "Error",
        description: "Failed to start serving",
        variant: "destructive",
      })
      setIsServing(false)
    }
  }

  const pauseServing = async () => {
    if (currentTicket) {
      setIsPausing(true)
      toast({
        title: "Pausing",
        description: "Please complete or hold the current ticket before pausing",
        variant: "default",
      })
      return
    }

    try {
      // Update room availability to false when pausing
      const response = await fetch(`/api/hospital/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          available: false,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update room availability")
      }

      setIsServing(false)
      setIsPausing(false)
      setCurrentTicket(null)
      updateRoomServingTicket(null)
      toast({
        title: "Paused",
        description: "Serving has been paused and you are now unavailable",
        variant: "default",
      })
    } catch (error) {
      console.error("Error pausing serving:", error)
      toast({
        title: "Error",
        description: "Failed to pause serving",
        variant: "destructive",
      })
    }
  }

  const handleClearTicket = async () => {
    if (!currentTicket || !session?.department) return

    try {
      const response = await fetch(`/api/hospital/ticket/${currentTicket._id}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentNote: departmentNote,
          note: departmentNote, // Add this line
          currentDepartment: session.department,
          roomId,
        }),
      })

      if (!response.ok) throw new Error("Failed to clear ticket")

      toast({
        title: "Success",
        description: "Ticket cleared successfully",
      })

      // Clear current ticket
      setCurrentTicket(null)
      updateRoomServingTicket(null)
      setShowActionsDialog(true)

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false)
        setIsPausing(false)
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        })
      }

      // Reset form
      setDepartmentNote("")

      // Update tickets list
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
    if (!currentTicket || !session?.department) return

    try {
      const response = await fetch(`/api/hospital/ticket/${currentTicket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          held: true,
          departmentNote: departmentNote,
          note: departmentNote, // Add this line
          currentDepartment: session.department,
          roomId,
        }),
      })

      if (!response.ok) throw new Error("Failed to hold ticket")

      toast({
        title: "Success",
        description: "Ticket placed on hold",
      })

      // Clear current ticket
      setCurrentTicket(null)
      updateRoomServingTicket(null)
      setShowActionsDialog(true)

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false)
        setIsPausing(false)
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        })
      }

      // Reset form
      setDepartmentNote("")

      // Update tickets list
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
    if (!session?.department) return

    try {
      // First, update the ticket to remove the held status
      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          held: false,
          currentDepartment: session.department,
          roomId: roomId, // Include roomId when unholding a ticket
        }),
      })

      if (!response.ok) throw new Error("Failed to unhold ticket")

      // Get the updated ticket data
      const updatedTicket = await response.json()

      // If there's already a current ticket, show a warning
      if (currentTicket) {
        toast({
          title: "Warning",
          description: "Please complete the current ticket first",
          variant: "destructive",
        })
        return
      }

      // Assign the roomId to the ticket's department history
      await assignRoomToTicket(ticketId)

      // Set the unheld ticket as the current ticket
      setCurrentTicket(updatedTicket)

      // Update the room to show it's serving this ticket
      updateRoomServingTicket(ticketId)

      // Set the department note from the ticket if it exists
      if (updatedTicket.departmentNote) {
        setDepartmentNote(updatedTicket.departmentNote)
      } else {
        setDepartmentNote("")
      }

      toast({
        title: "Success",
        description: "Ticket is now being served",
      })

      // Update tickets list
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

  const cancelTicket = async () => {
    if (!currentTicket || !session?.department) return

    try {
      const response = await fetch(`/api/hospital/ticket/${currentTicket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noShow: true,
          departmentNote: departmentNote,
          note: departmentNote, // Add this line
        }),
      })

      if (!response.ok) throw new Error("Failed to cancel ticket")

      toast({
        title: "Success",
        description: "Ticket cancelled successfully",
      })

      // Clear current ticket
      setCurrentTicket(null)
      updateRoomServingTicket(null)
      setShowActionsDialog(true)

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false)
        setIsPausing(false)
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        })
      }

      // Reset form
      setDepartmentNote("")

      // Update tickets list
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

  const callTicket = async () => {
    if (!currentTicket) return

    try {
      const response = await fetch(`/api/hospital/ticket/${currentTicket._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call: true }),
      })

      if (!response.ok) throw new Error("Failed to call ticket")

      const updatedTicket = await response.json()
      setCurrentTicket({ ...currentTicket, ...updatedTicket })

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

  if (!session || session.department === "Reception") {
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
    <>
      <Navbar staffId={session?.userId || ""} />
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
        <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header Section */}
          <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mb-1 bg-gradient-to-r from-[#0e4480] to-blue-600 bg-clip-text text-transparent">
                  {departmentName} Dashboard
                </h1>
                <p className="text-slate-500 text-sm sm:text-base">
                  Managing {departmentName} in {roomNumber ? `Room ${roomNumber}` : "..."}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-[#0e4480]/10 px-3 py-2 rounded-full flex-1 sm:flex-none">
                  <Users className="h-4 w-4 text-[#0e4480]" />
                  <span className="font-medium text-[#0e4480] text-sm">{tickets.length} waiting</span>
                </div>
                <Badge
                  className={`px-3 py-1 ${
                    isServing
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-red-100 text-red-800 border-red-200"
                  }`}
                >
                  {isServing ? "Available" : "Unavailable"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshTickets}
                  className="flex items-center gap-2 shrink-0 bg-transparent"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button
                  onClick={() => setShowActionsDialog(true)}
                  className="bg-[#0e4480] hover:bg-blue-800 text-white gap-2 shrink-0"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Control Panel</span>
                </Button>
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-transparent shrink-0">
                      <Menu className="h-4 w-4" />
                      <span className="hidden sm:inline">View Queues</span>
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[90vh]">
                    <DrawerHeader>
                      <DrawerTitle>Department Queues</DrawerTitle>
                      <DrawerDescription>Real-time view of all department and room queues</DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 pb-4 overflow-y-auto">
                      <QueueDisplay />
                    </div>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </div>
            </div>
          </div>

          {/* Main Content - Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Current Ticket Section */}
            <Card className="border-none shadow-lg overflow-hidden h-full bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-[#0e4480] to-blue-600 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Clock className="h-5 w-5" />
                  Current Ticket
                </CardTitle>
                <CardDescription className="text-blue-100 text-sm sm:text-base">
                  {currentTicket
                    ? `Serving ${currentTicket.patientName || "Patient"} - ${currentTicket.ticketNo}`
                    : "No active ticket"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 bg-white">
                {currentTicket ? (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                        <Badge className="bg-[#0e4480] text-white text-base sm:text-lg px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg">
                          {currentTicket.ticketNo}
                        </Badge>
                        {currentTicket.emergency && (
                          <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse text-xs sm:text-sm">
                            🚨 EMERGENCY
                          </Badge>
                        )}
                        {currentTicket.call && (
                          <Badge className="bg-emerald-100 text-emerald-700 px-3 sm:px-4 py-1 text-xs sm:text-sm">
                            Called
                          </Badge>
                        )}
                        {currentTicket.userType && (
                          <Badge className="bg-blue-100 text-blue-800 px-3 sm:px-4 py-1 text-xs sm:text-sm">
                            {currentTicket.userType}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={currentTicket.emergency ? "destructive" : "outline"}
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/hospital/ticket/${currentTicket._id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  emergency: !currentTicket.emergency,
                                  currentDepartment: session?.department,
                                }),
                              })
                              if (!response.ok) throw new Error("Failed to update emergency status")
                              setCurrentTicket({
                                ...currentTicket,
                                emergency: !currentTicket.emergency,
                              })
                              toast({
                                title: "Success",
                                description: `Ticket ${
                                  currentTicket.emergency ? "removed from" : "marked as"
                                } emergency`,
                              })
                            } catch (error) {
                              console.error("Error updating emergency status:", error)
                              toast({
                                title: "Error",
                                description: "Failed to update emergency status",
                                variant: "destructive",
                              })
                            }
                          }}
                          className={`text-xs sm:text-sm ${
                            currentTicket.emergency
                              ? "bg-red-600 hover:bg-red-700"
                              : "border-red-300 text-red-600 hover:bg-red-50"
                          }`}
                        >
                          {currentTicket.emergency ? "🚨 Remove Emergency" : "🚨 Mark Emergency"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={callTicket}
                          disabled={currentTicket.call}
                          className="border-[#0e4480] text-[#0e4480] hover:bg-blue-50 bg-transparent"
                        >
                          <Volume2 className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Call</span>
                        </Button>
                      </div>
                    </div>

                    {/* Patient Information */}
                    {(currentTicket.patientName || currentTicket.reasonforVisit) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentTicket.patientName && (
                          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                            <h3 className="font-semibold text-sm sm:text-base mb-2 text-blue-800">Patient Name</h3>
                            <p className="text-slate-700 text-sm sm:text-base">{currentTicket.patientName}</p>
                          </div>
                        )}
                        {currentTicket.reasonforVisit && (
                          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                            <h3 className="font-semibold text-sm sm:text-base mb-2 text-blue-800">Reason for Visit</h3>
                            <p className="text-slate-700 text-sm sm:text-base">{currentTicket.reasonforVisit}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ticket Journey */}
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                      <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4 text-blue-800">Ticket Journey</h3>
                      <div className="space-y-2 sm:space-y-3">
                        {currentTicket.departmentHistory?.map((history, index) => (
                          <div
                            key={index}
                            className="p-3 sm:p-4 rounded-lg border bg-gradient-to-r from-blue-50/50 to-green-50/50"
                          >
                            <div className="flex flex-col sm:flex-row sm:justify-between mb-2 gap-1 sm:gap-2">
                              <span className="font-medium flex items-center text-sm sm:text-base">
                                {history.icon && <span className="mr-2 text-base sm:text-lg">{history.icon}</span>}
                                {history.department}
                                {history.completed && (
                                  <Badge className="ml-2 bg-green-100 text-green-800 border-green-200 text-xs">
                                    Completed
                                  </Badge>
                                )}
                                {!history.completed && (
                                  <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                    Active
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
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm text-blue-600">
                                  {new Date(history.timestamp).toLocaleString()}
                                </span>
                                {history.completed && !hasRemainingQueueDepartments(currentTicket) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReturnToDepartment(history.department, history.roomId)}
                                    className="border-blue-300 text-blue-600 hover:bg-blue-50 text-xs"
                                  >
                                    <ArrowLeft className="h-3 w-3 mr-1" />
                                    Send back
                                  </Button>
                                )}
                              </div>
                            </div>
                            {history.note && (
                              <div className="mt-3 p-2 sm:p-3 bg-white rounded-md text-xs sm:text-sm border border-slate-100">
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
                        className="h-24 sm:h-32 border-slate-300 focus:ring-[#0e4480] text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <Alert className="bg-blue-50 border-blue-100 text-[#0e4480]">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm sm:text-base">
                      {isServing
                        ? "No ticket currently being served. Click 'Next Ticket' to get the next ticket in queue."
                        : "Click 'Start Serving' to begin serving tickets"}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              {currentTicket && (
                <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {/* Hold Ticket Button */}
                    <Button
                      variant="outline"
                      onClick={handleHoldTicket}
                      className="border-amber-400 text-amber-600 hover:bg-amber-50 text-sm bg-transparent"
                    >
                      <PauseCircle className="h-4 w-4 mr-2" />
                      Hold Ticket
                    </Button>

                    {/* Cancel Ticket Button */}
                    <Button
                      variant="outline"
                      onClick={cancelTicket}
                      className="border-red-400 text-red-600 hover:bg-red-50 text-sm bg-transparent"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Cancel Ticket
                    </Button>

                    {/* Next Step Button */}
                    <Button
                      onClick={() => handleNextStep()}
                      className="bg-[#0e4480] hover:bg-blue-800 text-white text-sm"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {currentTicket.departmentQueue && currentTicket.departmentQueue.length > 0
                        ? isAtLastDepartmentInQueue(currentTicket)
                          ? "Next Step"
                          : "Next in Queue"
                        : "Next Step"}
                    </Button>

                    {/* Clear Ticket Button */}
                    <Button
                      onClick={handleClearTicket}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Clear Ticket
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>

            {/* Held Tickets Section */}
            <Card className="border-none shadow-lg overflow-hidden h-full bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <PauseCircle className="h-5 w-5" />
                  Held Tickets
                </CardTitle>
                <CardDescription className="text-green-100 text-sm sm:text-base">
                  {heldTickets.length} ticket{heldTickets.length !== 1 ? "s" : ""} on hold
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 bg-white overflow-auto max-h-[400px] sm:max-h-[600px]">
                {heldTickets.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {heldTickets.map((ticket) => (
                      <Card key={ticket._id} className="border-l-4 border-l-green-400 bg-green-50/30 shadow-sm">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row justify-between gap-3">
                            <div className="flex-1">
                              <h3 className="font-semibold mb-1 text-[#0e4480] text-sm sm:text-base">
                                {ticket.ticketNo}
                              </h3>
                              {ticket.patientName && (
                                <p className="text-xs sm:text-sm font-medium text-slate-700 mb-1">
                                  Patient: {ticket.patientName}
                                </p>
                              )}
                              {ticket.reasonforVisit && (
                                <p className="text-xs sm:text-sm text-slate-600 mb-2">{ticket.reasonforVisit}</p>
                              )}
                              {ticket.departmentNote && (
                                <div className="mt-2 p-2 sm:p-3 bg-white rounded-md text-xs sm:text-sm border border-green-100">
                                  <p className="font-medium mb-1 text-slate-700">Notes:</p>
                                  <p className="text-slate-600">{ticket.departmentNote}</p>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnholdTicket(ticket._id)}
                              className="text-green-600 border-green-300 hover:bg-green-50 shrink-0 text-xs sm:text-sm"
                            >
                              <PlayCircle className="h-4 w-4 mr-1 sm:mr-2" />
                              Return to Queue
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 sm:h-64 text-slate-400">
                    <PauseCircle className="h-8 sm:h-12 w-8 sm:w-12 mb-2 sm:mb-4 opacity-30" />
                    <p className="text-sm sm:text-base">No tickets are currently on hold</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department Selection Dialog */}
          <DepartmentSelectionDialog
            isOpen={showNextStepDialog}
            onClose={() => setShowNextStepDialog(false)}
            onSubmit={handleNextStep}
            departments={departments}
            currentDepartment={session?.department}
            currentDepartmentId={departments.find((d) => d.title === session?.department)?._id}
            currentRoomId={roomId || undefined}
          />

          {/* Control Panel Dialog */}
          <Dialog
            open={showActionsDialog}
            onOpenChange={(open) => {
              setShowActionsDialog(open)
              setAutoFetchEnabled(!open) // Explicitly disable auto-fetch when dialog opens
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{departmentName} Control Panel</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Primary Actions */}
                <div className="flex flex-col gap-3">
                  {isServing ? (
                    <>
                      <Button
                        onClick={pauseServing}
                        variant="outline"
                        className="border-red-300 hover:bg-red-50 text-red-600 gap-2 w-full bg-transparent"
                        disabled={isPausing}
                      >
                        <PauseCircle className="h-4 w-4" />
                        {isPausing ? "Complete Current Ticket to Pause" : "Pause Serving"}
                      </Button>
                      <Button
                        onClick={() => {
                          fetchNextTicket()
                          setShowActionsDialog(false)
                        }}
                        disabled={isLoadingNextTicket}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full"
                      >
                        {isLoadingNextTicket ? (
                          <>
                            <QueueSpinner size="sm" color="bg-white" dotCount={3} />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4" />
                            Next Ticket
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        startServing()
                        setShowActionsDialog(false)
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Start Serving
                    </Button>
                  )}
                </div>

                {/* Held Tickets Section */}
                {heldTickets.length > 0 && (
                  <>
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-2 text-sm text-gray-500">Held Tickets</span>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {heldTickets.map((ticket) => (
                        <div key={ticket._id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-sm">{ticket.ticketNo}</span>
                            {ticket.patientName && (
                              <p className="text-xs text-gray-700 truncate">Patient: {ticket.patientName}</p>
                            )}
                            {ticket.reasonforVisit && (
                              <p className="text-xs text-muted-foreground truncate">{ticket.reasonforVisit}</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleUnholdTicket(ticket._id)
                              setShowActionsDialog(false)
                            }}
                            className="text-green-600 border-green-300 hover:bg-green-50 ml-2 shrink-0"
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Return</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Toaster />
        </div>
      </div>
    </>
  )
}

export default ServingPage
