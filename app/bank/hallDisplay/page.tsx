"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User, ArrowRight, Volume2, VolumeX } from "lucide-react";
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
import { LoginDialog } from "@/components/LoginDialog";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  _id: string;
  ticketNo: string;
  ticketStatus: string;
  counterId: {
    _id: string;
    counterNumber: number;
  } | null;
  callAgain: boolean;
  createdAt?: string;
}

interface ExchangeRate {
  _id: string;
  currencyCode: string;
  buyingRate: number;
  sellingRate: number;
}

interface Ad {
  _id: string;
  name: string;
  image: string;
}

interface Settings {
  notificationText: string;
}

interface SessionData {
  branchId?: string;
  isLoggedIn: boolean;
  hallDisplayUsername?: string;
}

// Let's define a new interface for our announcement queue
interface AnnouncementQueue {
  tickets: Ticket[];
  currentTicketIndex: number;
  currentAnnouncementCount: number;
  isProcessing: boolean;
}

export default function HallDisplay() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [alert, setAlert] = useState<{ message: string; isVisible: boolean }>({
    message: "",
    isVisible: false,
  });

  const audioContext = useRef<AudioContext | null>(null);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Replace the existing announcementQueue ref with our new structure
  const announcementQueue = useRef<AnnouncementQueue>({
    tickets: [],
    currentTicketIndex: 0,
    currentAnnouncementCount: 0,
    isProcessing: false,
  });

  // Add a new ref to track fully announced tickets (those that have been announced twice)
  const fullyAnnouncedTickets = useRef<Set<string>>(new Set());

  const initializeAudioContext = () => {
    if (!audioContext.current) {
      audioContext.current = new AudioContext();
    }
    if (audioContext.current.state === "suspended") {
      audioContext.current.resume();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    initializeAudioContext();
  };

  const playAudio = useCallback(
    async (src: string) => {
      if (isMuted) return Promise.resolve();

      return new Promise<void>((resolve) => {
        console.log(`Playing audio: ${src}`);

        // Cancel any currently playing audio
        if (currentAudio.current) {
          currentAudio.current.pause();
          currentAudio.current.onended = null;
          currentAudio.current.onerror = null;
        }

        const audio = new Audio(src);
        currentAudio.current = audio;

        audio.onended = () => {
          console.log(`Finished playing: ${src}`);
          currentAudio.current = null;
          resolve();
        };

        audio.onerror = (e) => {
          console.error(`Error playing audio ${src}:`, e);
          currentAudio.current = null;
          resolve();
        };

        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch((e) => {
            console.error(`Failed to play audio ${src}:`, e);
            currentAudio.current = null;
            resolve();
          });
        }
      });
    },
    [isMuted]
  );

  // Replace the existing queueTicketAnnouncement function
  const queueTicketAnnouncement = useCallback((ticket: Ticket) => {
    if (!ticket.counterId) return;

    // Check if this ticket is already in the queue
    const isAlreadyQueued = announcementQueue.current.tickets.some(
      (t) => t._id === ticket._id
    );

    if (isAlreadyQueued) {
      console.log(
        `Ticket ${ticket.ticketNo} is already in the announcement queue`
      );
      return;
    }

    // Add to queue
    announcementQueue.current.tickets.push(ticket);
    console.log(`Added ticket ${ticket.ticketNo} to announcement queue`);
  }, []);

  // Modify the fetchData function to properly check for already announced tickets
  const fetchData = useCallback(async () => {
    if (!isLoggedIn || !branchId) return;

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      const [ticketsRes, exchangeRatesRes, adsRes, settingsRes] =
        await Promise.all([
          fetch(
            `/api/bank/ticket?status=Serving&branchId=${branchId}&date=${today}`
          ),
          fetch("/api/bank/exchange-rates"),
          fetch(`/api/bank/ads?branchId=${branchId}`),
          fetch(`/api/settings?branchId=${branchId}`),
        ]);

      const ticketsData: Ticket[] = await ticketsRes.json();
      console.log("Fetched tickets:", ticketsData);

      // Get the list of ticket IDs that are currently in the queue
      const queuedTicketIds = new Set(
        announcementQueue.current.tickets.map((ticket) => ticket._id)
      );

      // Find new tickets that need to be announced:
      // 1. Not already in the queue
      // 2. Not already fully announced (unless callAgain is true)
      // 3. Have Serving status
      const newTicketsToAnnounce = ticketsData.filter(
        (ticket) =>
          !queuedTicketIds.has(ticket._id) &&
          ticket.ticketStatus === "Serving" &&
          (ticket.callAgain || !fullyAnnouncedTickets.current.has(ticket._id))
      );

      // Sort tickets - callAgain tickets first
      newTicketsToAnnounce.sort(
        (a, b) => (b.callAgain ? 1 : 0) - (a.callAgain ? 1 : 0)
      );

      // Queue new tickets for announcement
      for (const ticket of newTicketsToAnnounce) {
        queueTicketAnnouncement(ticket);
      }

      // Update state with fetched data
      setTickets(ticketsData);
      setExchangeRates(await exchangeRatesRes.json());
      setAds(await adsRes.json());
      setSettings(await settingsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [isLoggedIn, branchId, queueTicketAnnouncement]);

  // Replace the existing processAnnouncementQueue function
  const processAnnouncementQueue = useCallback(async () => {
    const queue = announcementQueue.current;

    // If we're already processing, or the queue is empty, or audio is muted, do nothing
    if (queue.isProcessing || queue.tickets.length === 0 || isMuted) {
      return;
    }

    // If we've processed all tickets, reset the queue
    if (queue.currentTicketIndex >= queue.tickets.length) {
      queue.tickets = [];
      queue.currentTicketIndex = 0;
      queue.currentAnnouncementCount = 0;
      return;
    }

    // Get the current ticket
    const ticket = queue.tickets[queue.currentTicketIndex];

    // If the ticket doesn't have a counter, skip it
    if (!ticket.counterId) {
      queue.currentTicketIndex++;
      return;
    }

    // Mark that we're processing
    queue.isProcessing = true;

    // Increment the announcement count
    queue.currentAnnouncementCount++;

    console.log(
      `Announcing ticket: ${ticket.ticketNo} for counter ${ticket.counterId.counterNumber} (Announcement #${queue.currentAnnouncementCount})`
    );

    const ticketNumber = ticket.ticketNo;
    const counterNumber = ticket.counterId.counterNumber.toString();

    // Show alert
    setAlert({
      message: `Ticket ${ticketNumber} - Please proceed to Counter ${counterNumber}`,
      isVisible: true,
    });

    // Hide alert after 5 seconds
    setTimeout(() => setAlert({ message: "", isVisible: false }), 5000);

    const audioFiles = [
      "/audio/alert.wav",
      "/audio/TicketNumber.wav",
      ...ticketNumber.split("").map((char) => `/audio/${char}.wav`),
      "/audio/proceedtocounter.wav",
      ...counterNumber.split("").map((char) => `/audio/${char}.wav`),
    ];

    for (const audioSrc of audioFiles) {
      await playAudio(audioSrc);
    }

    // If we've announced this ticket twice, move to the next ticket
    if (queue.currentAnnouncementCount >= 2) {
      // Mark the ticket as fully announced
      fullyAnnouncedTickets.current.add(ticket._id);

      // If this was a callAgain ticket, reset the flag
      if (ticket.callAgain) {
        try {
          const response = await fetch(`/api/bank/ticket/${ticket._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ callAgain: false }),
            credentials: "include",
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              `Failed to update ticket callAgain status: ${
                errorData.error || response.statusText
              }`
            );
          }

          const updatedTicket = await response.json();
          console.log(
            "Successfully updated ticket callAgain status:",
            updatedTicket
          );

          setTickets((prevTickets) =>
            prevTickets.map((t) =>
              t._id === ticket._id ? { ...t, callAgain: false } : t
            )
          );
        } catch (error) {
          console.error("Error updating ticket callAgain status:", error);
          toast({
            title: "Error",
            description: "Failed to update ticket status. Please try again.",
            duration: 5000,
          });
        }
      }

      // Move to the next ticket
      queue.currentTicketIndex++;
      queue.currentAnnouncementCount = 0;
    }

    // Mark that we're done processing
    queue.isProcessing = false;
  }, [playAudio, isMuted, toast]);

  useEffect(() => {
    if (isLoggedIn && branchId) {
      fetchData();
      const intervalId = setInterval(fetchData, 5000);
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [fetchData, isLoggedIn, branchId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAdIndex(
        (prevIndex) => (prevIndex + 1) % Math.max(1, ads.length)
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [ads.length]);

  // Replace the existing useEffect for processing the queue
  useEffect(() => {
    const processQueue = () => {
      processAnnouncementQueue();
    };

    const intervalId = setInterval(processQueue, 1000);

    return () => {
      clearInterval(intervalId);
      // Reset the queue when the component unmounts
      announcementQueue.current = {
        tickets: [],
        currentTicketIndex: 0,
        currentAnnouncementCount: 0,
        isProcessing: false,
      };
      fullyAnnouncedTickets.current.clear();
    };
  }, [processAnnouncementQueue]);

  const handleLoginSuccess = async (loggedInBranchId: string) => {
    setBranchId(loggedInBranchId);
    setIsLoggedIn(true);

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ branchId: loggedInBranchId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update session");
      }
    } catch (error) {
      console.error("Error updating session:", error);
    }
  };

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch("/api/session");
      if (response.ok) {
        const sessionData: SessionData = await response.json();
        console.log("Fetched session data:", sessionData);
        setSession(sessionData);
        setIsLoggedIn(sessionData.isLoggedIn);
        setBranchId(sessionData.branchId || null);
      } else {
        console.error("Failed to fetch session:", response.statusText);
        setIsLoggedIn(false);
        setBranchId(null);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      setIsLoggedIn(false);
      setBranchId(null);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    const intervalId = setInterval(fetchSession, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(intervalId);
  }, [fetchSession]);

  const handleLogout = async () => {
    const response = await fetch("/api/logout", { method: "POST" });
    if (response.ok) {
      setSession(null);
      setIsLoggedIn(false);
      setBranchId(null);
    }
  };

  if (!isLoggedIn) {
    return <LoginDialog isOpen={true} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col h-screen relative">
      {alert.isVisible && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-gray-300 shadow-md rounded-md p-4">
          <p className="text-black font-bold text-center">{alert.message}</p>
        </div>
      )}
      <header className="bg-[#0e4480] text-white p-4 flex justify-between items-center">
        <div className="text-2xl font-bold">Octech</div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="text-white hover:text-white/80"
          >
            {isMuted ? (
              <VolumeX className="h-6 w-6" />
            ) : (
              <Volume2 className="h-6 w-6" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center border">
                <User className="h-4 w-4 text-black" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {session?.hallDisplayUsername || "User"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-grow flex space-x-4 overflow-hidden">
        <Card className="w-1/5 overflow-auto rounded-none">
          <CardContent>
            <h2 className="text-xl font-bold mb-2 pt-2">Serving Tickets</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead className="text-center"></TableHead>
                  <TableHead>Counter</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-lg font-bold">
                {tickets.length > 0 ? (
                  tickets.map((ticket) => (
                    <TableRow key={ticket._id}>
                      <TableCell>{ticket.ticketNo}</TableCell>
                      <TableCell className="text-center">
                        <ArrowRight className="mx-auto text-blue-500" />
                      </TableCell>
                      <TableCell>
                        {ticket.counterId
                          ? ticket.counterId.counterNumber
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      No tickets currently being served
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
                        src={
                          ad.image || "/placeholder.svg?height=600&width=800"
                        }
                        alt={ad.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem className="h-full">
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <p className="text-gray-500">No advertisements available</p>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
          </Carousel>
        </div>

        <Card className="w-1/5 overflow-auto rounded-none">
          <CardContent>
            <h2 className="text-xl font-bold mb-2 pt-2">Exchange Rates</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead>Buy</TableHead>
                  <TableHead>Sell</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-md font-bold">
                {exchangeRates.length > 0 ? (
                  exchangeRates.map((rate) => (
                    <TableRow key={rate._id}>
                      <TableCell>{rate.currencyCode}</TableCell>
                      <TableCell>{rate.buyingRate}</TableCell>
                      <TableCell>{rate.sellingRate}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      No exchange rates available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-[#0e4480] text-white p-2 overflow-hidden">
        <Marquee
          text={settings?.notificationText || "Welcome to our service"}
        />
      </footer>
    </div>
  );
}
