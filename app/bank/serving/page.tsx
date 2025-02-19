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
} from "@/components/ui/select";
import { PhoneCall, ArrowRight } from "lucide-react";
import { QueueSpinner } from "@/components/queue-spinner";
import { EditCounterDialog } from "@/components/edit-counter-dialog";

interface Ticket {
  _id: string;
  ticketNo: string;
  queueId: string;
  subItemId: string;
  issueDescription: string;
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
  const [queuePreview, setQueuePreview] = useState<Ticket[]>([]);
  const [queueStatus, setQueueStatus] = useState(0);
  const [averageServingTime, setAverageServingTime] = useState("0:00");
  const [heldTickets, setHeldTickets] = useState<Ticket[]>([]);
  const router = useRouter();
  const [availableCounters, setAvailableCounters] = useState<
    Array<{
      _id: string;
      number: number;
      queueName: string;
    }>
  >([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchSessionData = useCallback(async () => {
    try {
      console.log("Fetching session data...");
      const response = await fetch("/api/session");
      if (!response.ok) {
        throw new Error("Failed to fetch session data");
      }
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
      console.log("Fetching active counter...");
      const response = await fetch(
        `/api/bank/counter/${sessionData.counterId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch active counter");
      }
      const data = await response.json();
      console.log("Active counter:", data);
      setActiveCounter(data.counter);
    } catch (error) {
      console.error("Error fetching active counter:", error);
      setError("Failed to fetch active counter. Please try again.");
    }
  }, [sessionData?.counterId]);

  const fetchQueueItems = useCallback(async () => {
    try {
      console.log("Fetching queue items...");
      const response = await fetch("/api/bank/queues");
      if (!response.ok) {
        throw new Error("Failed to fetch queue items");
      }
      const data = await response.json();
      console.log("Queue items:", data);
      setQueueItems(data);
    } catch (error) {
      console.error("Error fetching queue items:", error);
      setError("Failed to fetch queue items. Please try again.");
    }
  }, []);

  const fetchQueuePreview = useCallback(async () => {
    if (!activeCounter || !sessionData?.branchId) return;

    try {
      console.log("Fetching queue preview...");
      const response = await fetch(
        `/api/bank/ticket?queueId=${activeCounter.queueId._id}&status=Not Served&branchId=${sessionData.branchId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch queue preview");
      }
      const data = await response.json();
      console.log("Queue preview:", data);
      setQueuePreview(data.slice(0, 3));
      setQueueStatus(data.length);
    } catch (error) {
      console.error("Error fetching queue preview:", error);
      setError("Failed to fetch queue preview. Please try again.");
    }
  }, [activeCounter, sessionData?.branchId]);

  const fetchCurrentTicket = useCallback(async () => {
    if (!activeCounter || !sessionData?.branchId || !sessionData?.counterId)
      return;

    try {
      console.log("Fetching current ticket...");
      const response = await fetch(
        `/api/bank/ticket?queueId=${activeCounter.queueId._id}&status=Serving&branchId=${sessionData.branchId}&counterId=${sessionData.counterId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch current ticket");
      }
      const data = await response.json();
      console.log("Current ticket:", data);
      if (data.length > 0) {
        const ticket = data[0];
        // Ensure the ticket has the correct counterId
        if (ticket.counterId !== sessionData.counterId) {
          const updatedTicket = await updateTicketCounterId(
            ticket._id,
            sessionData.counterId
          );
          setCurrentTicket(updatedTicket);
        } else {
          setCurrentTicket(ticket);
        }
      } else {
        setCurrentTicket(null);
      }
    } catch (error) {
      console.error("Error fetching current ticket:", error);
      setError("Failed to fetch current ticket. Please try again.");
    }
  }, [activeCounter, sessionData?.branchId, sessionData?.counterId]);

  const fetchHeldTickets = useCallback(async () => {
    if (!sessionData?.branchId || !sessionData?.counterId) return;

    try {
      console.log("Fetching held tickets...");
      const response = await fetch(
        `/api/bank/ticket?status=Hold&branchId=${sessionData.branchId}&counterId=${sessionData.counterId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch held tickets");
      }
      const data = await response.json();
      console.log("Held tickets:", data);
      setHeldTickets(data);
    } catch (error) {
      console.error("Error fetching held tickets:", error);
      setError("Failed to fetch held tickets. Please try again.");
    }
  }, [sessionData?.branchId, sessionData?.counterId]);

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
      console.error("Error updating ticket counterId:", errorData);
      throw new Error(errorData.error || "Failed to update ticket counterId");
    }

    const updatedTicket = await response.json();
    return updatedTicket.data;
  };

  const fetchAvailableCounters = useCallback(async () => {
    if (!sessionData?.branchId) return;

    try {
      const response = await fetch(
        `/api/bank/counter/available?branchId=${sessionData.branchId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch available counters");
      }
      const data = await response.json();
      setAvailableCounters(data.counters);
    } catch (error) {
      console.error("Error fetching available counters:", error);
      setError("Failed to fetch available counters. Please try again.");
    }
  }, [sessionData?.branchId]);

  useEffect(() => {
    console.log("Initial useEffect running...");
    fetchSessionData();
  }, [fetchSessionData]);

  useEffect(() => {
    console.log("Session data changed:", sessionData);
    if (sessionData?.isLoggedIn) {
      fetchActiveCounter();
      fetchQueueItems();
      fetchAvailableCounters();
    }
  }, [
    sessionData,
    fetchActiveCounter,
    fetchQueueItems,
    fetchAvailableCounters,
  ]);

  useEffect(() => {
    console.log("Active counter changed:", activeCounter);
    if (activeCounter) {
      fetchQueuePreview();
      fetchCurrentTicket();
      fetchHeldTickets();
    }
  }, [activeCounter, fetchQueuePreview, fetchCurrentTicket, fetchHeldTickets]);

  useEffect(() => {
    console.log("Setting up polling...");
    const pollInterval = setInterval(() => {
      if (sessionData?.isLoggedIn && activeCounter) {
        fetchQueuePreview();
        fetchCurrentTicket();
        fetchHeldTickets();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [
    sessionData,
    activeCounter,
    fetchQueuePreview,
    fetchCurrentTicket,
    fetchHeldTickets,
  ]);

  useEffect(() => {
    console.log("Checking if loading should end...");
    if (sessionData && activeCounter && queueItems.length > 0) {
      console.log("All data loaded, setting isLoading to false");
      setIsLoading(false);
    }
  }, [sessionData, activeCounter, queueItems]);

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
      console.error("Error updating ticket status:", errorData);
      throw new Error(errorData.error || "Failed to update ticket status");
    }

    const updatedTicket = await response.json();
    return updatedTicket.data;
  };

  const clearTicket = async () => {
    if (currentTicket) {
      try {
        await updateTicketStatus(currentTicket._id, "Served");
        setCurrentTicket(null);
        fetchQueuePreview();
      } catch (error) {
        console.error("Error clearing ticket:", error);
        setError("Failed to clear ticket. Please try again.");
      }
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
        throw new Error("Failed to redirect ticket");
      }

      setCurrentTicket(null);
      fetchQueuePreview();
    } catch (error) {
      console.error("Error redirecting ticket:", error);
      setError("Failed to redirect ticket. Please try again.");
    }
  };

  const changeQueue = async (newQueueId: string, newSubItemId: string) => {
    if (!currentTicket) return;

    try {
      const newQueue = queueItems.find((item) => item._id === newQueueId);
      const newSubItem = newQueue?.menuItem.subMenuItems.find(
        (subItem) => subItem._id === newSubItemId
      );
      const newIssueDescription = `${newQueue?.menuItem.name} - ${newSubItem?.name}`;

      const response = await fetch(`/api/bank/ticket/${currentTicket._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queueId: newQueueId,
          subItemId: newSubItemId,
          issueDescription: newIssueDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to change queue");
      }

      fetchCurrentTicket();
      fetchQueuePreview();
    } catch (error) {
      console.error("Error changing queue:", error);
      setError("Failed to change queue. Please try again.");
    }
  };

  const holdTicket = async () => {
    if (currentTicket && sessionData?.counterId) {
      try {
        const updatedTicket = await updateTicketStatus(
          currentTicket._id,
          "Hold"
        );
        // Ensure the counterId is set to the current session's counterId
        await updateTicketCounterId(updatedTicket._id, sessionData.counterId);
        setHeldTickets([
          ...heldTickets,
          { ...updatedTicket, counterId: sessionData.counterId },
        ]);
        setCurrentTicket(null);
        fetchQueuePreview();
        fetchHeldTickets();
      } catch (error) {
        console.error("Error putting ticket on hold:", error);
        setError("Failed to put ticket on hold. Please try again.");
      }
    }
  };

  const callAgain = async () => {
    if (currentTicket) {
      try {
        const response = await fetch(`/api/bank/ticket/${currentTicket._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ callAgain: true }),
        });

        if (!response.ok) {
          throw new Error("Failed to call ticket again");
        }

        setCurrentTicket({ ...currentTicket, callAgain: true });
      } catch (error) {
        console.error("Error calling ticket again:", error);
        setError("Failed to call ticket again. Please try again.");
      }
    }
  };

  const fetchNextTicket = async () => {
    if (!activeCounter || !sessionData?.branchId || !sessionData?.counterId)
      return;

    try {
      const response = await fetch(
        `/api/bank/ticket?queueId=${activeCounter.queueId._id}&status=Not Served&branchId=${sessionData.branchId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch next ticket");
      }
      const data = await response.json();
      if (data.length > 0) {
        const nextTicket = data[0];
        const updatedTicket = await updateTicketStatus(
          nextTicket._id,
          "Serving"
        );
        await updateTicketCounterId(updatedTicket._id, sessionData.counterId);
        setCurrentTicket(updatedTicket);
        fetchQueuePreview();
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
        setError(null); // Clear any previous errors
      } else {
        console.error("Invalid response data:", data);
        setError("Failed to update counter availability. Please try again.");
      }
    } catch (error) {
      console.error("Error toggling availability:", error);
      setError("Failed to toggle availability. Please try again.");
    }
  };

  const unholdTicket = async (ticketId: string) => {
    try {
      const updatedTicket = await updateTicketStatus(ticketId, "Serving");
      await updateTicketCounterId(
        updatedTicket._id,
        sessionData?.counterId || ""
      );
      setCurrentTicket(updatedTicket);
      setHeldTickets(heldTickets.filter((t) => t._id !== ticketId));
      fetchQueuePreview();
      fetchHeldTickets();
    } catch (error) {
      console.error("Error unholding ticket:", error);
      setError("Failed to unhold ticket. Please try again.");
    }
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
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Serving Station</h2>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Current Token</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">
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
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {currentTicket ? (
              <>
                <Button onClick={clearTicket}>Clear</Button>
                <Select onValueChange={handleRedirect}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Redirect" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCounters.map((counter) => (
                      <SelectItem key={counter._id} value={counter._id}>
                        Counter {counter.number} - {counter.queueName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(value) => changeQueue(value, "")}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Change Queue" />
                  </SelectTrigger>
                  <SelectContent>
                    {queueItems.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.menuItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={holdTicket}>Hold</Button>
                <Button onClick={callAgain}>
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Call Again
                </Button>
              </>
            ) : (
              <>
                <Button onClick={toggleAvailability}>
                  {activeCounter?.available ? "Unavailable" : "Available"}
                </Button>
                <Button
                  onClick={fetchNextTicket}
                  disabled={!activeCounter?.available}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Next
                </Button>
                <Button onClick={() => setIsEditDialogOpen(true)}>
                  Change Counter
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {queuePreview.map((ticket, index) => (
              <div
                key={ticket._id}
                className={`flex justify-between items-center p-2 ${
                  index === 0 ? "bg-blue-50" : "bg-gray-50"
                } rounded`}
              >
                <span className="font-semibold">{ticket.ticketNo}</span>
                <span className="text-muted-foreground">
                  {ticket.issueDescription}
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unholdTicket(ticket._id)}
                >
                  Unhold
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <EditCounterDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        currentCounter={activeCounter}
        queueItems={queueItems}
        onCounterUpdate={fetchActiveCounter}
      />
    </div>
  );
}
