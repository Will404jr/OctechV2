"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
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
  XCircle,
} from "lucide-react";
import type { SessionData } from "@/lib/session";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClearTicketDialog } from "@/components/ClearTicketDialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Ticket } from "@/types/ticket";
import { RoomSelectionDialog } from "@/components/RoomSelectionDialog";
import { QueueSpinner } from "@/components/queue-spinner";

const ServingPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const { toast } = useToast();
  const [clearingTicket, setClearingTicket] = useState<Ticket | null>(null);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isServing, setIsServing] = useState(false);
  const [isPausing, setIsPausing] = useState(false);

  const updateRoomServingTicket = async (ticketNo: string) => {
    if (!roomId) return;

    try {
      const response = await fetch(`/api/hospital/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servingTicket: ticketNo }),
      });
      if (!response.ok) throw new Error("Failed to update room serving ticket");
    } catch (error) {
      console.error("Error updating room serving ticket:", error);
      toast({
        title: "Error",
        description: "Failed to update room serving ticket",
        variant: "destructive",
      });
    }
  };

  const fetchTickets = useCallback(async () => {
    if (!session?.department) return [];

    try {
      const response = await fetch(
        `/api/hospital/ticket?department=${session.department}&currentStepOnly=true`
      );
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();

      if (!isServing) {
        // When not serving, just update the waiting tickets
        setTickets(data);
      } else {
        // When serving, handle current ticket and waiting tickets
        if (!currentTicket && data.length > 0) {
          const [nextTicket, ...remainingTickets] = data;
          setCurrentTicket(nextTicket);
          updateRoomServingTicket(nextTicket.ticketNo);
          setTickets(remainingTickets);
        } else {
          const filteredData = currentTicket
            ? data.filter((ticket: Ticket) => ticket._id !== currentTicket._id)
            : data;
          setTickets(filteredData);
        }
      }

      return data;
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
      return [];
    }
  }, [
    session?.department,
    isServing,
    currentTicket,
    toast,
    updateRoomServingTicket,
  ]);

  const callTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call: true }),
      });
      if (!response.ok) throw new Error("Failed to call ticket");

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

  useEffect(() => {
    const fetchSession = async () => {
      const response = await fetch("/api/session");
      if (response.ok) {
        const sessionData: SessionData = await response.json();
        setSession(sessionData);
        if (sessionData.roomId) {
          setRoomId(sessionData.roomId);
          setIsServing(false);
        } else {
          setShowRoomDialog(true);
        }
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (session?.department) {
      // Initial fetch
      fetchTickets();

      // Set up polling
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

      // Clear current ticket
      setCurrentTicket(null);
      updateRoomServingTicket("");

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false);
        setIsPausing(false);
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        });
        return; // Don't fetch next ticket if pausing
      }

      // Fetch fresh tickets only if not pausing
      const freshTickets = await fetchTickets();

      if (freshTickets.length > 0) {
        const [nextTicket, ...remainingTickets] = freshTickets;
        setCurrentTicket(nextTicket);
        updateRoomServingTicket(nextTicket.ticketNo);
        setTickets(remainingTickets);
      } else {
        toast({
          title: "No more tickets",
          description: "There are no more tickets available at the moment.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error clearing ticket:", error);
      toast({
        title: "Error",
        description: "Failed to clear ticket",
        variant: "destructive",
      });
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noShow: true }),
      });

      if (!response.ok) throw new Error("Failed to cancel ticket");

      toast({
        title: "Success",
        description: "Ticket cancelled successfully",
      });

      // Clear current ticket
      setCurrentTicket(null);
      updateRoomServingTicket("");

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false);
        setIsPausing(false);
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        });
        return; // Don't fetch next ticket if pausing
      }

      // Fetch fresh tickets only if not pausing
      const freshTickets = await fetchTickets();

      if (freshTickets.length > 0) {
        const [nextTicket, ...remainingTickets] = freshTickets;
        setCurrentTicket(nextTicket);
        updateRoomServingTicket(nextTicket.ticketNo);
        setTickets(remainingTickets);
      } else {
        toast({
          title: "No more tickets",
          description: "There are no more tickets available at the moment.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error cancelling ticket:", error);
      toast({
        title: "Error",
        description: "Failed to cancel ticket",
        variant: "destructive",
      });
    }
  };

  const handleRoomSelection = async (roomNumber: number) => {
    try {
      const response = await fetch("/api/hospital/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: session?.userId,
          department: session?.department,
          roomNumber,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create room");
      }
      const room = await response.json();
      setRoomId(room._id);

      // Update session with roomId
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room._id }),
      });

      setShowRoomDialog(false);
    } catch (error) {
      console.error("Error creating room:", error);
      if (
        error instanceof Error &&
        error.message ===
          "A room with this number already exists in the department"
      ) {
        toast({
          title: "Room Already Exists",
          description:
            "A room with this number already exists in the department. Please choose a different room number.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create room",
          variant: "destructive",
        });
      }
    }
  };

  const handleChangeRoom = () => {
    setShowRoomDialog(true);
  };

  const startServing = async () => {
    try {
      // Set serving state first
      setIsServing(true);

      // Fetch tickets
      const response = await fetch(
        `/api/hospital/ticket?department=${session?.department}&currentStepOnly=true`
      );
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const fetchedTickets = await response.json();

      if (fetchedTickets.length > 0) {
        // Set first ticket as current and rest as waiting
        const [firstTicket, ...remainingTickets] = fetchedTickets;
        setCurrentTicket(firstTicket);
        updateRoomServingTicket(firstTicket.ticketNo);
        setTickets(remainingTickets);
      } else {
        setCurrentTicket(null);
        setTickets([]);
        toast({
          title: "No tickets",
          description: "There are no tickets available at the moment.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error starting serving:", error);
      toast({
        title: "Error",
        description: "Failed to start serving",
        variant: "destructive",
      });
      setIsServing(false);
    }
  };

  const pauseServing = () => {
    if (currentTicket) {
      // If there's a current ticket, set pausing state
      setIsPausing(true);
      toast({
        title: "Pausing",
        description: "Please clear or cancel the current ticket before pausing",
        variant: "default",
      });
    } else {
      // If no current ticket, pause immediately
      setIsServing(false);
      setIsPausing(false);
      updateRoomServingTicket("");
      toast({
        title: "Paused",
        description: "Serving has been paused",
        variant: "default",
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

  const waitingCount = isServing
    ? tickets.length
    : tickets.length + (currentTicket ? 1 : 0);

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

  if (!session) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
          {/* <p className="text-lg font-medium">Loading...</p> */}
        </div>
      </div>
    );
  }

  if (!session.department) {
    return null; // This will prevent any flash of content before redirecting
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

        {roomId && (
          <div className="flex justify-between items-center mt-4">
            <Button onClick={handleChangeRoom} variant="outline">
              Change Room
            </Button>
            {isServing ? (
              <Button onClick={pauseServing} variant="destructive">
                {isPausing ? "Clear Current Ticket to Pause" : "Pause Serving"}
              </Button>
            ) : (
              <Button onClick={startServing} variant="secondary">
                Start Serving
              </Button>
            )}
          </div>
        )}

        {isServing && currentTicket ? (
          <Card className="mt-6 border-t-4 border-t-primary">
            <CardHeader className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-3xl font-bold">
                      #{currentTicket.ticketNo}
                    </CardTitle>
                    <Badge variant="outline" className="text-base">
                      Current
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
                    currentTicket.journeyId.steps[currentTicket.currentStep] &&
                    currentTicket.journeyId.steps[currentTicket.currentStep]
                      .title === session?.department && (
                      <>
                        <Button
                          onClick={() => setClearingTicket(currentTicket)}
                          size="default"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Clear Ticket
                        </Button>
                        <Button
                          onClick={() => handleCancelTicket(currentTicket._id)}
                          size="default"
                          variant="destructive"
                        >
                          <XCircle className="h-5 w-5 mr-2" />
                          Cancel
                        </Button>
                      </>
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
          </Card>
        ) : (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground/60" />
              <p className="text-lg font-medium">No active ticket</p>
              <p className="text-sm mt-1">
                {isServing
                  ? "Waiting for the next ticket..."
                  : "Click 'Start Serving' to begin"}
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

        <RoomSelectionDialog
          isOpen={showRoomDialog}
          onClose={() => setShowRoomDialog(false)}
          onSubmit={handleRoomSelection}
          staffId={session?.userId || ""}
          department={session?.department || ""}
        />
        <Toaster />
      </div>
    </ProtectedRoute>
  );
};

export default ServingPage;
