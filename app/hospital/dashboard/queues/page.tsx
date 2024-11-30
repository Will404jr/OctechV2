"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";

interface MenuItem {
  name: string;
  subItems: string[];
}

interface QueueFormData {
  menuItems: MenuItem[];
}

interface Queue {
  _id: string;
  department: string;
  menuItems: MenuItem[];
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, watch, setValue } =
    useForm<QueueFormData>({
      defaultValues: {
        menuItems: [{ name: "", subItems: [] }],
      },
    });

  const menuItems = watch("menuItems");

  const fetchQueues = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/hospital/queues");
      if (!response.ok) {
        throw new Error("Failed to fetch queues");
      }
      const data = await response.json();
      setQueues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch queues");
      console.error("Error fetching queues:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  const addMenuItem = () => {
    setValue("menuItems", [...menuItems, { name: "", subItems: [] }]);
  };

  const removeMenuItem = (index: number) => {
    const updatedItems = menuItems.filter((_, i) => i !== index);
    setValue("menuItems", updatedItems);
  };

  const addSubItem = (menuIndex: number) => {
    const updatedItems = [...menuItems];
    updatedItems[menuIndex].subItems = [
      ...updatedItems[menuIndex].subItems,
      "",
    ];
    setValue("menuItems", updatedItems);
  };

  const removeSubItem = (menuIndex: number, subIndex: number) => {
    const updatedItems = [...menuItems];
    updatedItems[menuIndex].subItems = updatedItems[menuIndex].subItems.filter(
      (_, i) => i !== subIndex
    );
    setValue("menuItems", updatedItems);
  };

  const onSubmit = async (data: QueueFormData) => {
    try {
      const response = await fetch("/api/hospital/queues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create queue");
      }

      // Refresh the queues list after successful creation
      await fetchQueues();
      reset({
        menuItems: [{ name: "", subItems: [] }],
      });
    } catch (error) {
      console.error("Error creating queue:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create queue"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-lg text-muted-foreground">Loading queues...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Department Queues</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Queue Menu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create Department Queue</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                {menuItems.map((item, menuIndex) => (
                  <Card key={menuIndex}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-base">
                        Department {menuIndex + 1}
                      </CardTitle>
                      {menuIndex > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMenuItem(menuIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Department Name</Label>
                        <Input
                          {...register(`menuItems.${menuIndex}.name`)}
                          placeholder="e.g., Emergency Room"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Services</Label>
                        {item.subItems.map((_, subIndex) => (
                          <div key={subIndex} className="flex gap-2">
                            <Input
                              {...register(
                                `menuItems.${menuIndex}.subItems.${subIndex}`
                              )}
                              placeholder="e.g., Triage"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSubItem(menuIndex, subIndex)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addSubItem(menuIndex)}
                        >
                          Add Service
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={addMenuItem}>
                  Add Department
                </Button>
              </div>
              <Button type="submit" className="w-full">
                Create Queue Menu
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {queues.map((queue) => (
          <Card key={queue._id}>
            <CardHeader>
              <CardTitle>{queue.department}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queue.menuItems.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <h4 className="font-semibold">{item.name}</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {item.subItems.map((subItem, subIndex) => (
                        <li key={subIndex}>{subItem}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
