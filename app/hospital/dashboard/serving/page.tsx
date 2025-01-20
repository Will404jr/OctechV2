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
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Volume2,
  MessageCircle,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SessionData } from "@/lib/session";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClearTicketDialog } from "@/components/ClearTicketDialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Ticket } from "@/types/ticket";

const ServingPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const { toast } = useToast();
  const [clearingTicket, setClearingTicket] = useState<Ticket | null>(null);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);

  const fetchTickets = useCallback(async () => {
    if (!session?.department) return;

    try {
      const response = await fetch(
        `/api/hospital/ticket?department=${session.department}&currentStepOnly=true`
      );
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();
      setTickets(data);
      if (currentTicketIndex >= data.length && data.length > 0) {
        setCurrentTicketIndex(0);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
    }
  }, [session?.department, toast, currentTicketIndex]);

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

  const getStepData = (ticket: Ticket, stepTitle: string) => {
    if (!ticket.journeyId || !ticket.journeySteps) {
      return { completed: false, note: "" };
    }
    if (ticket.journeySteps instanceof Map) {
      return (
        ticket.journeySteps.get(stepTitle) || { completed: false, note: "" }
      );
    }
    return (
      (
        ticket.journeySteps as {
          [key: string]: { completed: boolean; note: string };
        }
      )[stepTitle] || { completed: false, note: "" }
    );
  };

  const currentTicket = tickets[currentTicketIndex];
  const waitingCount = tickets.length - 1;

  const StatusBadge = ({
    isCompleted,
    isCurrent,
  }: {
    isCompleted: boolean;
    isCurrent: boolean;
  }) => {
    if (isCompleted) return <Badge className="bg-green-500">Completed</Badge>;
    if (isCurrent) return <Badge className="bg-blue-500">In Progress</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
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
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center bg-background shadow-sm rounded-lg p-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Serving Dashboard
            </h1>
            <p className="text-muted-foreground">
              Department: {session.department}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Waiting</p>
                <p className="text-2xl font-bold text-primary">
                  {waitingCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {tickets.length > 0 && currentTicket ? (
          <div className="grid gap-6">
            <Card className="border-t-4 border-t-primary">
              <CardHeader className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-3xl font-bold">
                        #{currentTicket.ticketNo}
                      </CardTitle>
                      <Badge variant="outline" className="text-base">
                        {currentTicketIndex + 1} of {tickets.length}
                      </Badge>
                    </div>
                    <CardDescription className="text-base mt-1">
                      Journey: {currentTicket.journeyId?.name || "N/A"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => callTicket(currentTicket._id)}
                      className="h-10 w-10"
                    >
                      <Volume2 className="h-5 w-5" />
                    </Button>
                    {currentTicket.journeyId?.steps &&
                      Array.isArray(currentTicket.journeyId.steps) &&
                      currentTicket.journeyId.steps[
                        currentTicket.currentStep
                      ] &&
                      currentTicket.journeyId.steps[currentTicket.currentStep]
                        .title === session?.department && (
                        <Button
                          onClick={() => setClearingTicket(currentTicket)}
                          size="default"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Clear Ticket
                        </Button>
                      )}
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                      Reason for Visit
                    </h3>
                    <p className="text-lg">{currentTicket.reasonforVisit}</p>
                  </div>
                  {currentTicket.receptionistNote && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                          Receptionist Note
                        </h3>
                        <p className="text-lg">
                          {currentTicket.receptionistNote}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <h3 className="font-semibold text-lg mb-4">Journey Progress</h3>
                <div className="space-y-3">
                  {currentTicket.journeyId?.steps?.map((step, index) => {
                    const stepData = getStepData(currentTicket, step.title);
                    const isCurrentStep = currentTicket.currentStep === index;

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border transition-all ${
                          isCurrentStep
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {stepData.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className="font-medium text-lg">
                              {step.title}
                            </span>
                          </div>
                          <StatusBadge
                            isCompleted={stepData.completed}
                            isCurrent={isCurrentStep}
                          />
                        </div>
                        {stepData.completed && stepData.note && (
                          <div className="ml-8 mt-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <MessageCircle className="h-4 w-4" />
                              <span>Department Note:</span>
                            </div>
                            <p className="text-sm bg-background p-2 rounded-md border">
                              {stepData.note}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>

              <CardFooter className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentTicketIndex((prev) =>
                      prev > 0 ? prev - 1 : tickets.length - 1
                    )
                  }
                  disabled={tickets.length <= 1}
                  className="w-[120px]"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentTicketIndex((prev) =>
                      prev < tickets.length - 1 ? prev + 1 : 0
                    )
                  }
                  disabled={tickets.length <= 1}
                  className="w-[120px]"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground/60" />
              <p className="text-lg font-medium">No active tickets</p>
              <p className="text-sm mt-1">
                New tickets will appear here automatically
              </p>
            </CardContent>
          </Card>
        )}

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
