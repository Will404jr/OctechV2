"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  CheckCircle2,
  AlertCircle,
  Volume2,
  Users,
  PauseCircle,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QueueSpinner } from "@/components/queue-spinner";
import type { SessionData } from "@/lib/session";
import { RoomSelectionDialog } from "@/components/RoomSelectionDialog";
import { DepartmentSelectionDialog } from "@/components/hospital/DepartmentSelectionDialog";

interface Ticket {
  _id: string;
  ticketNo: string;
  call: boolean;
  noShow?: boolean;
  reasonforVisit?: string;
  receptionistNote?: string;
  held?: boolean;
  departmentHistory?: {
    department: string;
    timestamp: string;
    note?: string;
    completed?: boolean;
  }[];
  userType?: string;
}

interface Department {
  _id: string;
  title: string;
  icon: string;
  rooms: {
    _id: string;
    roomNumber: string;
    staff: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    available: boolean;
  }[];
}

const ServingPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [heldTickets, setHeldTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [departmentNote, setDepartmentNote] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [showNextStepDialog, setShowNextStepDialog] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isServing, setIsServing] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const updateRoomServingTicket = async (ticketId: string | null) => {
    if (!roomId) return;

    try {
      const response = await fetch(`/api/hospital/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentTicket: ticketId,
          available: ticketId ? false : true,
        }),
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
    if (!session?.department) return;

    try {
      console.log(`Fetching tickets for department: ${session.department}`);

      // Fetch regular tickets for this department
      const response = await fetch(
        `/api/hospital/ticket?department=${session.department}`
      );
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();
      console.log(`Found ${data.length} regular tickets`);

      // Fetch held tickets for this department
      const heldResponse = await fetch(
        `/api/hospital/ticket?department=${session.department}&held=true`
      );
      if (!heldResponse.ok) throw new Error("Failed to fetch held tickets");
      const heldData = await heldResponse.json();
      console.log(`Found ${heldData.length} held tickets`);

      setHeldTickets(heldData);

      // Make sure we're not showing the current ticket in the tickets list
      const filteredData = currentTicket
        ? data.filter((t: Ticket) => t._id !== currentTicket._id)
        : data;

      if (!isServing) {
        // When not serving, just update the waiting tickets
        setTickets(filteredData);
      } else {
        // When serving, handle current ticket and waiting tickets
        if (!currentTicket && filteredData.length > 0) {
          const [nextTicket, ...remainingTickets] = filteredData;
          console.log(`Setting current ticket to: ${nextTicket.ticketNo}`);
          setCurrentTicket(nextTicket);
          setTickets(remainingTickets);
          updateRoomServingTicket(nextTicket._id);
        } else {
          setTickets(filteredData);
        }
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
    }
  }, [session?.department, isServing, currentTicket, toast]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch("/api/hospital/department");
      if (!response.ok) throw new Error("Failed to fetch departments");
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive",
      });
    }
  }, [toast]);

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
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTickets(), fetchDepartments()]);
      setIsLoading(false);
    };
    loadData();

    const pollInterval = setInterval(fetchTickets, 5000);
    return () => clearInterval(pollInterval);
  }, [fetchTickets, fetchDepartments]);

  useEffect(() => {
    if (session && session.department === "Reception") {
      router.push("/hospital/receptionist");
    }
  }, [session, router]);

  const handleRoomSelection = async (roomNumber: number) => {
    try {
      if (!roomId) {
        // If no room exists, create a new one
        const response = await fetch("/api/hospital/room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId: session?.userId,
            department: session?.department,
            roomNumber,
            available: true,
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
      } else {
        // If room exists, update it
        const response = await fetch(`/api/hospital/room/${roomId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomNumber,
            available: true,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update room");
        }
      }

      setShowRoomDialog(false);
    } catch (error) {
      console.error("Error updating room:", error);
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
          description: "Failed to update room",
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
      setIsServing(true);
      await fetchTickets();
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
      setIsPausing(true);
      toast({
        title: "Pausing",
        description:
          "Please complete or hold the current ticket before pausing",
        variant: "default",
      });
    } else {
      setIsServing(false);
      setIsPausing(false);
      setCurrentTicket(null);
      updateRoomServingTicket(null);
      toast({
        title: "Paused",
        description: "Serving has been paused",
        variant: "default",
      });
    }
  };

  const handleNextStep = async (departmentId: string, roomId?: string) => {
    if (!currentTicket || !session?.department) return;

    try {
      const response = await fetch(
        `/api/hospital/ticket/${currentTicket._id}/next-step`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            departmentId,
            roomId,
            departmentNote,
            currentDepartment: session.department,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to assign next step");

      toast({
        title: "Success",
        description: "Ticket forwarded to next department",
      });

      // Clear current ticket
      setCurrentTicket(null);

      // Update room status
      updateRoomServingTicket(null);

      // Reset form
      setDepartmentNote("");
      setShowNextStepDialog(false);

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false);
        setIsPausing(false);
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        });
      } else {
        // Immediately fetch tickets to get the next one in queue
        const ticketsResponse = await fetch(
          `/api/hospital/ticket?department=${session.department}`
        );
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json();
          console.log(`Found ${ticketsData.length} tickets after forwarding`);

          // If there are tickets waiting and we're still in serving mode, pick up the next one
          if (ticketsData.length > 0 && isServing) {
            const nextTicket = ticketsData[0];
            console.log(`Auto-picking next ticket: ${nextTicket.ticketNo}`);
            setCurrentTicket(nextTicket);
            updateRoomServingTicket(nextTicket._id);

            // Update the tickets list without the new current ticket
            setTickets(ticketsData.slice(1));
          } else {
            // No tickets left or not serving
            setTickets(ticketsData);
          }
        }
      }
    } catch (error) {
      console.error("Error assigning next step:", error);
      toast({
        title: "Error",
        description: "Failed to assign next step",
        variant: "destructive",
      });
    }
  };

  const handleClearTicket = async () => {
    if (!currentTicket || !session?.department) return;

    try {
      const response = await fetch(
        `/api/hospital/ticket/${currentTicket._id}/clear`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            departmentNote,
            currentDepartment: session.department,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to clear ticket");

      toast({
        title: "Success",
        description: "Ticket cleared successfully",
      });

      // Clear current ticket
      setCurrentTicket(null);
      updateRoomServingTicket(null);

      // Reset form
      setDepartmentNote("");

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false);
        setIsPausing(false);
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        });
      } else {
        // Immediately fetch tickets to get the next one in queue
        const ticketsResponse = await fetch(
          `/api/hospital/ticket?department=${session.department}`
        );
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json();
          console.log(`Found ${ticketsData.length} tickets after clearing`);

          // If there are tickets waiting and we're still in serving mode, pick up the next one
          if (ticketsData.length > 0 && isServing) {
            const nextTicket = ticketsData[0];
            console.log(`Auto-picking next ticket: ${nextTicket.ticketNo}`);
            setCurrentTicket(nextTicket);
            updateRoomServingTicket(nextTicket._id);

            // Update the tickets list without the new current ticket
            setTickets(ticketsData.slice(1));
          } else {
            // No tickets left or not serving
            setTickets(ticketsData);
          }
        }
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

  const handleHoldTicket = async () => {
    if (!currentTicket) return;

    try {
      const response = await fetch(
        `/api/hospital/ticket/${currentTicket._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            held: true,
            departmentNote,
            currentDepartment: session?.department,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to hold ticket");

      toast({
        title: "Success",
        description: "Ticket placed on hold",
      });

      // Clear current ticket
      setCurrentTicket(null);
      updateRoomServingTicket(null);

      // Reset form
      setDepartmentNote("");

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false);
        setIsPausing(false);
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        });
      } else if (session?.department) {
        // Immediately fetch tickets to get the next one in queue
        const ticketsResponse = await fetch(
          `/api/hospital/ticket?department=${session.department}`
        );
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json();

          // Fetch held tickets to update that list too
          const heldResponse = await fetch(
            `/api/hospital/ticket?department=${session.department}&held=true`
          );
          if (heldResponse.ok) {
            const heldData = await heldResponse.json();
            setHeldTickets(heldData);
          }

          console.log(`Found ${ticketsData.length} tickets after holding`);

          // If there are tickets waiting and we're still in serving mode, pick up the next one
          if (ticketsData.length > 0 && isServing) {
            const nextTicket = ticketsData[0];
            console.log(`Auto-picking next ticket: ${nextTicket.ticketNo}`);
            setCurrentTicket(nextTicket);
            updateRoomServingTicket(nextTicket._id);

            // Update the tickets list without the new current ticket
            setTickets(ticketsData.slice(1));
          } else {
            // No tickets left or not serving
            setTickets(ticketsData);
          }
        }
      }
    } catch (error) {
      console.error("Error holding ticket:", error);
      toast({
        title: "Error",
        description: "Failed to hold ticket",
        variant: "destructive",
      });
    }
  };

  const handleUnholdTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ held: false }),
      });

      if (!response.ok) throw new Error("Failed to unhold ticket");

      toast({
        title: "Success",
        description: "Ticket returned to queue",
      });

      // Update tickets
      await fetchTickets();
    } catch (error) {
      console.error("Error unholding ticket:", error);
      toast({
        title: "Error",
        description: "Failed to return ticket to queue",
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

      // Clear current ticket
      setCurrentTicket(null);
      updateRoomServingTicket(null);

      // Reset form
      setDepartmentNote("");

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false);
        setIsPausing(false);
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        });
      } else if (session?.department) {
        // Immediately fetch tickets to get the next one in queue
        const ticketsResponse = await fetch(
          `/api/hospital/ticket?department=${session.department}`
        );
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json();
          console.log(`Found ${ticketsData.length} tickets after cancelling`);

          // If there are tickets waiting and we're still in serving mode, pick up the next one
          if (ticketsData.length > 0 && isServing) {
            const nextTicket = ticketsData[0];
            console.log(`Auto-picking next ticket: ${nextTicket.ticketNo}`);
            setCurrentTicket(nextTicket);
            updateRoomServingTicket(nextTicket._id);

            // Update the tickets list without the new current ticket
            setTickets(ticketsData.slice(1));
          } else {
            // No tickets left or not serving
            setTickets(ticketsData);
          }
        }
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

  if (!session || !session.department) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are not authorized to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center bg-background shadow-sm rounded-lg p-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {session.department} Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage patient tickets for {session.department}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Waiting</p>
              <p className="text-2xl font-bold text-primary">
                {tickets.length}
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
            <Button
              onClick={pauseServing}
              variant="destructive"
              className="gap-2"
            >
              <PauseCircle className="h-4 w-4" />
              {isPausing ? "Complete Current Ticket to Pause" : "Pause Serving"}
            </Button>
          ) : (
            <Button
              onClick={startServing}
              variant="secondary"
              className="gap-2"
            >
              <PlayCircle className="h-4 w-4" />
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
                  {currentTicket.userType && (
                    <Badge variant="secondary" className="text-base">
                      {currentTicket.userType}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={callTicket}
                  className="h-10 w-10"
                >
                  <Volume2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                  Reason for Visit
                </h3>
                <p className="text-lg">
                  {currentTicket.reasonforVisit || "Not specified"}
                </p>
              </div>
              {currentTicket.receptionistNote && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                      Receptionist Note
                    </h3>
                    <p className="text-lg">{currentTicket.receptionistNote}</p>
                  </div>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <h3 className="font-semibold text-lg mb-4">Department History</h3>
            {currentTicket.departmentHistory &&
            currentTicket.departmentHistory.length > 0 ? (
              <div className="space-y-3">
                {currentTicket.departmentHistory.map((history, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-muted/50"
                  >
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{history.department}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(history.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {history.note && (
                      <p className="text-sm mt-2 bg-background p-2 rounded-md">
                        {history.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No previous departments</p>
            )}

            <div className="mt-6 space-y-2">
              <label className="text-sm font-medium">Department Note</label>
              <Textarea
                placeholder="Add notes about this patient..."
                value={departmentNote}
                onChange={(e) => setDepartmentNote(e.target.value)}
                className="h-32"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" onClick={handleHoldTicket}>
              Hold Ticket
            </Button>
            <Button variant="destructive" onClick={cancelTicket}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowNextStepDialog(true)}
              className="gap-2"
            >
              Next Step
            </Button>
            <Button onClick={handleClearTicket} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Clear Ticket
            </Button>
          </CardFooter>
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

      {/* Held Tickets Section */}
      {heldTickets.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Held Tickets</CardTitle>
            <CardDescription>
              {heldTickets.length} ticket{heldTickets.length !== 1 ? "s" : ""}{" "}
              on hold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {heldTickets.map((ticket) => (
                <Card key={ticket._id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold mb-1">
                          #{ticket.ticketNo}
                        </h3>
                        {ticket.reasonforVisit && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {ticket.reasonforVisit}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnholdTicket(ticket._id)}
                      >
                        Return to Queue
                      </Button>
                    </div>
                    {ticket.departmentHistory &&
                      ticket.departmentHistory.length > 0 && (
                        <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                          <p className="font-medium mb-1">
                            Department History:
                          </p>
                          <ul className="space-y-1">
                            {ticket.departmentHistory.map((hist, idx) => (
                              <li key={idx}>
                                {hist.department} -{" "}
                                {hist.completed ? "Completed" : "Pending"}
                                {hist.note && (
                                  <p className="text-xs text-muted-foreground">
                                    {hist.note}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    {ticket.receptionistNote && (
                      <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                        <p className="font-medium mb-1">Receptionist Notes:</p>
                        <p>{ticket.receptionistNote}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <RoomSelectionDialog
        isOpen={showRoomDialog}
        onClose={() => setShowRoomDialog(false)}
        onSubmit={handleRoomSelection}
        staffId={session?.userId || ""}
        department={session?.department || ""}
      />

      <DepartmentSelectionDialog
        isOpen={showNextStepDialog}
        onClose={() => setShowNextStepDialog(false)}
        onSubmit={handleNextStep}
        departments={departments}
      />

      <Toaster />
    </div>
  );
};

export default ServingPage;
