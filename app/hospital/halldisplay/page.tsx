"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  User,
  Calendar,
  Volume2,
  VolumeX,
  Play,
  RefreshCw,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Marquee } from "@/components/Marquee";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  _id: string;
  ticketNo: string;
  journeyId?: {
    _id: string;
    name: string;
    steps: { title: string; icon: string }[];
  } | null;
  currentStep?: number;
  journeySteps?: { [key: string]: boolean };
  completed?: boolean;
  call?: boolean;
  departmentHistory?: {
    department: string;
    icon?: string;
    timestamp: string;
    note?: string;
    completed?: boolean;
    roomId?: string;
  }[];
}

interface Room {
  _id: string;
  roomNumber: string;
  staff: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  available: boolean;
  currentTicket: string | null;
}

interface Department {
  _id: string;
  title: string;
  icon: string;
  rooms: Room[];
}

interface ActiveTicket {
  ticketId: string;
  ticketNo: string;
  department: string;
  departmentIcon: string;
  roomNumber: string;
  call: boolean;
}

interface Event {
  _id: string;
  title: string;
  date: string;
}

interface Ad {
  _id: string;
  name: string;
  image: string;
}

interface Settings {
  notificationText: string;
}

export default function HallDisplay() {
  // Start with audio muted by default
  const [isMuted, setIsMuted] = useState(true);
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [alert, setAlert] = useState<{ message: string; isVisible: boolean }>({
    message: "",
    isVisible: false,
  });
  const [debugInfo, setDebugInfo] = useState<string>("");
  const isPlaying = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);
  const announcedTickets = useRef<Set<string>>(new Set());
  const announcementQueue = useRef<ActiveTicket[]>([]);
  const { toast } = useToast();

  // Debug function to check if audio files exist
  const checkAudioFile = async (src: string) => {
    try {
      const response = await fetch(src, { method: "HEAD" });
      console.log(`Audio file ${src}: ${response.ok ? "exists" : "not found"}`);
      return response.ok;
    } catch (error) {
      console.error(`Error checking audio file ${src}:`, error);
      return false;
    }
  };

  const initializeAudioContext = () => {
    try {
      if (!audioContext.current) {
        console.log("Creating new AudioContext");
        audioContext.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      if (audioContext.current.state === "suspended") {
        console.log("Resuming suspended AudioContext");
        audioContext.current.resume();
      }

      setIsAudioInitialized(true);
      console.log("Audio context initialized:", audioContext.current.state);
      return true;
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
      return false;
    }
  };

  // Check for tickets that need to be announced
  const checkForTicketsToAnnounce = useCallback(() => {
    if (isMuted) return;

    console.log("Checking for tickets to announce...");
    console.log("Active tickets:", activeTickets);
    console.log(
      "Already announced tickets:",
      Array.from(announcedTickets.current)
    );

    // Announce tickets that either:
    // 1. Haven't been announced yet
    // 2. Have call=true (even if already announced)
    const ticketsToAnnounce = activeTickets.filter(
      (ticket) => !announcedTickets.current.has(ticket.ticketId) || ticket.call
    );

    // Log detailed info about why tickets aren't being announced
    activeTickets.forEach((ticket) => {
      console.log(
        `Ticket ${ticket.ticketNo} - call: ${
          ticket.call
        }, already announced: ${announcedTickets.current.has(ticket.ticketId)}`
      );
    });

    if (ticketsToAnnounce.length > 0) {
      console.log(
        `Found ${ticketsToAnnounce.length} tickets to announce:`,
        ticketsToAnnounce.map((t) => t.ticketNo).join(", ")
      );

      for (const ticket of ticketsToAnnounce) {
        announceTicket(ticket);
      }
    } else {
      console.log("No tickets need to be announced");
    }

    // Update debug info
    // setDebugInfo(
    //   `Active tickets: ${activeTickets.length}, Call enabled: ${
    //     activeTickets.filter((t) => t.call).length
    //   }, Already announced: ${announcedTickets.current.size}`
    // );
  }, [activeTickets, isMuted]);

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    console.log(`Audio ${newMutedState ? "muted" : "unmuted"}`);

    // Save mute state to localStorage
    localStorage.setItem("hallDisplayMuted", newMutedState ? "true" : "false");

    if (!newMutedState) {
      // When unmuting, initialize audio
      const initialized = initializeAudioContext();
      if (initialized) {
        // Check for tickets that need to be announced
        checkForTicketsToAnnounce();
      }
    }
  };

  const resetAnnouncedTickets = () => {
    announcedTickets.current.clear();
    console.log("Reset announced tickets list");
    toast({
      title: "Reset Announced Tickets",
      description: "All tickets can now be announced again",
    });

    // Check for tickets to announce after reset
    if (!isMuted) {
      checkForTicketsToAnnounce();
    }
  };

  const playTestSound = async () => {
    setIsTestingAudio(true);
    try {
      console.log("Playing test sound...");
      const initialized = initializeAudioContext();
      if (!initialized) {
        throw new Error("Could not initialize audio context");
      }

      await playAudio("/hospitalAudio/alert.wav");
      console.log("Test sound completed");
      toast({
        title: "Audio Test",
        description: "If you heard a sound, audio is working correctly",
        duration: 3000,
      });
    } catch (error) {
      console.error("Test sound failed:", error);
      toast({
        title: "Audio Test Failed",
        description: "Could not play test sound. Check console for details.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsTestingAudio(false);
    }
  };

  const playAudio = useCallback(
    async (src: string) => {
      if (isMuted) {
        console.log(`Audio muted, skipping: ${src}`);
        return Promise.resolve();
      }

      // Initialize audio context if needed
      if (!isAudioInitialized) {
        const initialized = initializeAudioContext();
        if (!initialized) {
          console.error("Could not initialize audio context");
          return Promise.resolve();
        }
      }

      // Check if the audio file exists
      const fileExists = await checkAudioFile(src);
      if (!fileExists) {
        console.error(`Audio file not found: ${src}`);
        return Promise.reject(new Error(`Audio file not found: ${src}`));
      }

      return new Promise<void>((resolve, reject) => {
        console.log(`Playing audio: ${src}`);
        const audio = new Audio(src);

        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.warn(`Audio playback timed out: ${src}`);
          resolve();
        }, 5000);

        audio.onended = () => {
          console.log(`Finished playing: ${src}`);
          clearTimeout(timeout);
          resolve();
        };

        audio.onerror = (e) => {
          console.error(`Error playing audio ${src}:`, e);
          clearTimeout(timeout);
          reject(new Error(`Error playing audio: ${src}`));
        };

        audio.oncanplaythrough = () => {
          console.log(`Audio ready to play: ${src}`);
          const playPromise = audio.play();
          if (playPromise) {
            playPromise.catch((e) => {
              console.error(`Failed to play audio ${src}:`, e);
              clearTimeout(timeout);
              reject(e);
            });
          }
        };

        audio.load();
      });
    },
    [isMuted, isAudioInitialized]
  );

  const announceTicket = useCallback(
    async (ticket: ActiveTicket) => {
      if (isMuted) {
        console.log("Audio is muted, skipping announcement");
        return;
      }

      if (isPlaying.current) {
        console.log("Already playing audio, queueing ticket");
        // Check if ticket is already in queue
        if (
          !announcementQueue.current.some((t) => t.ticketId === ticket.ticketId)
        ) {
          announcementQueue.current.push(ticket);
          console.log(
            `Added ticket ${ticket.ticketNo} to queue. Queue length: ${announcementQueue.current.length}`
          );
        }
        return;
      }

      isPlaying.current = true;
      console.log(`Announcing ticket: ${ticket.ticketNo}`);

      const ticketNumber = ticket.ticketNo;
      const department = ticket.department;
      const roomNumber = ticket.roomNumber;

      // Show toast notification
      // toast({
      //   title: `Ticket ${ticketNumber}`,
      //   description: `Please proceed to ${department} Room ${roomNumber}`,
      //   duration: 5000,
      // });

      // Show alert
      setAlert({
        message: `Ticket ${ticketNumber} - Please proceed to ${department} Room ${roomNumber}`,
        isVisible: true,
      });

      // Hide alert after 5 seconds
      setTimeout(() => setAlert({ message: "", isVisible: false }), 5000);

      try {
        // Initialize audio context on user interaction
        if (!isAudioInitialized) {
          const initialized = initializeAudioContext();
          if (!initialized) {
            throw new Error("Could not initialize audio context");
          }
        }

        // Play alert sound first
        console.log("Playing alert sound...");
        await playAudio("/hospitalAudio/alert.wav");
        console.log("Alert sound completed successfully");

        // Play "Ticket Number" audio
        await playAudio("/hospitalAudio/TicketNumber.wav");

        // Play individual characters of the ticket number
        console.log("Playing ticket number...");
        for (const char of ticketNumber.split("")) {
          try {
            const charFile = `/hospitalAudio/${char}.wav`;
            await playAudio(charFile);
            console.log(`Successfully played character: ${char}`);
          } catch (error) {
            console.error(`Error playing character ${char}:`, error);
          }
        }

        // Play "please proceed to" audio
        await playAudio("/hospitalAudio/proceedto.wav");

        // Play department name audio - use the specific department name file
        console.log(`Playing department audio for: ${department}`);
        try {
          // Use the department name directly (without spaces) for the audio file
          const departmentFile = `/hospitalAudio/${department.replace(
            /\s+/g,
            ""
          )}.wav`;
          await playAudio(departmentFile);
          console.log(
            `Successfully played department audio: ${departmentFile}`
          );
        } catch (error) {
          console.error(`Error playing department audio:`, error);
        }

        // Play "room" audio
        await playAudio("/hospitalAudio/room.wav");

        // Play room number audio
        console.log("Playing room number...");
        for (const char of roomNumber.split("")) {
          try {
            const charFile = `/hospitalAudio/${char}.wav`;
            await playAudio(charFile);
            console.log(`Successfully played room digit: ${char}`);
          } catch (error) {
            console.error(`Error playing room digit ${char}:`, error);
          }
        }

        console.log("Finished announcing ticket");
      } catch (error) {
        console.error("Error during announcement:", error);
      } finally {
        isPlaying.current = false;
        announcedTickets.current.add(ticket.ticketId);

        // If the ticket had call=true, reset it to false to prevent continuous announcements
        if (ticket.call) {
          try {
            await fetch(`/api/hospital/ticket/${ticket.ticketId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ call: false }),
            });
            console.log(`Reset call flag for ticket ${ticket.ticketNo}`);
          } catch (error) {
            console.error("Error updating ticket call status:", error);
          }
        }

        // Check if there are more tickets in the queue
        if (announcementQueue.current.length > 0) {
          const nextTicket = announcementQueue.current.shift();
          if (nextTicket) {
            await announceTicket(nextTicket);
          }
        }
      }
    },
    [playAudio, isMuted, isAudioInitialized, toast]
  );

  // Force announce a specific ticket
  const forceAnnounceTicket = (ticket: ActiveTicket) => {
    if (isMuted) {
      toast({
        title: "Audio is muted",
        description: "Please unmute audio first",
        variant: "destructive",
      });
      return;
    }

    // Remove from announced list if it's there
    announcedTickets.current.delete(ticket.ticketId);

    // Create a copy with call set to true
    const ticketToAnnounce = {
      ...ticket,
      call: true,
    };

    toast({
      title: "Announcing Ticket",
      description: `Forcing announcement for ticket ${ticket.ticketNo}`,
    });

    announceTicket(ticketToAnnounce);
  };

  // Fetch active tickets from rooms with assigned tickets
  const fetchActiveTickets = useCallback(async () => {
    try {
      // Fetch all departments with their rooms
      const departmentsRes = await fetch("/api/hospital/department");
      const departmentsData: Department[] = await departmentsRes.json();

      const activeTicketsData: ActiveTicket[] = [];

      // Process each department to find rooms with active tickets
      for (const department of departmentsData) {
        for (const room of department.rooms) {
          if (room.currentTicket) {
            // Fetch the ticket details
            const ticketRes = await fetch(
              `/api/hospital/ticket/${room.currentTicket}`
            );
            if (ticketRes.ok) {
              const ticketData: Ticket = await ticketRes.json();

              activeTicketsData.push({
                ticketId: ticketData._id,
                ticketNo: ticketData.ticketNo,
                department: department.title,
                departmentIcon: department.icon,
                roomNumber: room.roomNumber,
                call: ticketData.call || false,
              });
            }
          }
        }
      }

      console.log("Active tickets:", activeTicketsData);
      setActiveTickets(activeTicketsData);

      // Announce tickets that haven't been announced yet or have call=true
      if (!isMuted) {
        const ticketsToAnnounce = activeTicketsData.filter(
          (ticket) =>
            !announcedTickets.current.has(ticket.ticketId) || ticket.call
        );

        if (ticketsToAnnounce.length > 0) {
          console.log(
            `Found ${ticketsToAnnounce.length} tickets to announce:`,
            ticketsToAnnounce.map((t) => t.ticketNo).join(", ")
          );

          for (const ticket of ticketsToAnnounce) {
            announceTicket(ticket);
          }
        }
      }

      // Remove announced tickets that are no longer active
      announcedTickets.current = new Set(
        Array.from(announcedTickets.current).filter((id) =>
          activeTicketsData.some((t) => t.ticketId === id)
        )
      );
    } catch (error) {
      console.error("Error fetching active tickets:", error);
    }
  }, [announceTicket, isMuted]);

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, adsRes, settingsRes] = await Promise.all([
        fetch("/api/hospital/events"),
        fetch("/api/hospital/ads"),
        fetch("/api/settings"),
      ]);

      const eventsData = await eventsRes.json();
      const adsData = await adsRes.json();
      const settingsData = await settingsRes.json();

      setEvents(eventsData);
      setAds(adsData);
      setSettings(settingsData);

      // Fetch active tickets separately
      await fetchActiveTickets();
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [fetchActiveTickets]);

  // Load mute state from localStorage on initial render
  useEffect(() => {
    const savedMuteState = localStorage.getItem("hallDisplayMuted");
    if (savedMuteState !== null) {
      setIsMuted(savedMuteState === "true");
      console.log(
        `Loaded mute state from localStorage: ${
          savedMuteState === "true" ? "muted" : "unmuted"
        }`
      );
    }
  }, []);

  // Effect to check for tickets to announce when mute state changes
  useEffect(() => {
    if (!isMuted) {
      checkForTicketsToAnnounce();
    }
  }, [isMuted, checkForTicketsToAnnounce]);

  useEffect(() => {
    fetchData();

    // Set up polling interval for active tickets (every 5 seconds)
    const ticketsIntervalId = setInterval(fetchActiveTickets, 5000);

    // Set up polling interval for other data (less frequent)
    const dataIntervalId = setInterval(fetchData, 30000);

    return () => {
      clearInterval(ticketsIntervalId);
      clearInterval(dataIntervalId);
    };
  }, [fetchData, fetchActiveTickets]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAdIndex(
        (prevIndex) => (prevIndex + 1) % Math.max(1, ads.length)
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [ads.length]);

  // Add a click handler to initialize audio context
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!isAudioInitialized) {
        initializeAudioContext();
        console.log("Audio context initialized from user interaction");
      }
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("touchstart", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };
  }, [isAudioInitialized]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const testTicketAnnouncement = () => {
    if (isMuted) {
      toast({
        title: "Audio is muted",
        description: "Please unmute audio first",
        variant: "destructive",
      });
      return;
    }

    const testTicket: ActiveTicket = {
      ticketId: "test-ticket-id",
      ticketNo: "A01",
      department: "Reception",
      departmentIcon: "👋",
      roomNumber: "1",
      call: true,
    };

    toast({
      title: "Testing Ticket Announcement",
      description: "Playing audio sequence for test ticket A01",
    });

    announceTicket(testTicket);
  };

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen">
        {alert.isVisible && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-gray-300 shadow-md rounded-md p-4">
            <p className="text-black font-bold text-center">{alert.message}</p>
          </div>
        )}

        {debugInfo && (
          <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white text-xs p-2 rounded">
            {debugInfo}
          </div>
        )}

        <header className="bg-[#0e4480] p-4 text-white flex justify-between items-center">
          <div className="text-2xl font-bold">Octech</div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:text-white/80 relative"
              disabled={isTestingAudio}
            >
              {isMuted ? (
                <VolumeX className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
              {isPlaying.current && !isMuted && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </Button>

            {/* <Button
              variant="ghost"
              size="icon"
              onClick={playTestSound}
              className="text-white hover:text-white/80"
              disabled={isMuted || isTestingAudio || isPlaying.current}
            >
              <Play className="h-5 w-5" />
              {isTestingAudio && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </Button> */}

            {/* <Button
              variant="ghost"
              size="sm"
              onClick={testTicketAnnouncement}
              className="text-white hover:text-white/80"
              disabled={isMuted || isTestingAudio || isPlaying.current}
            >
              Test Announcement
            </Button> */}

            {/* <Button
              variant="ghost"
              size="sm"
              onClick={resetAnnouncedTickets}
              className="text-white hover:text-white/80"
              disabled={isTestingAudio || isPlaying.current}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset Announced
            </Button> */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center border">
                  <User className="h-4 w-4 text-black" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>No.</TableHead>
                    {/* <TableHead></TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTickets.map((ticket) => (
                    <TableRow
                      key={ticket.ticketId}
                      className={ticket.call ? "bg-blue-50 animate-pulse" : ""}
                    >
                      <TableCell className="font-medium">
                        {ticket.ticketNo}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {/* <span className="mr-2">{ticket.departmentIcon}</span> */}
                          {ticket.department}
                        </div>
                      </TableCell>
                      <TableCell>{ticket.roomNumber}</TableCell>
                      {/* <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => forceAnnounceTicket(ticket)}
                          disabled={isMuted || isPlaying.current}
                          className="h-7 w-7"
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </TableCell> */}
                    </TableRow>
                  ))}
                  {activeTickets.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-4 text-muted-foreground"
                      >
                        No active tickets
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="w-3/5 overflow-hidden">
            <Carousel className="w-full h-full">
              <CarouselContent className="h-full">
                {ads.length > 0 ? (
                  ads.map((ad, index) => (
                    <CarouselItem
                      key={ad._id}
                      className={`h-full ${
                        index === currentAdIndex ? "" : "hidden"
                      }`}
                    >
                      <div className="w-full h-full">
                        <img
                          src={ad.image || "/placeholder.svg"}
                          alt={ad.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))
                ) : (
                  <CarouselItem className="h-full">
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <p className="text-xl text-gray-500">
                        No advertisements available
                      </p>
                    </div>
                  </CarouselItem>
                )}
              </CarouselContent>
            </Carousel>
          </div>

          <Card className="w-1/5 overflow-auto rounded-lg pb-3">
            <CardContent>
              <h2 className="text-xl font-bold mb-4 pt-2">Announcements</h2>
              <div className="space-y-4">
                {events.length > 0 ? (
                  events.map((event) => (
                    <div
                      key={event._id}
                      className="bg-gray-100 rounded-lg p-4 transition-all hover:shadow-md"
                    >
                      <div className="flex items-start space-x-3">
                        <Calendar className="w-5 h-5 text-blue-500 mt-1" />
                        <div>
                          <h3 className="font-semibold text-lg leading-tight">
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatDate(event.date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No announcements available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="bg-[#0e4480] text-white p-2 overflow-hidden">
          <Marquee
            text={settings?.notificationText || "Welcome dear patient"}
          />
        </footer>

        <ToastViewport className="fixed top-4 left-1/2 transform -translate-x-1/2 flex flex-col gap-2 w-[350px] max-w-[100vw] m-0 z-[100] outline-none" />
      </div>
    </ToastProvider>
  );
}
