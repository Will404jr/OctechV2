"use client";

import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";

interface Ticket {
  _id: string;
  ticketNo: string;
  subItemId: string;
  issueDescription: string;
  ticketStatus: "Not Served" | "Serving" | "Served";
}

interface QueueItem {
  _id: string;
  menuItem: {
    name: string;
  };
}

export default function ServingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState("");
  const [counterNumber, setCounterNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [queuePreview, setQueuePreview] = useState<Ticket[]>([]);
  const [isServing, setIsServing] = useState(false);
  const [queueStatus, setQueueStatus] = useState(0);
  const [averageServingTime, setAverageServingTime] = useState("0:00");
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueItem | null>(
    null
  );

  useEffect(() => {
    fetchQueueItems();
  }, []);

  const fetchQueueItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/bank/queues");
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

  const handleDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQueueId && counterNumber) {
      setIsDialogOpen(false);
      const selected = queueItems.find((item) => item._id === selectedQueueId);
      setSelectedQueueItem(selected || null);
      fetchQueuePreview().catch((err) => {
        console.error("Error in handleDialogSubmit:", err);
        setError("An error occurred while fetching tickets. Please try again.");
      });
    }
  };

  const fetchQueuePreview = async () => {
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
      await fetchQueuePreview();
    } catch (error) {
      console.error("Error fetching next ticket:", error);
    }
  };

  const markAsServed = async () => {
    if (currentTicket) {
      await updateTicketStatus(currentTicket._id, "Served");
      if (isServing) {
        await fetchNextTicket();
      } else {
        setCurrentTicket(null);
      }
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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
              Choose a queue item and enter the counter number to start serving.
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
                  Counter
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
              <Button type="submit">Start Serving</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto py-10 space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Serving Station</h2>
          <p className="text-muted-foreground">
            Managing{" "}
            {selectedQueueItem ? selectedQueueItem.menuItem.name : "queue"} at
            Counter {counterNumber}
          </p>
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
    </>
  );
}
