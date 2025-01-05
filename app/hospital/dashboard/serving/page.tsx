"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { CheckCircle2, Circle } from "lucide-react";
import { SessionData } from "@/lib/session";

interface Ticket {
  _id: string;
  ticketNo: string;
  journeyId: {
    _id: string;
    name: string;
    steps: { title: string; icon: string }[];
  };
  currentStep: number;
  journeySteps: { [key: string]: boolean };
  completed: boolean;
}

const ServingPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const { toast } = useToast();

  const fetchTickets = useCallback(async () => {
    if (!session?.department) return;

    try {
      const response = await fetch(
        `/api/hospital/ticket?department=${session.department}&currentStepOnly=true`
      );
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
  }, [session?.department, toast]);

  useEffect(() => {
    const fetchSession = async () => {
      const response = await fetch("/api/session");
      if (response.ok) {
        const sessionData: SessionData = await response.json();
        setSession(sessionData);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (session?.department) {
      // Initial fetch
      fetchTickets();

      // Set up polling every 5 seconds
      const intervalId = setInterval(fetchTickets, 5000);

      // Cleanup interval on unmount or department change
      return () => clearInterval(intervalId);
    }
  }, [session?.department, fetchTickets]);

  const handleClearTicket = async (ticketId: string, currentStep: number) => {
    try {
      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep }),
      });

      if (!response.ok) throw new Error("Failed to clear ticket");

      toast({
        title: "Success",
        description: "Ticket cleared successfully",
      });

      // Immediate fetch after clearing
      fetchTickets();
    } catch (error) {
      console.error("Error clearing ticket:", error);
      toast({
        title: "Error",
        description: "Failed to clear ticket",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      {session?.department ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Serving Dashboard - {session.department}</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket No</TableHead>
                    <TableHead>Journey</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket._id}>
                      <TableCell>{ticket.ticketNo}</TableCell>
                      <TableCell>{ticket.journeyId.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {ticket.journeyId.steps.map((step, index) => (
                            <React.Fragment key={index}>
                              {index > 0 && (
                                <span className="text-gray-300">→</span>
                              )}
                              <div className="flex items-center">
                                {ticket.journeySteps[step.title] ? (
                                  <CheckCircle2 className="text-green-500 mr-1" />
                                ) : (
                                  <Circle className="text-gray-300 mr-1" />
                                )}
                                <span>{step.title}</span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {ticket.journeyId.steps[ticket.currentStep]?.title ===
                          session.department && (
                          <Button
                            onClick={() =>
                              handleClearTicket(ticket._id, ticket.currentStep)
                            }
                          >
                            Clear Ticket
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center mt-4">
                No tickets available for this department.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div>No department assigned. Please contact an administrator.</div>
      )}
      <Toaster />
    </div>
  );
};

export default ServingPage;
