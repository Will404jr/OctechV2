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
  Users,
  AlertCircle,
  Volume2,
  Clock,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QueueSpinner } from "@/components/queue-spinner";
import { Badge } from "@/components/ui/badge";
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

const POLLING_INTERVAL = 5000;
const USER_TYPES = ["Cash", "Insurance", "Staff"];

const ReceptionistPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [heldTickets, setHeldTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [userType, setUserType] = useState<string>("");
  const [reasonForVisit, setReasonForVisit] = useState<string>("");
  const [receptionistNote, setReceptionistNote] = useState<string>("");
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
    try {
      // Fetch unassigned tickets
      const response = await fetch("/api/hospital/ticket?unassigned=true");
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();

      // Fetch held tickets
      const heldResponse = await fetch(
        "/api/hospital/ticket?unassigned=true&held=true"
      );
      if (!heldResponse.ok) throw new Error("Failed to fetch held tickets");
      const heldData = await heldResponse.json();

      setHeldTickets(heldData);

      // Only set regular tickets (not held)
      const regular = data.filter((ticket: Ticket) => !ticket.held);
      setTickets(regular);

      if (isServing && !currentTicket && regular.length > 0) {
        setCurrentTicket(regular[0]);
        updateRoomServingTicket(regular[0]._id);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
    }
  }, [toast, currentTicket, isServing]);

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

    const pollInterval = setInterval(fetchTickets, POLLING_INTERVAL);
    return () => clearInterval(pollInterval);
  }, [fetchTickets, fetchDepartments]);

  useEffect(() => {
    if (session && session.department !== "Reception") {
      router.push("/hospital/serving");
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
            department: "Reception",
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
    if (!currentTicket) return;

    if (!userType || !reasonForVisit) {
      toast({
        title: "Error",
        description: "Please select a user type and reason for visit",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/hospital/ticket/${currentTicket._id}/next-step`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            departmentId,
            roomId,
            userType,
            reasonForVisit,
            receptionistNote,
            currentDepartment: "Reception",
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to assign next step");

      toast({
        title: "Success",
        description: "Ticket forwarded to next department",
      });

      // Update tickets
      setTickets(tickets.filter((t) => t._id !== currentTicket._id));

      // Clear current ticket
      setCurrentTicket(null);
      updateRoomServingTicket(null);

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false);
        setIsPausing(false);
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        });
      }

      // Reset form
      setUserType("");
      setReasonForVisit("");
      setReceptionistNote("");
      setShowNextStepDialog(false);
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
    if (!currentTicket) return;

    if (!userType || !reasonForVisit) {
      toast({
        title: "Error",
        description: "Please select a user type and reason for visit",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/hospital/ticket/${currentTicket._id}/clear`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userType,
            reasonForVisit,
            receptionistNote,
            currentDepartment: "Reception",
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to clear ticket");

      toast({
        title: "Success",
        description: "Ticket cleared successfully",
      });

      // Update tickets
      setTickets(tickets.filter((t) => t._id !== currentTicket._id));

      // Clear current ticket
      setCurrentTicket(null);
      updateRoomServingTicket(null);

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false);
        setIsPausing(false);
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        });
      }

      // Reset form
      setUserType("");
      setReasonForVisit("");
      setReceptionistNote("");
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
            reasonForVisit,
            receptionistNote,
            currentDepartment: "Reception",
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to hold ticket");

      toast({
        title: "Success",
        description: "Ticket placed on hold",
      });

      // Update tickets
      await fetchTickets();

      // Clear current ticket
      setCurrentTicket(null);
      updateRoomServingTicket(null);

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false);
        setIsPausing(false);
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        });
      }

      // Reset form
      setUserType("");
      setReasonForVisit("");
      setReceptionistNote("");
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

      // Update tickets
      setTickets(tickets.filter((t) => t._id !== currentTicket._id));

      // Clear current ticket
      setCurrentTicket(null);
      updateRoomServingTicket(null);

      // Check if we were in the process of pausing
      if (isPausing) {
        setIsServing(false);
        setIsPausing(false);
        toast({
          title: "Paused",
          description: "Serving has been paused",
          variant: "default",
        });
      }

      // Reset form
      setUserType("");
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

  if (!session || session.department !== "Reception") {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are not authorized to access the reception page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Receptionist Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage patient tickets and department assignments
          </p>
        </div>
        {roomId && (
          <div className="flex items-center gap-3">
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
                {isPausing
                  ? "Complete Current Ticket to Pause"
                  : "Pause Serving"}
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
                      <label className="text-sm font-medium">User Type</label>
                      <Select value={userType} onValueChange={setUserType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Reason for Visit
                      </label>
                      <Textarea
                        placeholder="Enter reason for visit..."
                        value={reasonForVisit}
                        onChange={(e) => setReasonForVisit(e.target.value)}
                        className="h-24"
                      />
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
                  {isServing
                    ? "No ticket currently being served. Waiting for next ticket..."
                    : "Click 'Start Serving' to begin serving tickets"}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          {currentTicket && (
            <CardFooter className="flex justify-end gap-3 border-t pt-6">
              <Button variant="outline" onClick={handleHoldTicket}>
                Hold Ticket
              </Button>
              <Button variant="destructive" onClick={cancelTicket}>
                Cancel Ticket
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowNextStepDialog(true)}
                disabled={!userType || !reasonForVisit}
                className="gap-2"
              >
                Next Step
              </Button>
              <Button
                onClick={handleClearTicket}
                disabled={!userType || !reasonForVisit}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Clear Ticket
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
              {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} in queue
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

        {/* Held Tickets Section */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Held Tickets</CardTitle>
            <CardDescription>
              {heldTickets.length} ticket{heldTickets.length !== 1 ? "s" : ""}{" "}
              on hold
            </CardDescription>
          </CardHeader>
          <CardContent>
            {heldTickets.length > 0 ? (
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
                      {ticket.receptionistNote && (
                        <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                          <p className="font-medium mb-1">Notes:</p>
                          <p>{ticket.receptionistNote}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No tickets are currently on hold
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <RoomSelectionDialog
        isOpen={showRoomDialog}
        onClose={() => setShowRoomDialog(false)}
        onSubmit={handleRoomSelection}
        staffId={session?.userId || ""}
        department="Reception"
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

export default ReceptionistPage;
