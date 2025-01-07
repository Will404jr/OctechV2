"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { ArrowRight, Users, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { QueueSpinner } from "@/components/queue-spinner";

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
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTickets(), fetchJourneys()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

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
      setTickets(tickets.filter((ticket) => ticket._id !== ticketId));
      setSelectedJourneys((prev) => {
        const updated = { ...prev };
        delete updated[ticketId];
        return updated;
      });
    } catch (error) {
      console.error("Error assigning journey:", error);
      toast({
        title: "Error",
        description: "Failed to assign journey",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
          {/* <p className="text-muted-foreground">Loading dashboard...</p> */}
        </div>
      </div>
    );
  }

  const JourneyStep = ({
    step,
    isLast,
  }: {
    step: Journey["steps"][0];
    isLast: boolean;
  }) => (
    <>
      <div className="flex items-center bg-secondary/50 rounded-lg px-3 py-1.5 text-sm">
        <span className="mr-2">{step.icon}</span>
        <span>{step.title}</span>
      </div>
      {!isLast && <ArrowRight className="text-muted-foreground mx-1" />}
    </>
  );

  return (
    <ProtectedRoute requiredPermission="Receptionist">
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Receptionist Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage patient journeys and ticket assignments
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Unassigned Tickets
              </CardTitle>
              <CardDescription>
                {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} waiting
                for journey assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tickets.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket No</TableHead>
                        <TableHead>Journey</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow key={ticket._id}>
                          <TableCell className="font-medium">
                            {ticket.ticketNo}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={selectedJourneys[ticket._id] || ""}
                              onValueChange={(value) =>
                                handleJourneyChange(ticket._id, value)
                              }
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select journey" />
                              </SelectTrigger>
                              <SelectContent>
                                {journeys.map((journey) => (
                                  <SelectItem
                                    key={journey._id}
                                    value={journey._id}
                                  >
                                    {journey.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => assignJourney(ticket._id)}
                              disabled={!selectedJourneys[ticket._id]}
                            >
                              Assign Journey
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No unassigned tickets at the moment
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Journeys</CardTitle>
              <CardDescription>
                {journeys.length} journey template
                {journeys.length !== 1 ? "s" : ""} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {journeys.map((journey) => (
                  <Card key={journey._id}>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-3">{journey.name}</h3>
                      <div className="flex items-center flex-wrap gap-2">
                        {journey.steps.map((step, index) => (
                          <JourneyStep
                            key={step.id}
                            step={step}
                            isLast={index === journey.steps.length - 1}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Toaster />
      </div>
    </ProtectedRoute>
  );
};

export default ReceptionistPage;
