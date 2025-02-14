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
  const isPlaying = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);
  const announcedTickets = useRef<Set<string>>(new Set());
  const announcementQueue = useRef<Ticket[]>([]);
  const { toast } = useToast();

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
        const audio = new Audio(src);

        audio.onended = () => {
          console.log(`Finished playing: ${src}`);
          resolve();
        };

        audio.onerror = (e) => {
          console.error(`Error playing audio ${src}:`, e);
          resolve();
        };

        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch((e) => {
            console.error(`Failed to play audio ${src}:`, e);
            resolve();
          });
        }
      });
    },
    [isMuted]
  );

  const announceTicket = useCallback(
    async (ticket: Ticket) => {
      if (!ticket.counterId || isMuted) {
        console.log(
          "Cannot announce ticket: no counter assigned or audio is muted"
        );
        return;
      }

      if (isPlaying.current) {
        console.log("Already playing audio, queueing ticket");
        announcementQueue.current.push(ticket);
        return;
      }

      isPlaying.current = true;
      console.log(
        `Announcing ticket: ${ticket.ticketNo} for counter ${ticket.counterId.counterNumber}`
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

      isPlaying.current = false;
      announcedTickets.current.add(ticket._id);

      // If this was a "call again" announcement, update the ticket
      if (ticket.callAgain) {
        try {
          console.log(
            `Attempting to update callAgain status for ticket ${ticket._id}`
          );
          const response = await fetch(`/api/bank/ticket/${ticket._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ callAgain: false }),
            credentials: "include", // This ensures cookies are sent with the request
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
          console.log("Successfully updated ticket:", updatedTicket);

          // Update the local state to reflect the change
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

      // Check if there are more tickets in the queue
      if (announcementQueue.current.length > 0) {
        const nextTicket = announcementQueue.current.shift();
        if (nextTicket) {
          await announceTicket(nextTicket);
        }
      }
    },
    [playAudio, isMuted, toast]
  );

  const fetchData = useCallback(async () => {
    if (!isLoggedIn || !branchId) return;

    try {
      const [ticketsRes, exchangeRatesRes, adsRes, settingsRes] =
        await Promise.all([
          fetch(`/api/bank/ticket?status=Serving&branchId=${branchId}`),
          fetch("/api/bank/exchange-rates"),
          fetch(`/api/bank/ads?branchId=${branchId}`),
          fetch(`/api/settings?branchId=${branchId}`),
        ]);

      const ticketsData: Ticket[] = await ticketsRes.json();
      console.log("Fetched tickets:", ticketsData);

      const exchangeRatesData = await exchangeRatesRes.json();
      const adsData = await adsRes.json();
      const settingsData = await settingsRes.json();

      setTickets(ticketsData);
      setExchangeRates(exchangeRatesData);
      setAds(adsData);
      setSettings(settingsData);

      // Prioritize tickets with callAgain set to true
      const ticketsToAnnounce = ticketsData
        .filter(
          (ticket) =>
            ticket.callAgain || !announcedTickets.current.has(ticket._id)
        )
        .sort((a, b) => (b.callAgain ? 1 : 0) - (a.callAgain ? 1 : 0));

      for (const ticket of ticketsToAnnounce) {
        await announceTicket(ticket);
      }

      // Remove announced tickets that are no longer in the list
      announcedTickets.current = new Set(
        Array.from(announcedTickets.current).filter((id) =>
          ticketsData.some((t) => t._id === id)
        )
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [announceTicket, isLoggedIn, branchId]);

  useEffect(() => {
    if (isLoggedIn && branchId) {
      fetchData();
      const intervalId = setInterval(fetchData, 5000);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, isLoggedIn, branchId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [ads.length]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleLoginSuccess = async (loggedInBranchId: string) => {
    setBranchId(loggedInBranchId);
    setIsLoggedIn(true);

    // Update the session
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
      // Handle the error (e.g., show a notification to the user)
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
    // Set up an interval to periodically check the session
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

      <main className="flex-grow flex  space-x-4 overflow-hidden">
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
                {tickets.map((ticket) => (
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="w-3/5 overflow-hidden">
          <Carousel className="w-full h-full">
            <CarouselContent className="h-full">
              {ads.map((ad, index) => (
                <CarouselItem
                  key={ad._id}
                  className={`h-full ${
                    index === currentAdIndex ? "" : "hidden"
                  }`}
                >
                  <div className="w-full h-full">
                    <img
                      src={ad.image}
                      alt={ad.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CarouselItem>
              ))}
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
                {exchangeRates.map((rate) => (
                  <TableRow key={rate._id}>
                    <TableCell>{rate.currencyCode}</TableCell>
                    <TableCell>{rate.buyingRate}</TableCell>
                    <TableCell>{rate.sellingRate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-[#0e4480] text-white p-2 overflow-hidden">
        <Marquee text={settings?.notificationText || "Welcome dear patient"} />
      </footer>
    </div>
  );
}
