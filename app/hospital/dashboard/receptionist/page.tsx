"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  ArrowRight,
  Users,
  AlertCircle,
  Volume2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { QueueSpinner } from "@/components/queue-spinner";
import { Badge } from "@/components/ui/badge";

interface Ticket {
  _id: string;
  ticketNo: string;
  journeyId: string | null;
  call: boolean;
  noShow?: boolean;
}

interface Journey {
  _id: string;
  name: string;
  steps: { id: number; title: string; icon: string }[];
}

const POLLING_INTERVAL = 5000;
const DUMMY_REASONS = ["Check-up", "Follow-up", "Emergency", "Other"];

const ReceptionistPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<string>("");
  const [reasonForVisit, setReasonForVisit] = useState<string>("");
  const [receptionistNote, setReceptionistNote] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTickets = useCallback(async () => {
    try {
      const response = await fetch("/api/hospital/ticket?journeyId=null");
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();
      setTickets(data);
      if (!currentTicket && data.length > 0) {
        setCurrentTicket(data[0]);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
    }
  }, [toast, currentTicket]);

  const fetchJourneys = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTickets(), fetchJourneys()]);
      setIsLoading(false);
    };
    loadData();

    const pollInterval = setInterval(fetchTickets, POLLING_INTERVAL);
    return () => clearInterval(pollInterval);
  }, [fetchTickets, fetchJourneys]);

  const assignJourney = async () => {
    if (!currentTicket) return;

    if (!selectedJourney || !reasonForVisit) {
      toast({
        title: "Error",
        description: "Please select a journey and reason for visit",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/hospital/ticket/${currentTicket._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            journeyId: selectedJourney,
            reasonforVisit: reasonForVisit,
            receptionistNote,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to assign journey");

      toast({
        title: "Success",
        description: "Journey assigned successfully",
      });

      setTickets(tickets.filter((t) => t._id !== currentTicket._id));
      setCurrentTicket(tickets.length > 1 ? tickets[1] : null);
      setSelectedJourney("");
      setReasonForVisit("");
      setReceptionistNote("");
    } catch (error) {
      console.error("Error assigning journey:", error);
      toast({
        title: "Error",
        description: "Failed to assign journey",
        variant: "destructive",
      });
    }
  };

  const cancelTicket = async () => {
    if (!currentTicket) return;

    try {
      const response = await fetch(
        `/api/hospital/ticket/${currentTicket._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noShow: true }),
        }
      );

      if (!response.ok) throw new Error("Failed to cancel ticket");

      toast({
        title: "Success",
        description: "Ticket cancelled successfully",
      });

      setTickets(tickets.filter((t) => t._id !== currentTicket._id));
      setCurrentTicket(tickets.length > 1 ? tickets[1] : null);
      setSelectedJourney("");
      setReasonForVisit("");
      setReceptionistNote("");
    } catch (error) {
      console.error("Error cancelling ticket:", error);
      toast({
        title: "Error",
        description: "Failed to cancel ticket",
        variant: "destructive",
      });
    }
  };

  const callTicket = async () => {
    if (!currentTicket) return;

    try {
      const response = await fetch(
        `/api/hospital/ticket/${currentTicket._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ call: true }),
        }
      );

      if (!response.ok) throw new Error("Failed to call ticket");

      const updatedTicket = await response.json();
      setCurrentTicket({ ...currentTicket, ...updatedTicket });

      toast({
        title: "Success",
        description: "Ticket called successfully",
      });
    } catch (error) {
      console.error("Error calling ticket:", error);
      toast({
        title: "Error",
        description: "Failed to call ticket",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
        </div>
      </div>
    );
  }

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

        <div className="grid lg:grid-cols-7 gap-6">
          {/* Current Ticket Section */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Current Ticket
              </CardTitle>
              <CardDescription>
                Serving ticket {currentTicket?.ticketNo || "No active ticket"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentTicket ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="text-lg px-4 py-1">
                        #{currentTicket.ticketNo}
                      </Badge>
                      {currentTicket.call && (
                        <Badge variant="secondary" className="px-2">
                          Called
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={callTicket}
                      disabled={currentTicket.call}
                      className="gap-2"
                    >
                      <Volume2 className="h-4 w-4" />
                      Call Ticket
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Reason for Visit
                        </label>
                        <Select
                          value={reasonForVisit}
                          onValueChange={setReasonForVisit}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                          <SelectContent>
                            {DUMMY_REASONS.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Journey</label>
                        <Select
                          value={selectedJourney}
                          onValueChange={setSelectedJourney}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select journey" />
                          </SelectTrigger>
                          <SelectContent>
                            {journeys.map((journey) => (
                              <SelectItem key={journey._id} value={journey._id}>
                                {journey.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Receptionist Note
                      </label>
                      <Textarea
                        placeholder="Add any additional notes here..."
                        value={receptionistNote}
                        onChange={(e) => setReceptionistNote(e.target.value)}
                        className="h-32"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No ticket currently being served
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            {currentTicket && (
              <CardFooter className="flex justify-end gap-3 border-t pt-6">
                <Button variant="destructive" onClick={cancelTicket}>
                  Cancel Ticket
                </Button>
                <Button
                  onClick={assignJourney}
                  disabled={!selectedJourney || !reasonForVisit}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete & Assign
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Waiting Tickets Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Waiting List
              </CardTitle>
              <CardDescription>
                {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} in
                queue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tickets.length > 0 ? (
                <div className="space-y-2">
                  {tickets.map((ticket, index) => (
                    <div
                      key={ticket._id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                    >
                      <Badge
                        variant="outline"
                        className="w-8 h-8 rounded-full flex items-center justify-center p-0"
                      >
                        {index + 1}
                      </Badge>
                      <span className="font-medium">#{ticket.ticketNo}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No tickets in the waiting list
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Available Journeys Section */}
          <Card className="lg:col-span-5">
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
                          <React.Fragment key={step.id}>
                            <div className="flex items-center bg-secondary/50 rounded-lg px-3 py-1.5 text-sm">
                              <span className="mr-2">{step.icon}</span>
                              <span>{step.title}</span>
                            </div>
                            {index !== journey.steps.length - 1 && (
                              <ArrowRight className="text-muted-foreground mx-1" />
                            )}
                          </React.Fragment>
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
