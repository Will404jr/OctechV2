"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
// import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { CalendarIcon, PlusIcon, Loader2 } from "lucide-react";
import { QueueSpinner } from "@/components/queue-spinner";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface Event {
  _id: string;
  title: string;
  date: string;
}

export default function UpcomingEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/hospital/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = async () => {
    try {
      const response = await fetch("/api/hospital/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      if (response.ok) {
        const result = await response.json();
        setEvents((prev) => [...prev, result.data]);
        setNewEvent({ title: "", date: "" });
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  const handleEditEvent = async () => {
    if (!editingEventId) return;
    try {
      const response = await fetch(`/api/hospital/events/${editingEventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      if (response.ok) {
        // toast({
        //     title: "Success",
        //     description: "Event updated successfully",
        //   });

        fetchEvents();
        setIsDialogOpen(false);
        setIsEditing(false);
        setEditingEventId(null);
      }
    } catch (error) {
      console.error("Error editing event:", error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/hospital/events/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setEvents((prev) => prev.filter((event) => event._id !== id));
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const openEditDialog = (event: Event) => {
    setNewEvent({ title: event.title, date: event.date });
    setIsEditing(true);
    setEditingEventId(event._id);
    setIsDialogOpen(true);
  };

  const handleDialogOpen = () => {
    setIsEditing(false);
    setNewEvent({ title: "", date: "" });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission="UpcomingEvents">
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Upcoming Events</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleDialogOpen} className="bg-[#0e4480]">
                <PlusIcon className="mr-2 h-4 w-4" /> Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? "Edit Event" : "Add New Event"}
                </DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? "Edit the details of your event here."
                    : "Add the details of your new event here."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={newEvent.date}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, date: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="bg-[#0e4480]"
                  onClick={isEditing ? handleEditEvent : handleAddEvent}
                >
                  {isEditing ? "Save Changes" : "Add Event"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event._id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {event?.title || "Untitled Event"}
                </CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {event?.date
                    ? new Date(event.date).toLocaleDateString()
                    : "No date"}
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(event)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteEvent(event._id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}
