"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { PhoneCall, ArrowRight } from "lucide-react";
import { QueueSpinner } from "@/components/queue-spinner";
import { EditCounterDialog } from "@/components/edit-counter-dialog";
import { Navbar } from "@/components/navbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  _id: string;
  ticketNo: string;
  queueId: string;
  subItemId: string;
  issueDescription: string;
  justifyReason?: string | null;
  ticketStatus: "Not Served" | "Serving" | "Served" | "Hold";
  counterId: string | null;
  callAgain?: boolean;
}

interface ActiveCounter {
  _id: string;
  userId: string;
  counterNumber: number;
  queueId: {
    _id: string;
    menuItem: {
      name: string;
    };
  };
  branchId: string;
  available: boolean;
}

interface SessionData {
  userId: string;
  isLoggedIn: boolean;
  role: string;
  branchId: string;
  counterId: string;
  permissions: Record<string, boolean>;
  expiresAt: number;
}

interface QueueItem {
  _id: string;
  menuItem: {
    name: string;
    subMenuItems: Array<{ _id: string; name: string }>;
  };
}

export default function ServingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [activeCounter, setActiveCounter] = useState<ActiveCounter | null>(
    null
  );
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueStatus, setQueueStatus] = useState(0);
  const [averageServingTime, setAverageServingTime] = useState("0:00");
  const [heldTickets, setHeldTickets] = useState<Ticket[]>([]);
  const [ticketsServed, setTicketsServed] = useState(0);
  const [availableCounters, setAvailableCounters] = useState<
    Array<{
      _id: string;
      number: number;
      queueName: string;
    }>
  >([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [queueTicketCounts, setQueueTicketCounts] = useState<
    Record<string, number>
  >({});
  const [isActionsDialogOpen, setIsActionsDialogOpen] = useState(false);
  const [servingStartTime, setServingStartTime] = useState<
    Record<string, Date>
  >({});
  const [totalDailyTickets, setTotalDailyTickets] = useState(0);
  const [companyName, setCompanyName] = useState("Serving Dashboard");
  const router = useRouter();
  const { toast } = useToast();

  // Replace the fetchTotalDailyTickets function with this improved version
  const fetchTotalDailyTickets = useCallback(async () => {
    if (!sessionData?.branchId) return;

    try {
      // Get today's date in the correct format for comparison with createdAt
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to beginning of day
      const todayISO = today.toISOString().split("T")[0];

      console.log("Fetching total tickets for date:", todayISO);

      // Make sure we're explicitly requesting tickets created today
      const response = await fetch(
        `/api/bank/ticket?branchId=${sessionData.branchId}&createdAt=${todayISO}`
      );

      if (!response.ok) {
        console.error(
          "Failed to fetch total daily tickets, status:",
          response.status
        );
        throw new Error("Failed to fetch total daily tickets");
      }

      const data = await response.json();
      console.log(`Total tickets for today (${todayISO}):`, data.length);

      // Filter tickets by createdAt date on the client side as a backup
      const todayTickets = data.filter(
        (ticket: { createdAt: string | number | Date }) => {
          if (!ticket.createdAt) return false;
          const ticketDate = new Date(ticket.createdAt)
            .toISOString()
            .split("T")[0];
          return ticketDate === todayISO;
        }
      );

      console.log(
        `After client-side filtering: ${todayTickets.length} tickets`
      );
      setTotalDailyTickets(todayTickets.length);
    } catch (error) {
      console.error("Error fetching total daily tickets:", error);
    }
  }, [sessionData?.branchId]);

  const fetchCompanySettings = useCallback(async () => {
    try {
      const response = await fetch("/api/bank/settings");
      if (!response.ok) throw new Error("Failed to fetch company settings");

      const data = await response.json();
      if (data.companyName) {
        setCompanyName(data.companyName);
      }
    } catch (error) {
      console.error("Error fetching company settings:", error);
    }
  }, []);

  const fetchSessionData = useCallback(async () => {
    try {
      console.log("Fetching session data...");
      const response = await fetch("/api/session");
      if (!response.ok) throw new Error("Failed to fetch session data");

      const data: SessionData = await response.json();
      console.log("Session data:", data);
      setSessionData(data);

      if (!data.isLoggedIn) {
        router.push("/bank/tellerLogin");
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
      setError("Failed to fetch session data. Please try again.");
    }
  }, [router]);

  const fetchActiveCounter = useCallback(async () => {
    if (!sessionData?.counterId) return;
    try {
      const response = await fetch(
        `/api/bank/counter/${sessionData.counterId}`
      );
      if (!response.ok) throw new Error("Failed to fetch counter data");
      const data = await response.json();
      setActiveCounter(data.counter);
    } catch (error) {
      console.error("Error fetching counter:", error);
      setError("Failed to fetch counter data. Please try again.");
    }
  }, [sessionData?.counterId]);

  const fetchInitialData = useCallback(async () => {
    if (
      !sessionData?.isLoggedIn ||
      !sessionData?.branchId ||
      !sessionData?.counterId
    )
      return;

    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [
        counterRes,
        queueItemsRes,
        availableCountersRes,
        servedTicketsRes,
      ] = await Promise.all([
        fetch(`/api/bank/counter/${sessionData.counterId}`),
        fetch("/api/bank/queues"),
        fetch(`/api/bank/counter/available?branchId=${sessionData.branchId}`),
        fetch(
          `/api/bank/ticket?counterId=${sessionData.counterId}&status=Served&branchId=${sessionData.branchId}&date=${today}`
        ),
      ]);

      await fetchTotalDailyTickets();
      await fetchCompanySettings();

      if (
        !counterRes.ok ||
        !queueItemsRes.ok ||
        !availableCountersRes.ok ||
        !servedTicketsRes.ok
      ) {
        throw new Error("Failed to fetch initial data");
      }

      const [counterData, queueData, availableCountersData, servedTicketsData] =
        await Promise.all([
          counterRes.json(),
          queueItemsRes.json(),
          availableCountersRes.json(),
          servedTicketsRes.json(),
        ]);

      setActiveCounter(counterData.counter);
      setQueueItems(queueData);
      setAvailableCounters(availableCountersData.counters);
      setTicketsServed(servedTicketsData.length);

      await Promise.all([
        fetchCurrentTicket(counterData.counter, sessionData),
        fetchHeldTickets(sessionData),
      ]);

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setError("Failed to fetch initial data. Please try again.");
      setIsLoading(false);
    }
  }, [sessionData, fetchTotalDailyTickets, fetchCompanySettings]);

  const fetchCurrentTicket = useCallback(
    async (counter: ActiveCounter, session: SessionData) => {
      if (!counter || !session.branchId || !session.counterId) return;

      try {
        const today = new Date().toISOString().split("T")[0];
        // Modified query - removed the queueId filter to include redirected tickets
        const response = await fetch(
          `/api/bank/ticket?status=Serving&branchId=${session.branchId}&counterId=${session.counterId}&date=${today}`
        );
        if (!response.ok) throw new Error("Failed to fetch current ticket");

        const data = await response.json();
        if (data.length > 0) {
          const ticket = data[0];
          setCurrentTicket(ticket);
        } else {
          setCurrentTicket(null);
        }
      } catch (error) {
        console.error("Error fetching current ticket:", error);
        setError("Failed to fetch current ticket. Please try again.");
      }
    },
    []
  );

  const fetchHeldTickets = useCallback(async (session: SessionData) => {
    if (!session.branchId || !session.counterId) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `/api/bank/ticket?status=Hold&branchId=${session.branchId}&counterId=${session.counterId}&date=${today}`
      );
      if (!response.ok) throw new Error("Failed to fetch held tickets");

      const data = await response.json();
      setHeldTickets(data);
    } catch (error) {
      console.error("Error fetching held tickets:", error);
      setError("Failed to fetch held tickets. Please try again.");
    }
  }, []);

  const fetchQueueTicketCounts = useCallback(async () => {
    if (!sessionData?.branchId || queueItems.length === 0) return;

    try {
      const counts: Record<string, number> = {};
      let totalCount = 0;
      const today = new Date().toISOString().split("T")[0];

      const responses = await Promise.all(
        queueItems.map((queue) =>
          fetch(
            `/api/bank/ticket?queueId=${queue._id}&status=Not Served&branchId=${sessionData.branchId}&date=${today}`
          )
        )
      );

      const data = await Promise.all(responses.map((res) => res.json()));

      data.forEach((tickets, index) => {
        counts[queueItems[index]._id] = tickets.length;
        totalCount += tickets.length;
      });

      setQueueTicketCounts(counts);
      setQueueStatus(totalCount);
    } catch (error) {
      console.error("Error fetching queue ticket counts:", error);
      setError("Failed to fetch queue ticket counts. Please try again.");
    }
  }, [queueItems, sessionData?.branchId]);

  const updateTicketCounterId = async (
    ticketId: string,
    counterId: string
  ): Promise<Ticket> => {
    const response = await fetch(`/api/bank/ticket/${ticketId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ counterId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update ticket counterId");
    }

    const updatedTicket = await response.json();
    return updatedTicket.data;
  };

  const updateTicketStatus = async (
    ticketId: string,
    status: "Serving" | "Served" | "Hold"
  ): Promise<Ticket> => {
    const response = await fetch(`/api/bank/ticket/${ticketId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ticketStatus: status }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update ticket status");
    }

    const updatedTicket = await response.json();
    return updatedTicket.data;
  };

  const calculateAverageServingTime = (ticketId: string) => {
    const startTime = servingStartTime[ticketId];
    if (!startTime) return;

    const endTime = new Date();
    const durationInMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    setAverageServingTime((prev) => {
      const [minutes, seconds] = prev.split(":").map(Number);
      const prevAverage = minutes + seconds / 60;
      const newAverage =
        ticketsServed === 0
          ? durationInMinutes
          : (prevAverage * ticketsServed + durationInMinutes) /
            (ticketsServed + 1);

      const newMinutes = Math.floor(newAverage);
      const newSeconds = Math.round((newAverage - newMinutes) * 60);
      return `${newMinutes}:${newSeconds.toString().padStart(2, "0")}`;
    });
  };

  const clearTicket = async () => {
    if (!currentTicket) return;

    try {
      await updateTicketStatus(currentTicket._id, "Served");
      calculateAverageServingTime(currentTicket._id);
      setServingStartTime((prev) => {
        const newState = { ...prev };
        delete newState[currentTicket._id];
        return newState;
      });
      setCurrentTicket(null);
      fetchQueueTicketCounts();
      setTicketsServed((prev) => prev + 1);
      // No need to update totalDailyTickets here as it includes all tickets
    } catch (error) {
      console.error("Error clearing ticket:", error);
      setError("Failed to clear ticket. Please try again.");
    }
  };

  const handleRedirect = async (newCounterId: string) => {
    if (!currentTicket) return;

    try {
      const response = await fetch(`/api/bank/ticket/${currentTicket._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ counterId: newCounterId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to redirect ticket");
      }

      setCurrentTicket(null);
      fetchQueueTicketCounts();
    } catch (error) {
      console.error("Error redirecting ticket:", error);
      setError("Failed to redirect ticket. Please try again.");
    }
  };

  // Update the updateJustifyReason function to properly handle the response
  const updateJustifyReason = async (
    newQueueId: string,
    newSubItemId: string
  ) => {
    if (!currentTicket) return;

    try {
      const newQueue = queueItems.find((item) => item._id === newQueueId);
      const newSubItem = newQueue?.menuItem.subMenuItems.find(
        (subItem) => subItem._id === newSubItemId
      );

      if (!newQueue || !newSubItem) {
        throw new Error("Invalid queue or subItem selected");
      }

      const justifyReason = `${newQueue.menuItem.name}-${newSubItem.name}`;
      console.log("Updating justify reason to:", justifyReason);

      const response = await fetch(`/api/bank/ticket/${currentTicket._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          justifyReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update justify reason");
      }

      const result = await response.json();
      console.log("Justify reason update response:", result);

      if (result.success && result.data) {
        setCurrentTicket(result.data);
        // Show a temporary success message
        // setError("Reason updated successfully!");
        // setTimeout(() => setError(null), 3000);
        toast({
          title: "Success",
          description: `Confirmation successfull`,
        });
      } else {
        throw new Error("Invalid response data");
      }
    } catch (error) {
      console.error("Error updating justify reason:", error);
      setError("Failed to update justify reason. Please try again.");
    }
  };

  const holdTicket = async () => {
    if (!currentTicket || !sessionData?.counterId) return;

    try {
      const updatedTicket = await updateTicketStatus(currentTicket._id, "Hold");
      setHeldTickets([...heldTickets, updatedTicket]);
      setCurrentTicket(null);
      if (sessionData) {
        fetchHeldTickets(sessionData);
      }
      fetchQueueTicketCounts();
    } catch (error) {
      console.error("Error putting ticket on hold:", error);
      setError("Failed to put ticket on hold. Please try again.");
    }
  };

  const callAgain = async () => {
    if (!currentTicket) return;

    try {
      const response = await fetch(`/api/bank/ticket/${currentTicket._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ callAgain: true }),
      });

      if (!response.ok) throw new Error("Failed to call ticket again");

      setCurrentTicket({ ...currentTicket, callAgain: true });
    } catch (error) {
      console.error("Error calling ticket again:", error);
      setError("Failed to call ticket again. Please try again.");
    }
  };

  const fetchNextTicket = async () => {
    if (!activeCounter || !sessionData?.branchId || !sessionData?.counterId)
      return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `/api/bank/ticket?queueId=${activeCounter.queueId._id}&status=Not Served&branchId=${sessionData.branchId}&date=${today}`
      );
      if (!response.ok) throw new Error("Failed to fetch next ticket");

      const data = await response.json();
      if (data.length > 0) {
        const nextTicket = data[0];
        const updatedTicket = await updateTicketStatus(
          nextTicket._id,
          "Serving"
        );
        await updateTicketCounterId(updatedTicket._id, sessionData.counterId);
        setCurrentTicket(updatedTicket);
        setServingStartTime((prev) => ({
          ...prev,
          [updatedTicket._id]: new Date(),
        }));
        fetchQueueTicketCounts();
      }
    } catch (error) {
      console.error("Error fetching next ticket:", error);
      setError("Failed to fetch next ticket. Please try again.");
    }
  };

  const toggleAvailability = async () => {
    if (!activeCounter) return;

    try {
      const response = await fetch(`/api/bank/counter/${activeCounter._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ available: !activeCounter.available }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to toggle availability");
      }

      const data = await response.json();
      if (data.counter) {
        setActiveCounter(data.counter);
        setError(null);

        // If the counter is now available and there's no current ticket, fetch the next ticket
        if (data.counter.available && !currentTicket) {
          fetchNextTicket();
        }
      } else {
        throw new Error("Invalid response data");
      }
    } catch (error) {
      console.error("Error toggling availability:", error);
      setError("Failed to toggle availability. Please try again.");
    }
  };

  const unholdTicket = async (ticketId: string) => {
    if (!sessionData?.counterId) return;

    try {
      const updatedTicket = await updateTicketStatus(ticketId, "Serving");
      await updateTicketCounterId(updatedTicket._id, sessionData.counterId);
      setCurrentTicket(updatedTicket);
      setHeldTickets(heldTickets.filter((t) => t._id !== ticketId));
      if (sessionData) {
        fetchHeldTickets(sessionData);
      }
      setIsActionsDialogOpen(false); // Close the dialog when unholding a ticket
    } catch (error) {
      console.error("Error unholding ticket:", error);
      setError("Failed to unhold ticket. Please try again.");
    }
  };

  // Session check and initial data load
  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Load initial data after session is verified
  useEffect(() => {
    if (sessionData?.isLoggedIn) {
      fetchInitialData();
    }
  }, [sessionData?.isLoggedIn, fetchInitialData]);

  // Setup polling for queue ticket counts - Changed to 60 seconds (60000ms)
  useEffect(() => {
    if (!sessionData?.isLoggedIn || queueItems.length === 0) return;

    fetchQueueTicketCounts();

    // Set up polling interval for 60 seconds
    const pollInterval = setInterval(fetchQueueTicketCounts, 60000);
    return () => clearInterval(pollInterval);
  }, [sessionData?.isLoggedIn, queueItems, fetchQueueTicketCounts]);

  // Refresh current ticket and held tickets
  useEffect(() => {
    if (!sessionData?.isLoggedIn) return;

    const refreshTickets = async () => {
      if (activeCounter && sessionData) {
        await Promise.all([
          fetchCurrentTicket(activeCounter, sessionData),
          fetchHeldTickets(sessionData),
        ]);
      }
    };

    refreshTickets();
  }, [activeCounter, sessionData, fetchCurrentTicket, fetchHeldTickets]);

  // Add this useEffect to automatically open the dialog when a ticket is cleared
  useEffect(() => {
    if (activeCounter?.available && !currentTicket) {
      setIsActionsDialogOpen(true);
    }
  }, [activeCounter?.available, currentTicket]);

  // Setup polling for total tickets - also 60 seconds
  useEffect(() => {
    if (!sessionData?.isLoggedIn) return;

    fetchTotalDailyTickets();

    // Set up polling interval for 60 seconds
    const pollInterval = setInterval(fetchTotalDailyTickets, 60000);
    return () => clearInterval(pollInterval);
  }, [sessionData?.isLoggedIn, fetchTotalDailyTickets]);

  const getQueueTicketCount = (queueId: string) => {
    return queueTicketCounts[queueId] || 0;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <>
      <Navbar userId={sessionData?.userId || ""} />
      <div className="container mx-auto py-5 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            {/* <h1 className="text-2xl font-bold text-gray-800">{companyName}</h1> */}
            <p className="text-muted-foreground">
              Managing{" "}
              {activeCounter &&
              activeCounter.queueId &&
              activeCounter.queueId.menuItem
                ? activeCounter.queueId.menuItem.name
                : "queue"}{" "}
              at Counter {activeCounter ? activeCounter.counterNumber : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Token</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#1155a3]">
                {currentTicket ? currentTicket.ticketNo : "N/A"}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {currentTicket
                  ? currentTicket.issueDescription
                  : "No active ticket"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Queue Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStatus}</div>
              <p className="text-sm text-muted-foreground">People waiting</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets Served</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ticketsServed}{" "}
                <span className="text-sm text-muted-foreground">
                  of {totalDailyTickets}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                My total / Daily total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Serving Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageServingTime}</div>
              <p className="text-sm text-muted-foreground">
                Minutes per customer
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {currentTicket ? (
              <div className="space-y-4">
                {/* Primary Actions Bar */}
                <div className="flex items-center bg-gray-50 p-1 rounded-lg">
                  <span className="px-3 font-medium text-gray-500">
                    Current Ticket:{" "}
                    <span className="text-[#1155a3]">
                      {currentTicket.ticketNo}
                    </span>
                  </span>
                  <div className="ml-auto flex flex-wrap gap-2 p-1">
                    <Button
                      onClick={clearTicket}
                      size="sm"
                      className="bg-green-600 hover:bg-[#8dc63f] flex items-center px-3"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <path d="M5 12l5 5l10 -10"></path>
                      </svg>
                      End
                    </Button>
                    <Button
                      onClick={callAgain}
                      size="sm"
                      className="bg-blue-600 hover:bg-[#1155a3] flex items-center"
                    >
                      <PhoneCall className="mr-1 h-4 w-4" />
                      Call Again
                    </Button>
                    <Button
                      onClick={holdTicket}
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-50 flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="10" y1="15" x2="10" y2="9" />
                        <line x1="14" y1="15" x2="14" y2="9" />
                      </svg>
                      Hold
                    </Button>
                  </div>
                </div>

                {/* Advanced Actions - Now always visible */}
                <div className="mt-3 bg-gray-50 p-3 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-3 text-gray-500 w-24">
                      Confirm:
                    </span>
                    <Select
                      onValueChange={(value) => {
                        const [queueId, subItemId] = value.split("|");
                        updateJustifyReason(queueId, subItemId);
                      }}
                      defaultValue={
                        currentTicket.justifyReason ? "custom" : undefined
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue
                          placeholder={
                            currentTicket.justifyReason || "Select Reason"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {currentTicket.justifyReason && (
                          <SelectItem value="custom" disabled>
                            {currentTicket.justifyReason}
                          </SelectItem>
                        )}
                        {queueItems.map((item) => (
                          <SelectGroup key={item._id}>
                            <SelectLabel>{item.menuItem.name}</SelectLabel>
                            {item.menuItem.subMenuItems.map((subItem) => (
                              <SelectItem
                                key={subItem._id}
                                value={`${item._id}|${subItem._id}`}
                              >
                                {subItem.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-3 text-gray-500 w-24">
                      Redirect To:
                    </span>
                    <Select onValueChange={handleRedirect}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select Counter" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCounters.map((counter) => (
                          <SelectItem key={counter._id} value={counter._id}>
                            Counter {counter.number} - {counter.queueName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                {!activeCounter?.available ? (
                  <Button
                    onClick={toggleAvailability}
                    size="sm"
                    className="bg-green-700 text-white hover:bg-green-300 h-8"
                    variant="outline"
                  >
                    Go Available
                  </Button>
                ) : (
                  <>
                    <Dialog
                      open={isActionsDialogOpen}
                      onOpenChange={setIsActionsDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => setIsActionsDialogOpen(true)}
                        >
                          Select Action
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Counter Actions</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          {/* Primary Actions - Always visible */}
                          <Button
                            onClick={() => {
                              toggleAvailability();
                              setIsActionsDialogOpen(false);
                            }}
                            variant="destructive"
                            className="w-full"
                          >
                            Go Unavailable
                          </Button>
                          <Button
                            onClick={() => {
                              setIsEditDialogOpen(true);
                              setIsActionsDialogOpen(false);
                            }}
                            variant="outline"
                            className="w-full"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-2"
                            >
                              <path d="M12 20h9"></path>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                            Change serving queue
                          </Button>
                          <Button
                            onClick={() => {
                              fetchNextTicket();
                              setIsActionsDialogOpen(false);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 w-full"
                          >
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Call Next
                          </Button>

                          {/* Held Tickets Section - Separate from primary actions */}
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
                                    className="flex justify-between items-center p-2 bg-yellow-50 rounded"
                                  >
                                    <div>
                                      <span className="font-semibold">
                                        {ticket.ticketNo}
                                      </span>
                                      <p className="text-xs text-muted-foreground">
                                        {ticket.issueDescription}
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                      onClick={() => {
                                        unholdTicket(ticket._id);
                                      }}
                                    >
                                      Unhold
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queueItems.map((queue) => (
                  <div
                    key={queue._id}
                    className="flex justify-between items-center"
                  >
                    <span className="font-semibold">{queue.menuItem.name}</span>
                    <span className="text-muted-foreground">
                      {getQueueTicketCount(queue._id)} tickets
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Held Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {heldTickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="flex justify-between items-center p-2 bg-yellow-50 rounded"
                  >
                    <span className="font-semibold">{ticket.ticketNo}</span>
                    <span className="text-muted-foreground">
                      {ticket.issueDescription}
                    </span>
                  </div>
                ))}
                {heldTickets.length === 0 && (
                  <p className="text-muted-foreground text-center py-2">
                    No tickets on hold
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <EditCounterDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          currentCounter={activeCounter}
          queueItems={queueItems}
          onCounterUpdate={fetchActiveCounter}
        />
      </div>
    </>
  );
}
