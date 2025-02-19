"use client";

import type React from "react";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface QueueItem {
  _id: string;
  menuItem: {
    name: string;
  };
}

interface EditCounterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCounter: {
    _id: string;
    counterNumber: number;
    queueId: {
      _id: string;
      menuItem: {
        name: string;
      };
    };
  } | null;
  queueItems: QueueItem[];
  onCounterUpdate: () => void;
}

export function EditCounterDialog({
  open,
  onOpenChange,
  currentCounter,
  queueItems,
  onCounterUpdate,
}: EditCounterDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [selectedQueue, setSelectedQueue] = useState(
    currentCounter?.queueId._id || ""
  );
  const [counterNumber, setCounterNumber] = useState(
    currentCounter?.counterNumber.toString() || ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCounter) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/bank/counter/${currentCounter._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queueId: selectedQueue,
          counterNumber: Number.parseInt(counterNumber),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update counter");
      }

      toast({
        title: "Success",
        description: "Counter updated successfully",
      });
      onCounterUpdate();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update counter",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Counter Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="queue">Queue</Label>
            <Select value={selectedQueue} onValueChange={setSelectedQueue}>
              <SelectTrigger>
                <SelectValue placeholder="Select queue" />
              </SelectTrigger>
              <SelectContent>
                {queueItems.map((queue) => (
                  <SelectItem key={queue._id} value={queue._id}>
                    {queue.menuItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="counterNumber">Counter Number</Label>
            <Input
              id="counterNumber"
              type="number"
              value={counterNumber}
              onChange={(e) => setCounterNumber(e.target.value)}
              min="1"
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Counter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
