"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  Volume2,
  MessageCircle,
} from "lucide-react";
import { SessionData } from "@/lib/session";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClearTicketDialog } from "@/components/ClearTicketDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Ticket {
  _id: string;
  ticketNo: string;
  journeyId: {
    _id: string;
    name: string;
    steps: { title: string; icon: string }[];
  };
  currentStep: number;
  journeySteps:
    | Map<string, { completed: boolean; note: string }>
    | { [key: string]: { completed: boolean; note: string } };
  completed: boolean;
}

const ServingPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { toast } = useToast();
  const [clearingTicket, setClearingTicket] = useState<Ticket | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!session?.department) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/hospital/ticket?department=${session.department}&currentStepOnly=true`
      );
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();
      setTickets(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.department, toast]);

  const callTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call: true }),
      });
      if (!response.ok) throw new Error("Failed to call ticket");
      const updatedTicket = await response.json();
      toast({
        title: "Success",
        description: "Ticket called successfully",
      });
      // Update the local state to reflect the change
      setTickets(
        tickets.map((ticket) =>
          ticket._id === ticketId ? { ...ticket, ...updatedTicket } : ticket
        )
      );
    } catch (error) {
      console.error("Error calling ticket:", error);
      toast({
        title: "Error",
        description: "Failed to call ticket",
        variant: "destructive",
      });
    }
  };

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
      fetchTickets();
      const intervalId = setInterval(fetchTickets, 5000);
      return () => clearInterval(intervalId);
    }
  }, [session?.department, fetchTickets]);

  const handleClearTicket = async (
    ticketId: string,
    currentStep: number,
    note?: string
  ) => {
    try {
      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep, note }),
      });

      if (!response.ok) throw new Error("Failed to clear ticket");

      toast({
        title: "Success",
        description: "Ticket cleared successfully",
      });

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

  const JourneyStep = ({
    step,
    stepData,
    isCurrent,
    isLast,
    previousNote,
  }: {
    step: { title: string };
    stepData: { completed: boolean; note: string };
    isCurrent: boolean;
    isLast: boolean;
    previousNote?: string;
  }) => (
    <div className="flex items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex items-center gap-1 p-1.5 rounded-md transition-colors ${
                isCurrent ? "bg-primary/10" : ""
              }`}
            >
              {stepData.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-sm whitespace-nowrap">{step.title}</span>
              {previousNote && (
                <MessageCircle className="h-4 w-4 text-blue-500 flex-shrink-0 ml-1" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {previousNote ? (
              <div>
                <p className="font-semibold">Previous step note:</p>
                <p>{previousNote}</p>
              </div>
            ) : (
              <p>{stepData.completed ? "Completed" : "Not completed"}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {!isLast && (
        <div className="flex items-center mx-2">
          <ArrowRight
            className={`h-4 w-4 ${
              stepData.completed ? "text-green-500" : "text-muted-foreground"
            } transition-colors`}
          />
        </div>
      )}
    </div>
  );

  const getStepData = (ticket: Ticket, stepTitle: string) => {
    if (ticket.journeySteps instanceof Map) {
      return (
        ticket.journeySteps.get(stepTitle) || { completed: false, note: "" }
      );
    } else {
      return ticket.journeySteps[stepTitle] || { completed: false, note: "" };
    }
  };

  if (!session?.department) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No department assigned. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission="Serving">
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Serving Dashboard
            </h1>
            <p className="text-muted-foreground">
              Department: {session.department}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchTickets}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Tickets</CardTitle>
            <CardDescription>
              Currently serving {tickets.length} ticket
              {tickets.length !== 1 ? "s" : ""}
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
                      <TableHead className="w-[50%]">Progress</TableHead>
                      <TableHead>Call</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket._id}>
                        <TableCell className="font-medium">
                          {ticket.ticketNo}
                        </TableCell>
                        <TableCell>{ticket.journeyId?.name || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center flex-wrap gap-y-2">
                            {ticket.journeyId?.steps?.map((step, index) => {
                              const stepData = getStepData(ticket, step.title);
                              const previousStepTitle =
                                index > 0
                                  ? ticket.journeyId.steps[index - 1].title
                                  : null;
                              const previousNote = previousStepTitle
                                ? getStepData(ticket, previousStepTitle).note
                                : undefined;

                              return (
                                <JourneyStep
                                  key={index}
                                  step={step}
                                  stepData={stepData}
                                  isCurrent={ticket.currentStep === index}
                                  isLast={
                                    index ===
                                    (ticket.journeyId?.steps?.length || 0) - 1
                                  }
                                  previousNote={previousNote}
                                />
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => callTicket(ticket._id)}
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          {ticket.journeyId?.steps &&
                            Array.isArray(ticket.journeyId.steps) &&
                            ticket.journeyId.steps[ticket.currentStep] &&
                            ticket.journeyId.steps[ticket.currentStep].title ===
                              session?.department && (
                              <Button
                                onClick={() => setClearingTicket(ticket)}
                                size="sm"
                              >
                                Clear Ticket
                              </Button>
                            )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No active tickets for this department</p>
                <p className="text-sm">
                  New tickets will appear here automatically
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        {clearingTicket && (
          <ClearTicketDialog
            isOpen={!!clearingTicket}
            onClose={() => setClearingTicket(null)}
            onClear={(note) => {
              handleClearTicket(
                clearingTicket._id,
                clearingTicket.currentStep,
                note
              );
              setClearingTicket(null);
            }}
            ticketNo={clearingTicket.ticketNo}
          />
        )}
        <Toaster />
      </div>
    </ProtectedRoute>
  );
};

export default ServingPage;
