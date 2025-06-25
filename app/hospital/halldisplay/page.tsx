"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { User, Volume2, VolumeX, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Marquee } from "@/components/Marquee"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface Ticket {
  _id: string
  ticketNo: string
  patientName?: string
  journeyId?: {
    _id: string
    name: string
    steps: { title: string; icon: string }[]
  } | null
  currentStep?: number
  journeySteps?: { [key: string]: boolean }
  completed?: boolean
  call?: boolean
  held?: boolean
  emergency?: boolean
  departmentHistory?: {
    department: string
    icon?: string
    timestamp: string
    note?: string
    completed?: boolean
    roomId?: string
    startedAt?: string | null
    actuallyStarted?: boolean
    cashCleared?: "Cleared" | "Pending" | "Rejected"
  }[]
  createdAt: string
  updatedAt: string
  userType?: string
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
  currentTicket: string | null
}

interface Department {
  _id: string
  title: string
  icon: string
  rooms: Room[]
}

interface ActiveTicket {
  ticketId: string
  ticketNo: string
  department: string
  departmentIcon: string
  roomNumber: string
  call: boolean
}

interface WaitingTicket {
  ticketId: string
  ticketNo: string
  patientName?: string
  department: string
  departmentIcon: string
  waitingTime: number
  emergency?: boolean
  held?: boolean
  position: number
}

interface HeldTicket {
  ticketId: string
  ticketNo: string
  department: string
  departmentIcon: string
  roomNumber?: string
  heldTime: number
}

interface Event {
  _id: string
  title: string
  date: string
}

interface Ad {
  _id: string
  name: string
  image: string
}

interface Settings {
  notificationText: string
}

interface AudioCacheStatus {
  isLoading: boolean
  loadedCount: number
  totalCount: number
  failedFiles: string[]
}

export default function HallDisplay() {
  const [isMuted, setIsMuted] = useState(false)
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>([])
  const [waitingTickets, setWaitingTickets] = useState<WaitingTicket[]>([])
  const [heldTickets, setHeldTickets] = useState<HeldTicket[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)
  const [isTestingAudio, setIsTestingAudio] = useState(false)
  const [alert, setAlert] = useState<{ message: string; isVisible: boolean }>({
    message: "",
    isVisible: false,
  })
  const [departments, setDepartments] = useState<Department[]>([])
  const [audioCacheStatus, setAudioCacheStatus] = useState<AudioCacheStatus>({
    isLoading: false,
    loadedCount: 0,
    totalCount: 0,
    failedFiles: [],
  })

  const isPlaying = useRef(false)
  const audioContext = useRef<AudioContext | null>(null)
  const announcedTickets = useRef<Set<string>>(new Set())
  const announcementQueue = useRef<ActiveTicket[]>([])
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map())
  const { toast } = useToast()

  // Define all possible audio files that need to be preloaded
  const getAudioFilesToPreload = useCallback(() => {
    if (departments.length === 0) {
      return []
    }

    const baseFiles = ["alert.mp3", "TicketNumber.mp3", "proceedto.mp3"]
    const characters = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789").map((char) => `${char}.mp3`)
    const departmentFiles = departments.map(
      (dept) => `${dept.title.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}.mp3`,
    )

    return [...baseFiles, ...characters, ...departmentFiles]
  }, [departments])

  // Preload audio files with progress tracking
  const preloadAudioFiles = useCallback(async () => {
    if (audioCacheStatus.isLoading) {
      return
    }

    if (audioCacheStatus.loadedCount > 0 && audioCacheStatus.totalCount > 0) {
      return
    }

    const audioFiles = getAudioFilesToPreload()

    if (audioFiles.length === 0) {
      return
    }

    setAudioCacheStatus({
      isLoading: true,
      loadedCount: 0,
      totalCount: audioFiles.length,
      failedFiles: [],
    })

    const loadPromises = audioFiles.map(async (filename) => {
      try {
        const audio = new Audio(`/hospitalAudio/${filename}`)
        audio.preload = "auto"
        audio.volume = 1.0

        return new Promise<{ success: boolean; filename: string }>((resolve) => {
          const timeout = setTimeout(() => {
            resolve({ success: false, filename })
          }, 10000)

          audio.oncanplaythrough = () => {
            clearTimeout(timeout)
            audioCache.current.set(filename, audio)

            setAudioCacheStatus((prev) => ({
              ...prev,
              loadedCount: prev.loadedCount + 1,
            }))

            resolve({ success: true, filename })
          }

          audio.onerror = () => {
            clearTimeout(timeout)
            resolve({ success: false, filename })
          }

          audio.onabort = () => {
            clearTimeout(timeout)
            resolve({ success: false, filename })
          }

          audio.load()
        })
      } catch (error) {
        return { success: false, filename }
      }
    })

    try {
      const results = await Promise.allSettled(loadPromises)
      const failedFiles: string[] = []
      let successCount = 0

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            successCount++
          } else {
            failedFiles.push(result.value.filename)
          }
        } else {
          failedFiles.push(audioFiles[index])
        }
      })

      setAudioCacheStatus({
        isLoading: false,
        loadedCount: successCount,
        totalCount: audioFiles.length,
        failedFiles,
      })

      if (failedFiles.length > 0) {
        toast({
          title: "Audio Loading Warning",
          description: `${failedFiles.length} audio files failed to load.`,
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      setAudioCacheStatus((prev) => ({
        ...prev,
        isLoading: false,
      }))
    }
  }, [
    getAudioFilesToPreload,
    toast,
    audioCacheStatus.isLoading,
    audioCacheStatus.loadedCount,
    audioCacheStatus.totalCount,
  ])

  // Optimized audio playback using cached files
  const playAudioOptimized = useCallback(
    async (filename: string): Promise<void> => {
      if (isMuted) {
        return Promise.resolve()
      }

      const cachedAudio = audioCache.current.get(filename)
      if (!cachedAudio) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        try {
          const audio = cachedAudio.cloneNode() as HTMLAudioElement
          audio.volume = 1.0

          const timeout = setTimeout(() => {
            resolve()
          }, 5000)

          audio.onended = () => {
            clearTimeout(timeout)
            resolve()
          }

          audio.onerror = () => {
            clearTimeout(timeout)
            resolve()
          }

          audio.currentTime = 0
          const playPromise = audio.play()

          if (playPromise) {
            playPromise.catch(() => {
              clearTimeout(timeout)
              resolve()
            })
          }
        } catch (error) {
          resolve()
        }
      })
    },
    [isMuted],
  )

  const initializeAudioContext = () => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      if (audioContext.current.state === "suspended") {
        audioContext.current.resume()
      }

      setIsAudioInitialized(true)
      return true
    } catch (error) {
      return false
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    localStorage.setItem("hallDisplayMuted", (!isMuted).toString())
  }

  const playTestSound = async () => {
    if (audioCacheStatus.isLoading) {
      toast({
        title: "Audio Still Loading",
        description: "Please wait for audio files to finish loading",
        variant: "destructive",
      })
      return
    }

    setIsTestingAudio(true)
    try {
      const initialized = initializeAudioContext()
      if (!initialized) {
        throw new Error("Could not initialize audio context")
      }

      await playAudioOptimized("alert.mp3")
      toast({
        title: "Audio Test",
        description: "If you heard a sound, audio is working correctly",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Audio Test Failed",
        description: "Could not play test sound.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsTestingAudio(false)
    }
  }

  const announceTicket = useCallback(
    async (ticket: ActiveTicket) => {
      if (isMuted) {
        return
      }

      if (audioCacheStatus.isLoading) {
        return
      }

      if (isPlaying.current) {
        if (!announcementQueue.current.some((t) => t.ticketId === ticket.ticketId)) {
          announcementQueue.current.push(ticket)
        }
        return
      }

      isPlaying.current = true

      const ticketNumber = ticket.ticketNo
      const department = ticket.department
      const roomNumber = ticket.roomNumber

      setAlert({
        message: `Ticket ${ticketNumber} - Please proceed to ${department} Room ${roomNumber}`,
        isVisible: true,
      })

      setTimeout(() => setAlert({ message: "", isVisible: false }), 5000)

      try {
        if (!isAudioInitialized) {
          const initialized = initializeAudioContext()
          if (!initialized) {
            throw new Error("Could not initialize audio context")
          }
        }

        await playAudioOptimized("alert.mp3")
        await playAudioOptimized("TicketNumber.mp3")

        for (const char of ticketNumber.split("")) {
          await playAudioOptimized(`${char}.mp3`)
        }

        await playAudioOptimized("proceedto.mp3")

        const departmentFile = `${department.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}.mp3`
        await playAudioOptimized(departmentFile)

        for (const char of roomNumber.split("")) {
          await playAudioOptimized(`${char}.mp3`)
        }
      } catch (error) {
        console.error("Error during announcement:", error)
      } finally {
        isPlaying.current = false
        announcedTickets.current.add(ticket.ticketId)

        if (ticket.call) {
          try {
            await fetch(`/api/hospital/ticket/${ticket.ticketId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ call: false }),
            })
          } catch (error) {
            console.error("Error updating ticket call status:", error)
          }
        }

        if (announcementQueue.current.length > 0) {
          const nextTicket = announcementQueue.current.shift()
          if (nextTicket) {
            setTimeout(() => announceTicket(nextTicket), 500)
          }
        }
      }
    },
    [playAudioOptimized, isMuted, isAudioInitialized, audioCacheStatus.isLoading],
  )

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch("/api/hospital/department")
      if (response.ok) {
        const data: Department[] = await response.json()
        setDepartments(data)
        return data
      }
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
    return []
  }, [])

  const fetchActiveTickets = useCallback(async () => {
    try {
      const departmentsRes = await fetch("/api/hospital/department")
      const departmentsData: Department[] = await departmentsRes.json()

      const activeTicketsData: ActiveTicket[] = []

      for (const department of departmentsData) {
        for (const room of department.rooms) {
          if (room.currentTicket) {
            const ticketRes = await fetch(`/api/hospital/ticket/${room.currentTicket}`)
            if (ticketRes.ok) {
              const ticketData: Ticket = await ticketRes.json()

              activeTicketsData.push({
                ticketId: ticketData._id,
                ticketNo: ticketData.ticketNo,
                department: department.title,
                departmentIcon: department.icon,
                roomNumber: room.roomNumber,
                call: ticketData.call || false,
              })
            }
          }
        }
      }

      setActiveTickets(activeTicketsData)

      // Check for tickets that need to be announced
      const ticketsToAnnounce = activeTicketsData.filter(
        (ticket) => !announcedTickets.current.has(ticket.ticketId) || ticket.call,
      )

      for (const ticket of ticketsToAnnounce) {
        announceTicket(ticket)
      }

      announcedTickets.current = new Set(
        Array.from(announcedTickets.current).filter((id) => activeTicketsData.some((t) => t.ticketId === id)),
      )
    } catch (error) {
      console.error("Error fetching active tickets:", error)
    }
  }, [announceTicket])

  const fetchWaitingTickets = useCallback(async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0]

      // Fetch all tickets for today
      const ticketsRes = await fetch(`/api/hospital/ticket?date=${today}`)
      if (!ticketsRes.ok) return

      const allTickets: Ticket[] = await ticketsRes.json()

      // Filter for waiting tickets with improved logic
      const waitingTicketsData: WaitingTicket[] = []

      // Group tickets by department
      const ticketsByDepartment: { [key: string]: { tickets: Ticket[]; icon: string } } = {}

      for (const ticket of allTickets) {
        // Skip completed, held, or tickets without department history
        if (ticket.completed || ticket.held || !ticket.departmentHistory?.length) {
          continue
        }

        // Find current department (not completed)
        const currentDept = ticket.departmentHistory.find((history) => !history.completed)
        if (!currentDept) continue

        // Skip cash tickets that haven't been cleared for payment (except Reception)
        if (ticket.userType === "Cash" && currentDept.department !== "Reception") {
          if (currentDept.cashCleared !== "Cleared") {
            continue // Skip this ticket - payment not cleared
          }
        }

        // IMPROVED LOGIC: A ticket is waiting if:
        // 1. It has no roomId assigned, OR
        // 2. It has roomId but staff hasn't actually started serving (no actuallyStarted flag)
        // 3. It has roomId and startedAt but the room is not marked as occupied in the system

        const isActuallyBeingServed =
          currentDept.roomId && currentDept.startedAt && currentDept.actuallyStarted !== false

        // Skip if ticket is actually being served
        if (isActuallyBeingServed) {
          continue
        }

        // This is a waiting ticket (either no room assigned or assigned but not started)
        if (!ticketsByDepartment[currentDept.department]) {
          ticketsByDepartment[currentDept.department] = {
            tickets: [],
            icon: currentDept.icon || "🏥",
          }
        }

        ticketsByDepartment[currentDept.department].tickets.push(ticket)
      }

      // Convert to waiting tickets with position and waiting time
      for (const [department, data] of Object.entries(ticketsByDepartment)) {
        // Sort by creation time (oldest first)
        data.tickets.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        data.tickets.forEach((ticket, index) => {
          const waitingTime = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 1000)

          waitingTicketsData.push({
            ticketId: ticket._id,
            ticketNo: ticket.ticketNo,
            patientName: ticket.patientName,
            department,
            departmentIcon: data.icon,
            waitingTime,
            emergency: ticket.emergency,
            held: ticket.held,
            position: index + 1,
          })
        })
      }

      setWaitingTickets(waitingTicketsData)
    } catch (error) {
      console.error("Error fetching waiting tickets:", error)
    }
  }, [])

  const fetchHeldTickets = useCallback(async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0]

      // Fetch all tickets for today
      const ticketsRes = await fetch(`/api/hospital/ticket?date=${today}`)
      if (!ticketsRes.ok) return

      const allTickets: Ticket[] = await ticketsRes.json()

      // Filter for held tickets
      const heldTicketsData: HeldTicket[] = []

      for (const ticket of allTickets) {
        // Only get held tickets
        if (!ticket.held || ticket.completed) {
          continue
        }

        // Find current department (not completed)
        const currentDept = ticket.departmentHistory?.find((history) => !history.completed)
        if (!currentDept) continue

        // Calculate held time
        const heldTime = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 1000)

        // Get room number if assigned
        let roomNumber: string | undefined
        if (currentDept.roomId) {
          // Find the room number from departments
          for (const dept of departments) {
            if (dept.title === currentDept.department) {
              const room = dept.rooms.find((r) => r._id === currentDept.roomId)
              if (room) {
                roomNumber = room.roomNumber
                break
              }
            }
          }
        }

        heldTicketsData.push({
          ticketId: ticket._id,
          ticketNo: ticket.ticketNo,
          department: currentDept.department,
          departmentIcon: currentDept.icon || "🏥",
          roomNumber,
          heldTime,
        })
      }

      setHeldTickets(heldTicketsData)
    } catch (error) {
      console.error("Error fetching held tickets:", error)
    }
  }, [departments])

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, adsRes, settingsRes] = await Promise.all([
        fetch("/api/hospital/events"),
        fetch("/api/hospital/ads"),
        fetch("/api/settings"),
      ])

      const eventsData = await eventsRes.json()
      const adsData = await adsRes.json()
      const settingsData = await settingsRes.json()

      setEvents(eventsData)
      setAds(adsData)
      setSettings(settingsData)

      await Promise.all([fetchActiveTickets(), fetchWaitingTickets(), fetchHeldTickets()])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }, [fetchActiveTickets, fetchWaitingTickets, fetchHeldTickets])

  useEffect(() => {
    const savedMuteState = localStorage.getItem("hallDisplayMuted")
    if (savedMuteState !== null) {
      setIsMuted(savedMuteState === "true")
    }

    const initializeApp = async () => {
      if (audioCacheStatus.isLoading) {
        return
      }

      const depts = await fetchDepartments()

      if (depts.length > 0 && audioCacheStatus.loadedCount === 0 && !audioCacheStatus.isLoading) {
        await preloadAudioFiles()
      }
    }

    initializeApp()
  }, [])

  useEffect(() => {
    if (departments.length > 0 && audioCacheStatus.loadedCount === 0 && !audioCacheStatus.isLoading) {
      preloadAudioFiles()
    }
  }, [departments.length, preloadAudioFiles, audioCacheStatus.loadedCount, audioCacheStatus.isLoading])

  useEffect(() => {
    fetchData()

    const ticketsIntervalId = setInterval(() => {
      fetchActiveTickets()
      fetchWaitingTickets()
      fetchHeldTickets()
    }, 5000)
    const dataIntervalId = setInterval(fetchData, 30000)

    return () => {
      clearInterval(ticketsIntervalId)
      clearInterval(dataIntervalId)
    }
  }, [fetchData, fetchActiveTickets, fetchWaitingTickets, fetchHeldTickets])

  useEffect(() => {
    const handleUserInteraction = () => {
      if (!isAudioInitialized) {
        initializeAudioContext()
      }
    }

    document.addEventListener("click", handleUserInteraction)
    document.addEventListener("touchstart", handleUserInteraction)

    return () => {
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("touchstart", handleUserInteraction)
    }
  }, [isAudioInitialized])

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m`
    } else {
      return `${seconds}s`
    }
  }

  const testTicketAnnouncement = () => {
    if (isMuted) {
      toast({
        title: "Audio is muted",
        description: "Please unmute audio first",
        variant: "destructive",
      })
      return
    }

    if (audioCacheStatus.isLoading) {
      toast({
        title: "Audio Still Loading",
        description: "Please wait for audio files to finish loading",
        variant: "destructive",
      })
      return
    }

    const testTicket: ActiveTicket = {
      ticketId: "test-ticket-id",
      ticketNo: "A01",
      department: "Reception",
      departmentIcon: "👋",
      roomNumber: "1",
      call: true,
    }

    toast({
      title: "Testing Ticket Announcement",
      description: "Playing audio sequence for test ticket A01",
    })

    announceTicket(testTicket)
  }

  const loadingProgress =
    audioCacheStatus.totalCount > 0 ? (audioCacheStatus.loadedCount / audioCacheStatus.totalCount) * 100 : 0

  // Group waiting tickets by department
  const waitingTicketsByDepartment = waitingTickets.reduce(
    (acc, ticket) => {
      if (!acc[ticket.department]) {
        acc[ticket.department] = []
      }
      acc[ticket.department].push(ticket)
      return acc
    },
    {} as { [key: string]: WaitingTicket[] },
  )

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen">
        {audioCacheStatus.isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <h3 className="text-lg font-semibold">Loading Audio System</h3>
              </div>
              <p className="text-gray-600 mb-4">Preloading audio files for faster announcements...</p>
              <Progress value={loadingProgress} className="mb-2" />
              <p className="text-sm text-gray-500">
                {audioCacheStatus.loadedCount} of {audioCacheStatus.totalCount} files loaded
              </p>
            </div>
          </div>
        )}

        {alert.isVisible && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-gray-300 shadow-md rounded-md p-4">
            <p className="text-black font-bold text-center">{alert.message}</p>
          </div>
        )}

        <header className="bg-[#0e4480] p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold">Octech</div>
            <div className="flex items-center gap-2 text-sm">
              {audioCacheStatus.isLoading ? (
                <div className="flex items-center gap-2 bg-yellow-600 px-3 py-1 rounded-full">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading Audio...</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:text-white/80 relative"
              disabled={isTestingAudio || audioCacheStatus.isLoading}
            >
              {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              {isPlaying.current && !isMuted && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center border">
                  <User className="h-4 w-4 text-black" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Audio Controls</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={playTestSound} disabled={isMuted || audioCacheStatus.isLoading}>
                  Test Audio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={testTicketAnnouncement} disabled={isMuted || audioCacheStatus.isLoading}>
                  Test Announcement
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    announcedTickets.current.clear()
                    toast({
                      title: "Reset Announced Tickets",
                      description: "All tickets can now be announced again",
                    })
                  }}
                >
                  Reset Announced
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-grow flex space-x-4 overflow-hidden p-3">
          <Card className="w-1/5 overflow-auto rounded-lg">
            <CardContent>
              <h2 className="text-xl font-bold mb-2 pt-2">Active Tickets</h2>
              <Table className="font-bold">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>No.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTickets.map((ticket) => (
                    <TableRow key={ticket.ticketId} className={ticket.call ? "bg-blue-50 animate-pulse" : ""}>
                      <TableCell className="text-2xl font-extrabold">{ticket.ticketNo}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-2xl font-extrabold">{ticket.department}</div>
                      </TableCell>
                      <TableCell className="text-2xl font-extrabold">{ticket.roomNumber}</TableCell>
                    </TableRow>
                  ))}
                  {activeTickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                        No active tickets
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Waiting Tickets Display - Shows All Departments */}
          <div className="w-3/5 overflow-hidden">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  Waiting Queue
                  <Badge variant="secondary" className="ml-2">
                    {waitingTickets.length} total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full overflow-auto pb-6">
                {waitingTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Users className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-xl font-medium">No tickets waiting</p>
                    <p className="text-sm">All patients are being served</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {Object.entries(waitingTicketsByDepartment).map(([department, tickets]) => (
                      <div key={department} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                          <span className="text-2xl">{tickets[0]?.departmentIcon || "🏥"}</span>
                          <h3 className="text-lg font-semibold text-gray-800">{department}</h3>
                          <Badge variant="outline" className="ml-auto">
                            {tickets.length} waiting
                          </Badge>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {tickets.slice(0, 6).map((ticket, index) => (
                            <div
                              key={ticket.ticketId}
                              className={`
                                flex items-center justify-between p-2 rounded-md transition-all duration-300
                                ${
                                  ticket.emergency
                                    ? "bg-red-50 border border-red-200"
                                    : index === 0
                                      ? "bg-blue-50 border border-blue-200"
                                      : "bg-gray-50 border border-gray-100"
                                }
                              `}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`
                                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                    ${
                                      ticket.emergency
                                        ? "bg-red-500 text-white"
                                        : index === 0
                                          ? "bg-blue-500 text-white"
                                          : "bg-gray-400 text-white"
                                    }
                                  `}
                                >
                                  {ticket.position}
                                </div>

                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-gray-800">{ticket.ticketNo}</span>
                                    {ticket.emergency && (
                                      <Badge variant="destructive" className="text-xs animate-pulse">
                                        EMG
                                      </Badge>
                                    )}
                                    {index === 0 && (
                                      <Badge variant="default" className="text-xs bg-blue-500">
                                        NEXT
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          {tickets.length > 6 && (
                            <div className="text-center py-2 text-gray-500">
                              <p className="text-xs">+ {tickets.length - 6} more</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Held Tickets Section - Table Format */}
          <Card className="w-1/5 overflow-auto rounded-lg">
            <CardContent>
              <h2 className="text-xl font-bold mb-2 pt-2">Held Tickets</h2>
              <Table className="font-bold">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Room No.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heldTickets.map((ticket) => (
                    <TableRow key={ticket.ticketId} className="bg-amber-50">
                      <TableCell className="text-2xl font-extrabold text-amber-800">{ticket.ticketNo}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-2xl font-extrabold text-amber-700">
                          {ticket.department}
                        </div>
                      </TableCell>
                      <TableCell className="text-2xl font-extrabold text-amber-700">
                        {ticket.roomNumber || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {heldTickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                        No held tickets
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>

        <footer className="bg-[#0e4480] text-white p-2 overflow-hidden">
          <Marquee text={settings?.notificationText || "Welcome dear patient"} />
        </footer>

        <ToastViewport className="fixed top-4 left-1/2 transform -translate-x-1/2 flex flex-col gap-2 w-[350px] max-w-[100vw] m-0 z-[100] outline-none" />
      </div>
    </ToastProvider>
  )
}