"use client";

import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
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
  ArrowRight,
  User,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QueueSpinner } from "@/components/queue-spinner";
import { Badge } from "@/components/ui/badge";
import type { SessionData } from "@/lib/session";
import { DepartmentSelectionDialog } from "@/components/hospital/DepartmentSelectionDialog";
import { Navbar } from "@/components/hospitalNavbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    icon?: string;
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

// Component to render room and staff information
const DepartmentRoomBadge = ({
  department,
  roomIdPartial,
}: {
  department: string;
  roomIdPartial: string;
}) => {
  const [roomInfo, setRoomInfo] = useState<{
    roomNumber: string;
    staffName: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadRoomInfo = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const response = await fetch("/api/hospital/department");
        if (!response.ok) {
          throw new Error("Failed to fetch departments");
        }

        const allDepartments = await response.json();
        const dept = allDepartments.find(
          (d: Department) => d.title === department
        );

        if (!dept) {
          throw new Error(`Department ${department} not found`);
        }

        const room = dept.rooms.find((r: any) =>
          r._id.toString().includes(roomIdPartial)
        );

        if (!room) {
          throw new Error(`Room not found in ${department}`);
        }

        let staffName = "Unknown Staff";
        if (room.staff) {
          if (
            typeof room.staff === "object" &&
            room.staff.firstName &&
            room.staff.lastName
          ) {
            staffName = `${room.staff.firstName} ${room.staff.lastName}`;
          } else if (typeof room.staff === "string") {
            try {
              const staffResponse = await fetch(
                `/api/hospital/staff?id=${room.staff}`
              );
              if (staffResponse.ok) {
                const staffData = await staffResponse.json();
                if (staffData.firstName && staffData.lastName) {
                  staffName = `${staffData.firstName} ${staffData.lastName}`;
                } else if (staffData.username) {
                  staffName = staffData.username;
                }
              }
            } catch (staffError) {
              console.error("Error fetching staff details:", staffError);
            }
          }
        }

        setRoomInfo({
          roomNumber: room.roomNumber || "Unknown",
          staffName: staffName,
        });
      } catch (error) {
        console.error("Error loading room info:", error);
        setHasError(true);
        setRoomInfo({
          roomNumber: "Unknown",
          staffName: "Staff not found",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadRoomInfo();
  }, [department, roomIdPartial]);

  if (isLoading) {
    return (
      <Badge className="ml-2 bg-purple-100 text-purple-800 border-purple-200 animate-pulse">
        Loading...
      </Badge>
    );
  }

  if (hasError) {
    return (
      <Badge className="ml-2 bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
        <User className="h-3 w-3" />
        Room: Unknown Staff
      </Badge>
    );
  }

  return (
    <Badge className="ml-2 bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1">
      <User className="h-3 w-3" />
      {roomInfo?.roomNumber ? `Room ${roomInfo.roomNumber}` : "Room"}:{" "}
      {roomInfo?.staffName || "Unknown"}
    </Badge>
  );
};

const USER_TYPES = ["Cash", "Insurance", "Staff"];
const REASON_TYPES = [
  "General Inquiry",
  "Appointment",
  "Emergency",
  "Follow-up",
  "Other",
];

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
  const [showNextStepDialog, setShowNextStepDialog] = useState(false);
  const [showActionsDialog, setShowActionsDialog] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isServing, setIsServing] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [roomNumber, setRoomNumber] = useState<string>("");
  const [isLoadingNextTicket, setIsLoadingNextTicket] = useState(false);
  const autoFetchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(true);

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
    if (!roomId) return;

    try {
      const response = await fetch(
        `/api/hospital/ticket/${ticketId}/assign-room`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: roomId,
            department: "Reception",
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
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Fetch unassigned tickets created today
      const response = await fetch(
        `/api/hospital/ticket?unassigned=true&date=${today}`
      );
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();

      // Fetch held tickets created today
      const heldResponse = await fetch(
        `/api/hospital/ticket?unassigned=true&held=true&date=${today}`
      );
      if (!heldResponse.ok) throw new Error("Failed to fetch held tickets");
      const heldData = await heldResponse.json();

      setHeldTickets(heldData);

      // Only set regular tickets (not held)
      const regular = data.filter((ticket: Ticket) => !ticket.held);

      // Filter out current ticket if it exists
      const filteredTickets = currentTicket
        ? regular.filter(
            (ticket: { _id: string }) => ticket._id !== currentTicket._id
          )
        : regular;

      setTickets(filteredTickets);

      return { regular, heldData };
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
      return { regular: [], heldData: [] };
    }
  }, [toast, currentTicket]);

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

  // Update the useEffect that handles auto-fetching
  useEffect(() => {
    // Disable auto-fetch when dialog is open
    if (showActionsDialog) {
      setAutoFetchEnabled(false);
    } else {
      setAutoFetchEnabled(true);
    }
  }, [showActionsDialog]);

  // Separate useEffect for the actual auto-fetch functionality
  useEffect(() => {
    // Clear any existing interval
    if (autoFetchIntervalRef.current) {
      clearInterval(autoFetchIntervalRef.current);
      autoFetchIntervalRef.current = null;
    }

    // Only set up the interval if we're serving and auto-fetch is enabled
    if (isServing && autoFetchEnabled) {
      console.log(
        "Setting up auto-fetch interval. Auto-fetch enabled:",
        autoFetchEnabled
      );

      autoFetchIntervalRef.current = setInterval(async () => {
        // Double-check all conditions before proceeding
        if (
          isServing &&
          !currentTicket &&
          !isLoadingNextTicket &&
          autoFetchEnabled &&
          !showActionsDialog
        ) {
          console.log("Auto-checking for next ticket...");

          try {
            // Check if there are tickets waiting
            const { regular } = await fetchTickets();

            if (regular.length > 0) {
              console.log("Auto-fetching next ticket...");
              await fetchNextTicket();
            }
          } catch (error) {
            console.error("Error in auto-fetch:", error);
          }
        } else {
          console.log("Auto-fetch conditions not met:", {
            isServing,
            hasCurrentTicket: !!currentTicket,
            isLoading: isLoadingNextTicket,
            autoFetchEnabled,
            dialogOpen: showActionsDialog,
          });
        }
      }, 5000); // Check every 5 seconds
    }

    // Clean up on unmount or when dependencies change
    return () => {
      if (autoFetchIntervalRef.current) {
        clearInterval(autoFetchIntervalRef.current);
        autoFetchIntervalRef.current = null;
      }
    };
  }, [
    isServing,
    currentTicket,
    isLoadingNextTicket,
    autoFetchEnabled,
    fetchTickets,
  ]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTickets(), fetchDepartments()]);
      setIsLoading(false);
    };
    loadData();

    // Set up polling interval to refresh tickets every 60 seconds
    const pollingInterval = setInterval(async () => {
      console.log("Auto-refreshing tickets (60s interval)");
      await fetchTickets();
    }, 60000); // 60 seconds

    // Clean up interval on component unmount
    return () => clearInterval(pollingInterval);
  }, [fetchTickets, fetchDepartments]);

  useEffect(() => {
    if (session && session.department !== "Reception") {
      router.push("/hospital/serving");
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

  const handleNextStep = async (departmentId: string, roomId?: string) => {
    if (!currentTicket) return;

    // For returned tickets, we don't need to validate user type and reason
    const isReturnedTicket =
      currentTicket.departmentHistory &&
      currentTicket.departmentHistory.length > 1;

    if (!isReturnedTicket && (!userType || !reasonForVisit)) {
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
            userType: isReturnedTicket ? currentTicket.userType : userType,
            reasonForVisit: isReturnedTicket
              ? currentTicket.reasonforVisit
              : reasonForVisit,
            receptionistNote: receptionistNote, // Always send the current note
            note: receptionistNote, // Add this line - the API might be looking for this field name
            departmentNote: receptionistNote, // Add this line - try another possible field name
            currentDepartment: "Reception",
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
      updateRoomServingTicket(null);
      setShowActionsDialog(true);

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

      // Update tickets list
      await fetchTickets();
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

    // For returned tickets, we don't need to validate user type and reason
    const isReturnedTicket =
      currentTicket.departmentHistory &&
      currentTicket.departmentHistory.length > 1;

    if (!isReturnedTicket && (!userType || !reasonForVisit)) {
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
            userType: isReturnedTicket ? currentTicket.userType : userType,
            reasonForVisit: isReturnedTicket
              ? currentTicket.reasonforVisit
              : reasonForVisit,
            receptionistNote: receptionistNote, // Always send the current note
            note: receptionistNote, // Add this line - the API might be looking for this field name
            departmentNote: receptionistNote, // Add this line - try another possible field name
            currentDepartment: "Reception",
            roomId, // More consistent syntax
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
      setShowActionsDialog(true);

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
      // For returned tickets, use existing values
      const isReturnedTicket =
        currentTicket.departmentHistory &&
        currentTicket.departmentHistory.length > 1;

      const response = await fetch(
        `/api/hospital/ticket/${currentTicket._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            held: true,
            reasonForVisit: isReturnedTicket
              ? currentTicket.reasonforVisit
              : reasonForVisit,
            receptionistNote: receptionistNote, // Always send the current note
            note: receptionistNote, // Add this line
            departmentNote: receptionistNote, // Add this line
            currentDepartment: "Reception",
            roomId,
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
      setShowActionsDialog(true);

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
      // First, update the ticket to remove the held status
      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          held: false,
          currentDepartment: "Reception",
          roomId: roomId, // Include roomId when unholding a ticket
        }),
      });

      if (!response.ok) throw new Error("Failed to unhold ticket");

      // Get the updated ticket data
      const updatedTicket = await response.json();

      // If there's already a current ticket, show a warning
      if (currentTicket) {
        toast({
          title: "Warning",
          description: "Please complete the current ticket first",
          variant: "destructive",
        });
        return;
      }

      // Assign the roomId to the ticket's department history
      await assignRoomToTicket(ticketId);

      // Set the unheld ticket as the current ticket
      setCurrentTicket(updatedTicket);

      // Update the room to show it's serving this ticket
      updateRoomServingTicket(ticketId);

      toast({
        title: "Success",
        description: "Ticket is now being served",
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
          body: JSON.stringify({
            noShow: true,
            receptionistNote: receptionistNote,
            note: receptionistNote, // Add this line
            departmentNote: receptionistNote, // Add this line
          }),
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
      setShowActionsDialog(true);

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

  const refreshTickets = async () => {
    setIsLoading(true);
    await fetchTickets();
    setIsLoading(false);

    toast({
      title: "Refreshed",
      description: "Ticket list has been updated",
    });
  };

  // Remove this useEffect that's causing the dialog to appear when starting to serve
  // useEffect(() => {
  //   if (isServing && !currentTicket) {
  //   setShowActionsDialog(true);
  //   }
  // }, [isServing, currentTicket]);

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
    <>
      <Navbar staffId={session?.userId || ""} />
      <div className="bg-gradient-to-b from-white to-blue-50 min-h-screen">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header Section with Waiting Count Badge */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-blue-100">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1 text-[#0e4480]">
                  Receptionist Dashboard
                </h1>
                <p className="text-slate-500">
                  Managing Reception in{" "}
                  {roomNumber ? `Room ${roomNumber}` : "..."}
                </p>
              </div>
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
                Refresh Tickets
              </Button>
            </div>
            <div className="flex gap-2">
              {roomId && (
                <>
                  {isServing ? (
                    <>
                      <Button
                        onClick={fetchNextTicket}
                        disabled={
                          !isServing ||
                          currentTicket !== null ||
                          isLoadingNextTicket
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
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
                </>
              )}
            </div>
          </div>

          {/* Main Content - Horizontal Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Ticket Section */}
            <Card className="border-none shadow-md overflow-hidden h-full">
              <CardHeader className="bg-[#0e4480] text-white py-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock className="h-5 w-5" />
                  Current Ticket
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Serving ticket {currentTicket?.ticketNo || "No active ticket"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                {currentTicket ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge className="bg-[#0e4480] text-white text-lg px-6 py-2 rounded-lg">
                          {currentTicket.ticketNo}
                        </Badge>
                        {currentTicket.call && (
                          <Badge className="bg-emerald-100 text-emerald-700 px-4 py-1">
                            Called
                          </Badge>
                        )}
                        {currentTicket.userType && (
                          <Badge className="bg-blue-100 text-blue-800 px-4 py-1">
                            {currentTicket.userType}
                          </Badge>
                        )}
                      </div>
                      <div className="tooltip-container relative">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={callTicket}
                          disabled={currentTicket.call}
                          className="rounded-full w-10 h-10 border-[#0e4480] text-[#0e4480] hover:bg-blue-50 group relative"
                        >
                          <Volume2 className="h-5 w-5" />
                          <span className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs p-2 rounded -bottom-10 left-1/2 transform -translate-x-1/2 w-24 text-center">
                            Call Ticket
                          </span>
                        </Button>
                      </div>
                    </div>

                    {/* Check if this is a returned ticket (has department history with more than one entry) */}
                    {currentTicket.departmentHistory &&
                    currentTicket.departmentHistory.length > 1 ? (
                      <>
                        {/* Department History for returned tickets */}
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                          <h3 className="font-semibold text-lg mb-4 text-blue-800">
                            Ticket Journey
                          </h3>
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
                                      {history.roomId && (
                                        <DepartmentRoomBadge
                                          department={history.department}
                                          roomIdPartial={(() => {
                                            if (!history.roomId)
                                              return "unknown";
                                            if (
                                              typeof history.roomId === "string"
                                            ) {
                                              return history.roomId.substring(
                                                0,
                                                6
                                              );
                                            }
                                            if (
                                              typeof history.roomId === "object"
                                            ) {
                                              if (
                                                history.roomId &&
                                                "oid" in history.roomId
                                              ) {
                                                return (
                                                  history.roomId as any
                                                ).$oid.substring(0, 6);
                                              }
                                              return JSON.stringify(
                                                history.roomId
                                              ).substring(0, 6);
                                            }
                                            return String(
                                              history.roomId
                                            ).substring(0, 6);
                                          })()}
                                        />
                                      )}
                                    </span>
                                    <span className="text-sm text-blue-600">
                                      {new Date(
                                        history.timestamp
                                      ).toLocaleString()}
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
                        </div>
                      </>
                    ) : (
                      /* Original form for new tickets */
                      <>
                        {/* User Type and Reason for Visit on same line */}
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                              User Type
                            </label>
                            <Select
                              value={userType}
                              onValueChange={setUserType}
                            >
                              <SelectTrigger className="border-slate-300 focus:ring-[#0e4480]">
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
                            <label className="text-sm font-medium text-slate-700">
                              Reason for Visit
                            </label>
                            <Select
                              value={reasonForVisit}
                              onValueChange={setReasonForVisit}
                            >
                              <SelectTrigger className="border-slate-300 focus:ring-[#0e4480]">
                                <SelectValue placeholder="Select reason for visit" />
                              </SelectTrigger>
                              <SelectContent>
                                {REASON_TYPES.map((reason) => (
                                  <SelectItem key={reason} value={reason}>
                                    {reason}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Receptionist Note takes full width */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Receptionist Note
                      </label>
                      <Textarea
                        placeholder="Add any additional notes here..."
                        value={receptionistNote}
                        onChange={(e) => setReceptionistNote(e.target.value)}
                        className="h-32 border-slate-300 focus:ring-[#0e4480]"
                      />
                    </div>
                  </div>
                ) : (
                  <Alert className="bg-blue-50 border-blue-100 text-[#0e4480]">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {isServing
                        ? "No ticket currently being served. Click 'Next Ticket' to get the next ticket in queue."
                        : "Click 'Start Serving' to begin serving tickets"}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              {currentTicket && (
                <CardFooter className="flex justify-end gap-3 bg-slate-50 p-4">
                  <div className="flex gap-2">
                    {/* Hold Ticket Button - with text */}
                    <Button
                      variant="outline"
                      onClick={handleHoldTicket}
                      className="border-amber-400 text-amber-600 hover:bg-amber-50"
                    >
                      <PauseCircle className="h-5 w-5 mr-2" />
                      Hold Ticket
                    </Button>

                    {/* Cancel Ticket Button - with text */}
                    <Button
                      variant="outline"
                      onClick={cancelTicket}
                      className="border-red-400 text-red-600 hover:bg-red-50"
                    >
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Cancel Ticket
                    </Button>

                    {/* Next Step Button - with text */}
                    <Button
                      onClick={() => setShowNextStepDialog(true)}
                      disabled={
                        !(
                          currentTicket.departmentHistory &&
                          currentTicket.departmentHistory.length > 1
                        ) &&
                        (!userType || !reasonForVisit)
                      }
                      className="bg-[#0e4480] hover:bg-blue-800 text-white disabled:bg-slate-300"
                    >
                      <Users className="h-5 w-5 mr-2" />
                      Next Step
                    </Button>

                    {/* Clear Ticket Button - with text */}
                    <Button
                      onClick={handleClearTicket}
                      disabled={
                        !(
                          currentTicket.departmentHistory &&
                          currentTicket.departmentHistory.length > 1
                        ) &&
                        (!userType || !reasonForVisit)
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300"
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Clear Ticket
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>

            {/* Held Tickets Section - changed from amber to green */}
            <Card className="border-none shadow-md overflow-hidden h-full">
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
              <CardContent className="p-6 bg-white overflow-auto max-h-[600px]">
                {heldTickets.length > 0 ? (
                  <div className="space-y-4">
                    {heldTickets.map((ticket) => (
                      <Card
                        key={ticket._id}
                        className="border-l-4 border-l-green-400 bg-green-50/30 shadow-sm"
                      >
                        <CardContent className="p-4">
                          <div>
                            <h3 className="font-semibold mb-1 text-[#0e4480]">
                              {ticket.ticketNo}
                            </h3>
                            {ticket.reasonforVisit && (
                              <p className="text-sm text-slate-600 mb-2">
                                {ticket.reasonforVisit}
                              </p>
                            )}
                          </div>
                          {ticket.receptionistNote && (
                            <div className="mt-3 p-3 bg-white rounded-md text-sm border border-green-100">
                              <p className="font-medium mb-1 text-slate-700">
                                Notes:
                              </p>
                              <p className="text-slate-600">
                                {ticket.receptionistNote}
                              </p>
                            </div>
                          )}
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

          <DepartmentSelectionDialog
            isOpen={showNextStepDialog}
            onClose={() => setShowNextStepDialog(false)}
            onSubmit={handleNextStep}
            departments={departments}
          />

          <Dialog
            open={showActionsDialog}
            onOpenChange={(open) => {
              setShowActionsDialog(open);
              setAutoFetchEnabled(!open); // Explicitly disable auto-fetch when dialog opens
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reception Actions</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Primary Actions */}
                <div className="flex flex-col gap-3">
                  {isServing ? (
                    <>
                      <Button
                        onClick={pauseServing}
                        variant="outline"
                        className="border-red-300 hover:bg-red-50 text-red-600 gap-2 w-full"
                      >
                        <PauseCircle className="h-4 w-4" />
                        {isPausing
                          ? "Complete Current Ticket to Pause"
                          : "Pause Serving"}
                      </Button>
                      <Button
                        onClick={() => {
                          fetchNextTicket();
                          setShowActionsDialog(false);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full"
                      >
                        <ArrowRight className="h-4 w-4" />
                        Next Ticket
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        startServing();
                        setShowActionsDialog(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Start Serving
                    </Button>
                  )}
                </div>

                {/* Held Tickets Section */}
                {heldTickets.length > 0 && (
                  <>
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-2 text-sm text-gray-500">
                          Held Tickets
                        </span>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {heldTickets.map((ticket) => (
                        <div
                          key={ticket._id}
                          className="flex justify-between items-center p-2 bg-green-50 rounded"
                        >
                          <div>
                            <span className="font-semibold">
                              {ticket.ticketNo}
                            </span>
                            {ticket.reasonforVisit && (
                              <p className="text-xs text-muted-foreground">
                                {ticket.reasonforVisit}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleUnholdTicket(ticket._id);
                              setShowActionsDialog(false);
                            }}
                            className="text-green-600 border-green-300 hover:bg-green-50"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Return to Queue
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Toaster />
        </div>
      </div>
    </>
  );
};

export default ReceptionistPage;
