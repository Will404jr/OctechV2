import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RoomSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (roomNumber: number) => void;
  staffId: string;
  department: string;
}

export function RoomSelectionDialog({
  isOpen,
  onClose,
  onSubmit,
  staffId,
  department,
}: RoomSelectionDialogProps) {
  const [roomNumber, setRoomNumber] = useState<number | "">("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomNumber !== "") {
      onSubmit(Number(roomNumber));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Your Room</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roomNumber" className="text-right">
                Room Number
              </Label>
              <Input
                id="roomNumber"
                type="number"
                value={roomNumber}
                onChange={(e) => setRoomNumber(Number(e.target.value))}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
