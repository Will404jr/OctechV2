"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { ArrowRight } from "lucide-react";

interface Ticket {
  _id: string;
  ticketNo: string;
  journeyId: string | null;
}

interface Journey {
  _id: string;
  name: string;
  steps: { id: number; title: string; icon: string }[];
}

const ReceptionistPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [selectedJourneys, setSelectedJourneys] = useState<{
    [key: string]: string;
  }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
    fetchJourneys();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/hospital/ticket?journeyId=null");
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
    }
  };

  const fetchJourneys = async () => {
    try {
      const response = await fetch("/api/hospital/journey");
      if (!response.ok) throw new Error("Failed to fetch journeys");
      const data = await response.json();
      setJourneys(data);
    } catch (error) {
      console.error("Error fetching journeys:", error);
      toast({
        title: "Error",
        description: "Failed to fetch journeys",
        variant: "destructive",
      });
    }
  };

  const handleJourneyChange = (ticketId: string, journeyId: string) => {
    setSelectedJourneys({ ...selectedJourneys, [ticketId]: journeyId });
  };

  const assignJourney = async (ticketId: string) => {
    const journeyId = selectedJourneys[ticketId];
    if (!journeyId) {
      toast({
        title: "Error",
        description: "Please select a journey first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journeyId }),
      });

      if (!response.ok) throw new Error("Failed to assign journey");

      toast({
        title: "Success",
        description: "Journey assigned successfully",
      });
      // Remove the assigned ticket from the list
      setTickets(tickets.filter((ticket) => ticket._id !== ticketId));
    } catch (error) {
      console.error("Error assigning journey:", error);
      toast({
        title: "Error",
        description: "Failed to assign journey",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col">
      <div className="w-full  md:pr-4 mb-4 md:mb-0">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Receptionist Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket No</TableHead>
                  <TableHead>Assign Journey</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket._id}>
                    <TableCell>{ticket.ticketNo}</TableCell>
                    <TableCell>
                      <Select
                        value={selectedJourneys[ticket._id] || ""}
                        onValueChange={(value) =>
                          handleJourneyChange(ticket._id, value)
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select a journey" />
                        </SelectTrigger>
                        <SelectContent>
                          {journeys.map((journey) => (
                            <SelectItem key={journey._id} value={journey._id}>
                              {journey.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button onClick={() => assignJourney(ticket._id)}>
                        Assign Journey
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="w-full  md:pl-4">
        <Card>
          <CardHeader>
            <CardTitle>Available Journeys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {journeys.map((journey) => (
                <Card key={journey._id} className="p-4">
                  <CardTitle className="mb-2">{journey.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {journey.steps.map((step, index) => (
                      <React.Fragment key={step.id}>
                        <div className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                          <span className="mr-2">{step.icon}</span>
                          <span>{step.title}</span>
                        </div>
                        {index < journey.steps.length - 1 && (
                          <ArrowRight className="text-gray-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  );
};

export default ReceptionistPage;
