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
import departments from "@/lib/models/departments";

interface Ticket {
  _id: string;
  ticketNo: string;
  journeyId: {
    _id: string;
    name: string;
    steps: { title: string; icon: string }[];
  } | null;
  currentStep: number;
  journeySteps: { [key: string]: boolean };
  completed: boolean;
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
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

        audio.oncanplaythrough = () => {
          const playPromise = audio.play();
          if (playPromise) {
            playPromise.catch((e) => {
              console.error(`Failed to play audio ${src}:`, e);
              resolve();
            });
          }
        };

        audio.load();
      });
    },
    [isMuted]
  );

  const announceTicket = useCallback(
    async (ticket: Ticket) => {
      if (isMuted) {
        console.log("Audio is muted, skipping announcement");
        return;
      }

      if (isPlaying.current) {
        console.log("Already playing audio, queueing ticket");
        announcementQueue.current.push(ticket);
        return;
      }

      isPlaying.current = true;
      console.log(`Announcing ticket: ${ticket.ticketNo}`);

      const ticketNumber = ticket.ticketNo;
      const currentStep = ticket.currentStep;
      const currentDepartment = ticket.journeyId?.steps[currentStep]?.title;
      const roomNumber =
        departments
          .find((d) => d.title === currentDepartment)
          ?.roomNumber.toString() || "";

      // Show toast notification
      toast({
        title: `Ticket ${ticketNumber}`,
        description: `Please proceed to ${currentDepartment || "Reception"} ${
          roomNumber ? `(Room ${roomNumber})` : ""
        }`,
        duration: 5000,
      });

      const audioFiles = [
        "/audio/alert.wav",
        "/audio/TicketNumber.wav",
        ...ticketNumber.split("").map((char) => `/audio/${char}.wav`),
        "/audio/proceedto.wav",
        "/audio/room.wav",
        ...(roomNumber
          ? roomNumber.split("").map((char) => `/audio/${char}.wav`)
          : ["/audio/reception.wav"]),
      ];

      if (roomNumber) {
        audioFiles.push(
          "/audio/room.wav",
          ...roomNumber.split("").map((char) => `/audio/${char}.wav`)
        );
      }

      for (const audioSrc of audioFiles) {
        await playAudio(audioSrc);
      }

      isPlaying.current = false;
      announcedTickets.current.add(ticket._id);

      // Update the ticket to set call back to false
      await fetch(`/api/hospital/ticket/${ticket._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ call: false }),
      });

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
    try {
      const [ticketsRes, eventsRes, adsRes, settingsRes] = await Promise.all([
        fetch("/api/hospital/ticket"),
        fetch("/api/hospital/events"),
        fetch("/api/hospital/ads"),
        fetch("/api/settings"),
      ]);

      const ticketsData: Ticket[] = await ticketsRes.json();
      console.log("Fetched tickets:", ticketsData);

      const eventsData = await eventsRes.json();
      const adsData = await adsRes.json();
      const settingsData = await settingsRes.json();

      setTickets(ticketsData);
      setEvents(eventsData);
      setAds(adsData);
      setSettings(settingsData);

      // Announce new tickets with call set to true
      ticketsData.forEach((ticket) => {
        if (ticket.call && !announcedTickets.current.has(ticket._id)) {
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
  }, [announceTicket]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 5000);

    return () => clearInterval(intervalId);
  }, [fetchData]);

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
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-grow flex p-4 space-x-4 overflow-hidden">
          <Card className="w-1/5 overflow-auto">
            <CardContent>
              <h2 className="text-xl font-bold mb-2 pt-2">Active Tickets</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead className="text-center"></TableHead>
                    <TableHead>Department</TableHead>
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
                        {ticket.journeyId?.steps[ticket.currentStep]?.title ||
                          "Reception"}
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

          <Card className="w-1/5 overflow-auto">
            <CardContent>
              <h2 className="text-xl font-bold mb-4 pt-2">Announcements</h2>
              <div className="space-y-4">
                {events.map((event) => (
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
                ))}
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
