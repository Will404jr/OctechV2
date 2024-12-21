"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, SkipForward, Check } from "lucide-react";
import { QueueSpinner } from "@/components/queue-spinner";

interface SubMenuItem {
  _id: string;
  name: string;
}

interface MenuItem {
  _id: string;
  name: string;
  subMenuItems: SubMenuItem[];
}

interface QueueItem {
  _id: string;
  menuItem: MenuItem;
}

interface Ticket {
  _id: string;
  ticketNo: string;
  queueId: string;
  subItemId: string;
  issueDescription: string;
  ticketStatus: "Not Served" | "Serving" | "Served";
}

interface ActiveRoom {
  roomNumber: number;
  queueId: {
    _id: string;
    menuItem: MenuItem;
  };
}

export default function ServingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState("");
  const [counterNumber, setCounterNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomFetchError, setRoomFetchError] = useState<string | null>(null);

  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [queuePreview, setQueuePreview] = useState<Ticket[]>([]);
  const [isServing, setIsServing] = useState(false);
  const [queueStatus, setQueueStatus] = useState(0);
  const [averageServingTime, setAverageServingTime] = useState("0:00");
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueItem | null>(
    null
  );

  const [isChangeQueueDialogOpen, setIsChangeQueueDialogOpen] = useState(false);
  const [ticketToChange, setTicketToChange] = useState<Ticket | null>(null);
  const [newQueueId, setNewQueueId] = useState("");
  const [newSubItemId, setNewSubItemId] = useState("");

  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [isChangeRoomDialogOpen, setIsChangeRoomDialogOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");

  const fetchQueuePreview = useCallback(async () => {
    if (!selectedQueueId) return;

    try {
      console.log("Fetching queue preview for queueId:", selectedQueueId);
      const response = await fetch(
        `/api/ticket?queueId=${selectedQueueId}&status=Not Served`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched queue preview data:", data);
      setQueuePreview(data.slice(0, 3));
      setQueueStatus(data.length);
    } catch (error) {
      console.error("Error fetching queue preview:", error);
      setError("Failed to fetch tickets. Please try again.");
    }
  }, [selectedQueueId]);

  useEffect(() => {
    fetchQueueItems();
    fetchActiveRoom();
  }, []);

  useEffect(() => {
    if (selectedQueueId) {
      fetchQueuePreview();
      const intervalId = setInterval(fetchQueuePreview, 5000); // Poll every 5 seconds
      return () => clearInterval(intervalId);
    }
  }, [selectedQueueId, fetchQueuePreview]);

  const fetchQueueItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/hospital/queues");
      if (!response.ok) {
        throw new Error("Failed to fetch queue items");
      }
      const data = await response.json();
      setQueueItems(data);
    } catch (err) {
      setError("Error fetching queue items. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveRoom = async () => {
    try {
      setRoomFetchError(null);
      const response = await fetch("/api/hospital/room");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.room) {
        setActiveRoom(data.room);
        setSelectedQueueId(data.room.queueId._id);
        setCounterNumber(data.room.roomNumber.toString());
        setIsDialogOpen(false);
      } else {
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error("Error fetching active room:", error);
      setRoomFetchError("Failed to fetch active room. Please try again.");
      setIsDialogOpen(true);
    }
  };

  const handleDialogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQueueId && counterNumber) {
      try {
        const response = await fetch("/api/hospital/room", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomNumber: parseInt(counterNumber),
            queueId: selectedQueueId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create room");
        }

        const data = await response.json();
        setActiveRoom(data.room);
        setIsDialogOpen(false);
        const selected = queueItems.find(
          (item) => item._id === selectedQueueId
        );
        setSelectedQueueItem(selected || null);
      } catch (error) {
        console.error("Error creating room:", error);
        setError("Failed to start serving. Please try again.");
      }
    }
  };

  const startServing = async () => {
    setIsServing(true);
    await fetchNextTicket();
  };

  const pauseServing = () => {
    setIsServing(false);
  };

  const fetchNextTicket = async () => {
    try {
      // Check if there's a currently serving ticket
      const servingResponse = await fetch(
        `/api/ticket?queueId=${selectedQueueId}&status=Serving`
      );
      if (!servingResponse.ok) {
        throw new Error("Failed to fetch serving ticket");
      }
      const servingData = await servingResponse.json();

      if (servingData.length > 0) {
        // If there's a serving ticket, use it
        setCurrentTicket(servingData[0]);
      } else {
        // If no serving ticket, fetch the next 'Not Served' ticket
        const response = await fetch(
          `/api/ticket?queueId=${selectedQueueId}&status=Not Served`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch next ticket");
        }
        const data = await response.json();
        if (data.length > 0) {
          setCurrentTicket(data[0]);
          await updateTicketStatus(data[0]._id, "Serving");
        } else {
          setCurrentTicket(null);
        }
      }
      await fetchQueuePreview();
    } catch (error) {
      console.error("Error fetching next ticket:", error);
    }
  };

  const markAsServed = async () => {
    if (currentTicket) {
      await updateTicketStatus(currentTicket._id, "Served");
      await fetchNextTicket();
    }
  };

  const updateTicketStatus = async (
    ticketId: string,
    status: "Serving" | "Served"
  ) => {
    try {
      const response = await fetch(`/api/ticket/${ticketId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticketStatus: status }),
      });
      if (!response.ok) {
        throw new Error("Failed to update ticket status");
      }
    } catch (error) {
      console.error("Error updating ticket status:", error);
    }
  };

  const changeQueue = async (
    ticketId: string,
    newQueueId: string,
    newSubItemId: string
  ) => {
    try {
      const newQueue = queueItems.find((item) => item._id === newQueueId);
      const newSubItem = newQueue?.menuItem.subMenuItems.find(
        (subItem) => subItem._id === newSubItemId
      );
      const newIssueDescription = `${newQueue?.menuItem.name} - ${newSubItem?.name}`;

      const response = await fetch(`/api/ticket/${ticketId}`, {
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
      const updatedTicket = await response.json();

      // If the current ticket was changed to a different queue, remove it
      if (
        currentTicket &&
        currentTicket._id === ticketId &&
        newQueueId !== selectedQueueId
      ) {
        setCurrentTicket(null);
      }

      await fetchQueuePreview();
      setIsChangeQueueDialogOpen(false);
      setTicketToChange(null);
      setNewQueueId("");
      setNewSubItemId("");
    } catch (error) {
      console.error("Error changing queue:", error);
      setError("Failed to change queue. Please try again.");
    }
  };

  const handleChangeRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQueueId && newRoomNumber) {
      try {
        const response = await fetch("/api/hospital/room", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomNumber: parseInt(newRoomNumber),
            queueId: selectedQueueId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update room");
        }

        const data = await response.json();
        setActiveRoom(data.room);
        setCounterNumber(newRoomNumber);
        setIsChangeRoomDialogOpen(false);
        const selected = queueItems.find(
          (item) => item._id === selectedQueueId
        );
        setSelectedQueueItem(selected || null);
      } catch (error) {
        console.error("Error updating room:", error);
        setError("Failed to update room. Please try again.");
      }
    }
  };

  useEffect(() => {
    const fetchServingTicket = async () => {
      if (selectedQueueId) {
        try {
          const response = await fetch(
            `/api/ticket?queueId=${selectedQueueId}&status=Serving`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch serving ticket");
          }
          const data = await response.json();
          if (data.length > 0) {
            setCurrentTicket(data[0]);
          }
        } catch (error) {
          console.error("Error fetching serving ticket:", error);
        }
      }
    };

    fetchServingTicket();
  }, [selectedQueueId]);

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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Serving Details</DialogTitle>
            <DialogDescription>
              Choose a queue item and enter the room number to start serving.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDialogSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="queueItem" className="text-right">
                  Queue Item
                </label>
                <Select
                  onValueChange={setSelectedQueueId}
                  value={selectedQueueId}
                >
                  <SelectTrigger id="queueItem" className="col-span-3">
                    <SelectValue placeholder="Select a queue item" />
                  </SelectTrigger>
                  <SelectContent>
                    {queueItems.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.menuItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="counterNumber" className="text-right">
                  Room
                </label>
                <Input
                  id="counterNumber"
                  type="number"
                  value={counterNumber}
                  onChange={(e) => setCounterNumber(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-[#0e4480]">
                Start Serving
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {roomFetchError && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{roomFetchError}</span>
        </div>
      )}
      <div className="container mx-auto py-10 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Serving Station
            </h2>
            <p className="text-muted-foreground">
              Managing{" "}
              {selectedQueueItem ? selectedQueueItem.menuItem.name : "queue"} at
              Counter {counterNumber}
            </p>
          </div>
          <Button onClick={() => setIsChangeRoomDialogOpen(true)}>
            Change Room
          </Button>
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
              {currentTicket && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setTicketToChange(currentTicket);
                    setIsChangeQueueDialogOpen(true);
                  }}
                >
                  Change Queue
                </Button>
              )}
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

        <div className="flex gap-4">
          <Button
            size="lg"
            className="w-full"
            onClick={startServing}
            disabled={isServing}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Serving
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={pauseServing}
            disabled={!isServing}
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={fetchNextTicket}
            disabled={!isServing}
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Next Customer
          </Button>
          {currentTicket && (
            <Button
              size="lg"
              variant="default"
              className="w-full"
              onClick={markAsServed}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark as Served
            </Button>
          )}
        </div>

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
      </div>

      <Dialog
        open={isChangeQueueDialogOpen}
        onOpenChange={setIsChangeQueueDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Queue</DialogTitle>
            <DialogDescription>
              Select a new queue for ticket {ticketToChange?.ticketNo}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="newQueue" className="text-right">
                New Queue
              </label>
              <Select onValueChange={setNewQueueId} value={newQueueId}>
                <SelectTrigger id="newQueue" className="col-span-3">
                  <SelectValue placeholder="Select a new queue" />
                </SelectTrigger>
                <SelectContent>
                  {queueItems.map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.menuItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newQueueId && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="newSubMenuItem" className="text-right">
                  New menu
                </label>
                <Select onValueChange={setNewSubItemId} value={newSubItemId}>
                  <SelectTrigger id="newSubMenuItem" className="col-span-3">
                    <SelectValue placeholder="Select a new sub-menu item" />
                  </SelectTrigger>
                  <SelectContent>
                    {queueItems
                      .find((item) => item._id === newQueueId)
                      ?.menuItem.subMenuItems.map((subItem) => (
                        <SelectItem key={subItem._id} value={subItem._id}>
                          {subItem.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              className="bg-[#0e4480]"
              onClick={() =>
                changeQueue(ticketToChange!._id, newQueueId, newSubItemId)
              }
              disabled={!newQueueId || !newSubItemId}
            >
              Change Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isChangeRoomDialogOpen}
        onOpenChange={setIsChangeRoomDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Room</DialogTitle>
            <DialogDescription>
              Select a new queue and enter a new room number.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeRoom}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="newQueueItem" className="text-right">
                  New Queue
                </label>
                <Select
                  onValueChange={setSelectedQueueId}
                  value={selectedQueueId}
                >
                  <SelectTrigger id="newQueueItem" className="col-span-3">
                    <SelectValue placeholder="Select a queue item" />
                  </SelectTrigger>
                  <SelectContent>
                    {queueItems.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.menuItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="newRoomNumber" className="text-right">
                  New Room
                </label>
                <Input
                  id="newRoomNumber"
                  type="number"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-[#0e4480]">
                Update Room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
