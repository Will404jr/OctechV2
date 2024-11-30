"use client";

import { useEffect, useState } from "react";
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
import { Plus, X, Loader2, Edit, Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { QueueSpinner } from "@/components/queue-spinner";

// Types
interface SubMenuItem {
  name: string;
}

interface MenuItem {
  name: string;
  subMenuItems: SubMenuItem[];
}

interface Queue {
  _id: string;
  menuItem: MenuItem;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  menuItem: MenuItem;
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      menuItem: { name: "", subMenuItems: [] },
    },
  });

  const menuItem = watch("menuItem");

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/bank/queues");
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setQueues(data);
      } else {
        toast.error("Failed to fetch queues");
      }
    } catch (error) {
      toast.error("Error loading queues");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const url = editingQueue
        ? `/api/bank/queues/${editingQueue._id}`
        : "/api/bank/queues";
      const method = editingQueue ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchQueues();
        reset();
        setDialogOpen(false);
        setEditingQueue(null);
        toast.success(
          editingQueue
            ? "Queue updated successfully"
            : "Queue created successfully"
        );
      } else {
        const errorData = await response.json();
        toast.error(
          `Failed to ${editingQueue ? "update" : "create"} queue: ${
            errorData.message
          }`
        );
      }
    } catch (error) {
      toast.error(`Error ${editingQueue ? "updating" : "creating"} queue`);
    }
  };

  const deleteQueue = async (id: string) => {
    try {
      const response = await fetch(`/api/bank/queues/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setQueues(queues.filter((queue) => queue._id !== id));
        toast.success("Queue deleted successfully");
      } else {
        toast.error("Failed to delete queue");
      }
    } catch (error) {
      toast.error("Error deleting queue");
    }
  };

  const addSubItem = () => {
    const updatedSubItems = [...menuItem.subMenuItems, { name: "" }];
    setValue("menuItem.subMenuItems", updatedSubItems);
  };

  const removeSubItem = (index: number) => {
    const updatedSubItems = menuItem.subMenuItems.filter((_, i) => i !== index);
    setValue("menuItem.subMenuItems", updatedSubItems);
  };

  const openEditDialog = (queue: Queue) => {
    setEditingQueue(queue);
    setValue("menuItem", queue.menuItem);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Queue Management</h2>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingQueue(null);
              reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-[#0e4480]">
              <Plus className="mr-2 h-4 w-4" />
              Add Queue Menu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>
                {editingQueue ? "Edit" : "Create"} Queue Menu
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <Card>
                  <CardContent className="space-y-4 pt-4">
                    <div>
                      <Label>Menu Item Name</Label>
                      <Input
                        {...register("menuItem.name")}
                        placeholder="e.g., Teller Services"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sub Items</Label>
                      {menuItem.subMenuItems.map((subItem, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            {...register(`menuItem.subMenuItems.${index}.name`)}
                            placeholder="e.g., Deposit"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSubItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSubItem}
                      >
                        Add Sub Item
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Button type="submit" className="bg-[#0e4480]">
                {editingQueue ? "Update" : "Create"} Queue Menu
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {queues.length > 0 ? (
            queues.map((queue) => (
              <Card key={queue._id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">
                    {queue.menuItem.name}
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(queue)}
                      className="h-8 w-8 text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the queue and all its menu items.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteQueue(queue._id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Sub Items:
                    </h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {queue.menuItem.subMenuItems.map((subItem, index) => (
                        <li key={index} className="text-gray-700">
                          {subItem.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center">
              No queues available. Create one to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
