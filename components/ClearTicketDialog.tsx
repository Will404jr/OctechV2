import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ClearTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: (note: string) => void;
  ticketNo: string;
}

export const ClearTicketDialog: React.FC<ClearTicketDialogProps> = ({
  isOpen,
  onClose,
  onClear,
  ticketNo,
}) => {
  const [note, setNote] = useState("");

  const handleClear = () => {
    onClear(note);
    setNote("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear Ticket {ticketNo}</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Add a note about this step (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[100px]"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleClear}>Clear Ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
