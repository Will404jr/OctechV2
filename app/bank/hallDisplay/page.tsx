"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User, ArrowRight, Calendar, Volume2, VolumeX } from "lucide-react";
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
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { LoginDialog } from "@/components/LoginDialog";

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
  countryCode: string;
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
        `Announcing ticket: ${ticket.ticketNo} for room ${ticket.counterId.counterNumber}`
      );

      const ticketNumber = ticket.ticketNo;
      const counterNumber = ticket.counterId.counterNumber.toString();

      // Show toast notification
      toast({
        title: `Ticket ${ticketNumber}`,
        description: `Please proceed to Room ${counterNumber}`,
        duration: 5000,
      });

      const audioFiles = [
        "/audio/alert.wav",
        "/audio/TicketNumber.wav",
        ...ticketNumber.split("").map((char) => `/audio/${char}.wav`),
        "/audio/proceedtoroom.wav",
        ...counterNumber.split("").map((char) => `/audio/${char}.wav`),
      ];

      for (const audioSrc of audioFiles) {
        await playAudio(audioSrc);
      }

      isPlaying.current = false;
      announcedTickets.current.add(ticket._id);

      // If this was a "call again" announcement, update the ticket
      if (ticket.callAgain) {
        await fetch(`/api/bank/ticket/${ticket._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ callAgain: false }),
        });
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

      // Announce new tickets and tickets with callAgain set to true
      ticketsData.forEach((ticket) => {
        if (!announcedTickets.current.has(ticket._id) || ticket.callAgain) {
          announceTicket(ticket);
        }
      });

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
    const response = await fetch("/api/session");
    if (response.ok) {
      const sessionData: SessionData = await response.json();
      setSession(sessionData);
      setIsLoggedIn(sessionData.isLoggedIn);
      setBranchId(sessionData.branchId || null);
    }
  }, []);

  useEffect(() => {
    fetchSession();
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
    <ToastProvider>
      <div className="flex flex-col h-screen">
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
                <DropdownMenuItem onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-grow flex p-4 space-x-4 overflow-hidden">
          <Card className="w-1/5 overflow-auto">
            <CardContent>
              <h2 className="text-xl font-bold mb-2 pt-2">Serving Tickets</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead className="text-center"></TableHead>
                    <TableHead>Room</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                        src={ad.image || "/placeholder.svg"}
                        alt={ad.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>

          <Card className="w-1/5 overflow-auto">
            <CardContent>
              <h2 className="text-xl font-bold mb-2 pt-2">Exchange Rates</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Buy</TableHead>
                    <TableHead>Sell</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchangeRates.map((rate) => (
                    <TableRow key={rate._id}>
                      <TableCell>{rate.countryCode}</TableCell>
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
          <Marquee
            text={settings?.notificationText || "Welcome dear patient"}
          />
        </footer>

        <ToastViewport className="fixed top-4 left-1/2 transform -translate-x-1/2 flex flex-col gap-2 w-[350px] max-w-[100vw] m-0 z-[100] outline-none" />
      </div>
    </ToastProvider>
  );
}
