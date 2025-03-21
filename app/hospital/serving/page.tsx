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
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QueueSpinner } from "@/components/queue-spinner";
import type { SessionData } from "@/lib/session";
import { DepartmentSelectionDialog } from "@/components/hospital/DepartmentSelectionDialog";
import { Navbar } from "@/components/hospitalNavbar";

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
    icon?: string; // Added icon field
    timestamp: string;
    note?: string;
    completed?: boolean;
    roomId?: string;
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
  const [showNextStepDialog, setShowNextStepDialog] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isServing, setIsServing] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isLoadingNextTicket, setIsLoadingNextTicket] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [roomNumber, setRoomNumber] = useState<string>("");

  const updateRoomServingTicket = async (ticketId: string | null) => {
    if (!roomId) return;

    try {
      const response = await fetch(`/api/hospital/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentTicket: ticketId,
          // Do not include available field here
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

  // Assign roomId to ticket's department history
  const assignRoomToTicket = async (ticketId: string) => {
    if (!roomId || !session?.department) return;

    try {
      const response = await fetch(
        `/api/hospital/ticket/${ticketId}/assign-room`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: roomId,
            department: session.department,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign room to ticket");
      }

      console.log(`Room ${roomId} assigned to ticket ${ticketId}`);
    } catch (error) {
      console.error("Error assigning room to ticket:", error);
      toast({
        title: "Error",
        description: "Failed to assign room to ticket",
        variant: "destructive",
      });
    }
  };

  const fetchTickets = useCallback(async () => {
    if (!session?.department) return { regular: [], heldData: [] };

    try {
      console.log(
        `Fetching tickets for department: ${session.department}, roomId: ${roomId}`
      );

      // Fetch regular tickets for this department
      const url = `/api/hospital/ticket?department=${session.department}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();
      console.log(`Found ${data.length} regular tickets`);

      // Fetch held tickets for this department
      const heldUrl = `/api/hospital/ticket?department=${session.department}&held=true`;

      const heldResponse = await fetch(heldUrl);
      if (!heldResponse.ok) throw new Error("Failed to fetch held tickets");
      const heldData = await heldResponse.json();
      console.log(`Found ${heldData.length} held tickets`);

      // Filter tickets based on roomId if available
      let filteredData = data;
      let filteredHeldData = heldData;

      if (roomId) {
        filteredData = data.filter((ticket: Ticket) => {
          if (ticket.departmentHistory && ticket.departmentHistory.length > 0) {
            const currentDeptEntry = ticket.departmentHistory.find(
              (hist: any) =>
                hist.department === session.department && !hist.completed
            );
            return (
              currentDeptEntry &&
              (!currentDeptEntry.roomId || currentDeptEntry.roomId === roomId)
            );
          }
          return true;
        });

        filteredHeldData = heldData.filter((ticket: Ticket) => {
          if (ticket.departmentHistory && ticket.departmentHistory.length > 0) {
            const currentDeptEntry = ticket.departmentHistory.find(
              (hist: any) =>
                hist.department === session.department && !hist.completed
            );
            return (
              currentDeptEntry &&
              (!currentDeptEntry.roomId || currentDeptEntry.roomId === roomId)
            );
          }
          return true;
        });

        console.log(
          `Filtered to ${filteredData.length} tickets for room ${roomId}`
        );
        console.log(
          `Filtered to ${filteredHeldData.length} held tickets for room ${roomId}`
        );
      }

      setHeldTickets(filteredHeldData);

      // Filter out current ticket if it exists
      const filteredTickets = currentTicket
        ? filteredData.filter((t: Ticket) => t._id !== currentTicket._id)
        : filteredData;

      setTickets(filteredTickets);

      return { regular: filteredData, heldData: filteredHeldData };
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
      return { regular: [], heldData: [] };
    }
  }, [session?.department, currentTicket, toast, roomId]);

  const fetchNextTicket = async () => {
    if (currentTicket) {
      toast({
        title: "Warning",
        description:
          "Please complete the current ticket before fetching the next one",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingNextTicket(true);
    try {
      const { regular } = await fetchTickets();

      if (regular.length > 0) {
        const nextTicket = regular[0];

        // First, assign the roomId to the ticket's department history
        await assignRoomToTicket(nextTicket._id);

        // Then update the current ticket and room
        setCurrentTicket(nextTicket);
        updateRoomServingTicket(nextTicket._id);

        // Update tickets list without the new current ticket
        setTickets(
          regular.filter(
            (ticket: { _id: any }) => ticket._id !== nextTicket._id
          )
        );

        toast({
          title: "Success",
          description: `Ticket ${nextTicket.ticketNo} is now being served`,
        });
      } else {
        toast({
          title: "No Tickets",
          description: "There are no tickets waiting to be served",
        });
      }
    } catch (error) {
      console.error("Error fetching next ticket:", error);
      toast({
        title: "Error",
        description: "Failed to fetch next ticket",
        variant: "destructive",
      });
    } finally {
      setIsLoadingNextTicket(false);
    }
  };

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
        }
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (roomId) {
        try {
          const response = await fetch(`/api/hospital/room/${roomId}`);
          if (response.ok) {
            const room = await response.json();
            setRoomNumber(room.roomNumber);

            // Set isServing based on the room's availability status
            setIsServing(room.available);

            // If room is available and has a current ticket, set it
            if (room.available && room.currentTicket) {
              const ticketResponse = await fetch(
                `/api/hospital/ticket/${room.currentTicket}`
              );
              if (ticketResponse.ok) {
                const ticketData = await ticketResponse.json();
                setCurrentTicket(ticketData);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching room details:", error);
        }
      }
    };
    fetchRoomDetails();
  }, [roomId]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTickets(), fetchDepartments()]);
      setIsLoading(false);
    };
    loadData();

    // No polling interval
  }, [fetchTickets, fetchDepartments]);

  useEffect(() => {
    if (session && session.department === "Reception") {
      router.push("/hospital/receptionist");
    }
  }, [session, router]);

  const startServing = async () => {
    if (!roomId) return;

    try {
      // Update room availability to true when starting to serve
      const response = await fetch(`/api/hospital/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          available: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update room availability"
        );
      }

      setIsServing(true);

      // Automatically fetch the next ticket
      await fetchNextTicket();

      toast({
        title: "Serving Started",
        description: "You are now available to serve tickets.",
      });
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

  const pauseServing = async () => {
    if (currentTicket) {
      setIsPausing(true);
      toast({
        title: "Pausing",
        description:
          "Please complete or hold the current ticket before pausing",
        variant: "default",
      });
      return;
    }

    try {
      // Update room availability to false when pausing
      const response = await fetch(`/api/hospital/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          available: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update room availability"
        );
      }

      setIsServing(false);
      setIsPausing(false);
      setCurrentTicket(null);
      updateRoomServingTicket(null);

      toast({
        title: "Paused",
        description: "Serving has been paused and you are now unavailable",
        variant: "default",
      });
    } catch (error) {
      console.error("Error pausing serving:", error);
      toast({
        title: "Error",
        description: "Failed to pause serving",
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
            roomId: roomId, // Pass the roomId for the current user
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
      }

      // Update tickets list
      await fetchTickets();
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
            roomId: roomId, // Include roomId when holding a ticket
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
      }

      // Update tickets list
      await fetchTickets();
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
        body: JSON.stringify({
          held: false,
          roomId: roomId, // Include roomId when unholding a ticket
        }),
      });

      if (!response.ok) throw new Error("Failed to unhold ticket");

      toast({
        title: "Success",
        description: "Ticket returned to queue",
      });

      // Update tickets list
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
      }

      // Update tickets list
      await fetchTickets();
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

  const handleNextStep = async (selectedDepartmentId: string) => {
    if (!currentTicket) return;

    try {
      const nextDepartment = departments.find(
        (dep) => dep._id === selectedDepartmentId
      );

      if (!nextDepartment) {
        toast({
          title: "Error",
          description: "Selected department not found.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `/api/hospital/ticket/${currentTicket._id}/next`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nextDepartmentId: selectedDepartmentId,
            departmentNote: departmentNote,
            currentDepartment: session?.department,
            roomId: roomId, // Pass the roomId for the current user
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to move ticket to next department"
        );
      }

      toast({
        title: "Success",
        description: `Ticket moved to ${nextDepartment.title}`,
      });

      // Clear current ticket
      setCurrentTicket(null);
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
      }

      // Update tickets list
      await fetchTickets();
    } catch (error) {
      console.error("Error moving ticket to next department:", error);
      toast({
        title: "Error",
        description: "Failed to move ticket to next department",
        variant: "destructive",
      });
    }
  };

  const refreshTickets = async () => {
    setIsLoading(true);
    await fetchTickets();
    setIsLoading(false);

    toast({
      title: "Refreshed",
      description: "Ticket list has been updated",
    });
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
    <>
      <Navbar staffId={session?.userId || ""} />
      <div className="bg-gradient-to-b from-white to-blue-50 min-h-screen">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex flex-col space-y-6">
            <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-blue-100">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1 text-[#0e4480]">
                  {session.department} Dashboard
                </h1>
                <p className="text-slate-500">
                  Managing {session.department} in Room {roomNumber}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-[#0e4480]/10 px-4 py-2 rounded-full">
                  <Users className="h-5 w-5 text-[#0e4480]" />
                  <span className="font-medium text-[#0e4480]">
                    {tickets.length} waiting
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshTickets}
                  className="ml-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>

            {roomId && (
              <div className="flex justify-end gap-2">
                {isServing ? (
                  <>
                    <Button
                      onClick={fetchNextTicket}
                      disabled={
                        !isServing ||
                        currentTicket !== null ||
                        isLoadingNextTicket
                      }
                      className="bg-[#0e4480] hover:bg-blue-800 text-white gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      {isLoadingNextTicket ? "Loading..." : "Next Ticket"}
                    </Button>
                    <Button
                      onClick={pauseServing}
                      variant="outline"
                      className="border-red-300 hover:bg-red-50 text-red-600 gap-2"
                    >
                      <PauseCircle className="h-4 w-4" />
                      {isPausing
                        ? "Complete Current Ticket to Pause"
                        : "Pause Serving"}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={startServing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Start Serving
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Side-by-side layout for Current Ticket and Held Tickets */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Current Ticket Section - Takes up more space */}
            <div className="md:col-span-8">
              {isServing && currentTicket ? (
                <Card className="h-full border-none shadow-md overflow-hidden">
                  <CardHeader className="bg-[#0e4480] text-white py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-3xl font-bold">
                            #{currentTicket.ticketNo}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className="text-base border-blue-300 text-white"
                          >
                            Current
                          </Badge>
                          {currentTicket.userType && (
                            <Badge
                              variant="secondary"
                              className="text-base bg-green-100 text-green-800 border-green-200"
                            >
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
                          className="h-10 w-10 border-blue-300 bg-white hover:bg-blue-50"
                        >
                          <Volume2 className="h-5 w-5 text-blue-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6">
                    <div className="bg-white p-4 rounded-lg space-y-3 shadow-sm mb-6">
                      <div>
                        <h3 className="font-semibold text-sm text-blue-600 mb-1">
                          Reason for Visit
                        </h3>
                        <p className="text-lg">
                          {currentTicket.reasonforVisit || "Not specified"}
                        </p>
                      </div>
                      {currentTicket.receptionistNote && (
                        <>
                          <Separator className="bg-blue-100" />
                          <div>
                            <h3 className="font-semibold text-sm text-blue-600 mb-1">
                              Receptionist Note
                            </h3>
                            <p className="text-lg">
                              {currentTicket.receptionistNote}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <h3 className="font-semibold text-lg mb-4 text-blue-800">
                      Department History
                    </h3>
                    {currentTicket.departmentHistory &&
                    currentTicket.departmentHistory.length > 0 ? (
                      <div className="space-y-3">
                        {currentTicket.departmentHistory.map(
                          (history, index) => (
                            <div
                              key={index}
                              className="p-4 rounded-lg border bg-gradient-to-r from-blue-50/50 to-green-50/50"
                            >
                              <div className="flex justify-between mb-2">
                                <span className="font-medium flex items-center">
                                  {history.icon && (
                                    <span className="mr-2 text-lg">
                                      {history.icon}
                                    </span>
                                  )}
                                  {history.department}
                                  {history.completed && (
                                    <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                                      Completed
                                    </Badge>
                                  )}
                                  {!history.completed && (
                                    <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                                      Pending
                                    </Badge>
                                  )}
                                  {/* {history.roomId && (
                                    <Badge className="ml-2 bg-purple-100 text-purple-800 border-purple-200">
                                      Room:{" "}
                                      {history.roomId
                                        .toString()
                                        .substring(0, 6)}
                                      ...
                                    </Badge>
                                  )} */}
                                </span>
                                <span className="text-sm text-blue-600">
                                  {new Date(history.timestamp).toLocaleString()}
                                </span>
                              </div>
                              {history.note && (
                                <p className="text-sm mt-2 bg-white p-2 rounded-md shadow-sm">
                                  {history.note}
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-blue-600">No previous departments</p>
                    )}

                    <div className="mt-6 space-y-2">
                      <label className="text-sm font-medium text-blue-700">
                        Department Note
                      </label>
                      <Textarea
                        placeholder="Add notes about this patient..."
                        value={departmentNote}
                        onChange={(e) => setDepartmentNote(e.target.value)}
                        className="h-32 border-blue-200 focus:border-blue-400"
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="flex justify-end gap-3 border-t pt-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-b-lg">
                    <Button
                      variant="outline"
                      onClick={handleHoldTicket}
                      className="border-blue-300 hover:bg-blue-50 text-blue-700"
                    >
                      Hold Ticket
                    </Button>
                    <Button variant="destructive" onClick={cancelTicket}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowNextStepDialog(true)}
                      className="gap-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700"
                    >
                      Next Step
                    </Button>
                    <Button
                      onClick={handleClearTicket}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Clear Ticket
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <Card className="h-full border-t-4 border-t-blue-400 shadow-md">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 mb-4 text-blue-300" />
                    <p className="text-lg font-medium text-blue-800">
                      No active ticket
                    </p>
                    <p className="text-sm mt-1 text-blue-600">
                      {isServing
                        ? "Click 'Next Ticket' to get the next ticket in queue"
                        : "Click 'Start Serving' to begin"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Held Tickets Section */}
            <div className="md:col-span-4">
              <Card className="h-full border-none shadow-md overflow-hidden">
                <CardHeader className="bg-green-600 text-white py-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <PauseCircle className="h-5 w-5" />
                    Held Tickets
                  </CardTitle>
                  <CardDescription className="text-green-100">
                    {heldTickets.length} ticket
                    {heldTickets.length !== 1 ? "s" : ""} on hold
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[600px] p-2">
                  {heldTickets.length > 0 ? (
                    <div className="space-y-4">
                      {heldTickets.map((ticket) => (
                        <Card
                          key={ticket._id}
                          className="border-l-4 border-l-green-400 bg-green-50/30 shadow-sm"
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold mb-1 text-[#0e4480]">
                                  #{ticket.ticketNo}
                                </h3>
                                {ticket.reasonforVisit && (
                                  <p className="text-sm text-slate-600 mb-2">
                                    {ticket.reasonforVisit}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnholdTicket(ticket._id)}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Return to Queue
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <PauseCircle className="h-12 w-12 mb-4 opacity-30" />
                      <p>No tickets are currently on hold</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <DepartmentSelectionDialog
            isOpen={showNextStepDialog}
            onClose={() => setShowNextStepDialog(false)}
            onSubmit={handleNextStep}
            departments={departments}
          />

          <Toaster />
        </div>
      </div>
    </>
  );
};

export default ServingPage;
