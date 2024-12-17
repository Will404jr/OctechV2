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

interface Ticket {
  _id: string;
  ticketNo: string;
  ticketStatus: string;
  roomId: {
    _id: string;
    roomNumber: number;
  } | null;
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
  const [lastAnnouncedTicket, setLastAnnouncedTicket] = useState<string | null>(
    null
  );
  const [isMuted, setIsMuted] = useState(false);
  const audioQueue = useRef<Ticket[]>([]);
  const isPlaying = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);

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

  const playAudioSequence = useCallback(async () => {
    if (isPlaying.current || isMuted) {
      console.log(
        isMuted ? "Audio is muted" : "Already playing audio, queuing ticket"
      );
      return;
    }

    isPlaying.current = true;
    console.log("Starting audio sequence");

    while (audioQueue.current.length > 0) {
      const ticket = audioQueue.current.shift();
      if (ticket && ticket.roomId) {
        const ticketNumber = ticket.ticketNo;
        const roomNumber = ticket.roomId.roomNumber.toString();

        const audioFiles = [
          "/audio/alert.wav",
          "/audio/TicketNumber.wav",
          ...ticketNumber.split("").map((char) => `/audio/${char}.wav`),
          "/audio/proceedtoroom.wav",
          ...roomNumber.split("").map((char) => `/audio/${char}.wav`),
        ];

        for (const audioSrc of audioFiles) {
          await playAudio(audioSrc);
        }
      }
    }

    console.log("Finished audio sequence");
    isPlaying.current = false;
  }, [playAudio, isMuted]);

  const fetchData = useCallback(async () => {
    try {
      const [ticketsRes, eventsRes, adsRes, settingsRes] = await Promise.all([
        fetch("/api/ticket?status=Serving"),
        fetch("/api/hospital/events"),
        fetch("/api/hospital/ads"),
        fetch("/api/hospital/settings"),
      ]);

      const ticketsData = await ticketsRes.json();
      console.log("Fetched tickets:", ticketsData);

      const eventsData = await eventsRes.json();
      const adsData = await adsRes.json();
      const settingsData = await settingsRes.json();

      setTickets(ticketsData);
      setEvents(eventsData);
      setAds(adsData);
      setSettings(settingsData);

      if (ticketsData.length === 0) {
        setLastAnnouncedTicket(null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  const announceTicket = useCallback(
    (ticket: Ticket) => {
      if (!ticket.roomId) {
        console.log("Cannot announce ticket: no room assigned");
        return;
      }

      console.log(
        `Queueing ticket: ${ticket.ticketNo} for room ${ticket.roomId.roomNumber}`
      );
      audioQueue.current.push(ticket);
      playAudioSequence();
    },
    [playAudioSequence]
  );

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

  useEffect(() => {
    if (tickets.length > 0) {
      const latestTicket = tickets[0];
      console.log("Latest ticket:", latestTicket);
      console.log("Last announced ticket:", lastAnnouncedTicket);

      if (latestTicket.ticketNo !== lastAnnouncedTicket) {
        console.log("New ticket detected, announcing");
        announceTicket(latestTicket);
        setLastAnnouncedTicket(latestTicket.ticketNo);
      } else {
        console.log("No new ticket to announce");
      }
    } else {
      setLastAnnouncedTicket(null);
    }
  }, [tickets, lastAnnouncedTicket, announceTicket]);

  useEffect(() => {
    console.log("Last announced ticket updated:", lastAnnouncedTicket);
  }, [lastAnnouncedTicket]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
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
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Logout</DropdownMenuItem>
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
                      {ticket.roomId ? ticket.roomId.roomNumber : "N/A"}
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
            <h2 className="text-xl font-bold mb-4 pt-2">Upcoming Events</h2>
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
        <div className="marquee-container">
          <div className="marquee-content">
            {settings?.notificationText || "Welcome to Octech Bank"}
          </div>
        </div>
      </footer>
    </div>
  );
}
