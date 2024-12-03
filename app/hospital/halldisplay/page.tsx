"use client";

import { useState, useEffect } from "react";
import { User, ArrowRight } from "lucide-react";
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
  counter?: number;
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

export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsRes, exchangeRatesRes, adsRes, settingsRes] =
          await Promise.all([
            fetch("/api/ticket?status=Serving"),
            fetch("/api/hospital/exchange-rates"),
            fetch("/api/hospital/ads"),
            fetch("/api/hospital/settings"),
          ]);

        const ticketsData = await ticketsRes.json();
        const exchangeRatesData = await exchangeRatesRes.json();
        const adsData = await adsRes.json();
        const settingsData = await settingsRes.json();

        setTickets(ticketsData);
        setExchangeRates(exchangeRatesData);
        setAds(adsData);
        setSettings(settingsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, 5000); // Change ad every 5 seconds

    return () => clearInterval(timer);
  }, [ads.length]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-[#0e4480] text-white p-4 flex justify-between items-center">
        <div className="text-2xl font-bold">Octech</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Content */}
      <main className="flex-grow flex p-4 space-x-4 overflow-hidden">
        {/* Tickets */}
        <Card className="w-1/4 overflow-auto">
          <CardContent>
            <h2 className="text-xl font-bold mb-2">Serving Tickets</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket No</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Counter</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket._id}>
                    <TableCell>{ticket.ticketNo}</TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="mx-auto text-blue-500" />
                    </TableCell>
                    <TableCell>{ticket.counter || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Ads */}
        <div className="w-1/2 overflow-hidden relative">
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

        {/* Exchange Rates */}
        <Card className="w-1/4 overflow-auto">
          <CardContent>
            <h2 className="text-xl font-bold mb-2">Exchange Rates</h2>
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

      {/* Marquee */}
      <footer className="bg-[#0e4480] text-white p-2 overflow-hidden">
        <div className="marquee-container">
          <div className="animate-marquee">
            {settings?.notificationText || "Welcome to Octech Bank"}
          </div>
        </div>
      </footer>
    </div>
  );
}
