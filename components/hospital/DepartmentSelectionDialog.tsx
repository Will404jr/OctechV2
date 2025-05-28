"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Department {
  _id: string;
  title: string;
  icon: string;
  rooms: {
    _id: string;
    roomNumber: string;
    staff: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    available: boolean;
    createdAt?: string; // Added createdAt field
  }[];
}

interface DepartmentSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (departmentId: string, roomId?: string) => void;
  departments: Department[];
}

export const DepartmentSelectionDialog: React.FC<
  DepartmentSelectionDialogProps
> = ({ isOpen, onClose, onSubmit, departments }) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [assignToAnyRoom, setAssignToAnyRoom] = useState<boolean>(true);
  const [availableRooms, setAvailableRooms] = useState<Department["rooms"]>([]);

  const handleSubmit = () => {
    if (!selectedDepartment) return;

    if (assignToAnyRoom) {
      onSubmit(selectedDepartment);
    } else {
      onSubmit(selectedDepartment, selectedRoom);
    }
  };

  // Fetch rooms for the selected department that were created today
  useEffect(() => {
    const fetchRoomsForDepartment = async () => {
      if (!selectedDepartment) {
        setAvailableRooms([]);
        return;
      }

      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split("T")[0];

        // Fetch rooms for the selected department created today
        const response = await fetch(
          `/api/hospital/department/${selectedDepartment}/rooms?date=${today}`
        );
        if (!response.ok) throw new Error("Failed to fetch rooms");

        const data = await response.json();
        console.log("Fetched rooms for today:", data.rooms);

        // Show all rooms created today
        console.log("All rooms created today:", data.rooms);

        setAvailableRooms(data.rooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        setAvailableRooms([]);
      }
    };

    fetchRoomsForDepartment();
  }, [selectedDepartment]);

  // Reset selected room when department changes
  useEffect(() => {
    setSelectedRoom("");
  }, [selectedDepartment]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Next Department</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              value={selectedDepartment}
              onValueChange={(value) => {
                setSelectedDepartment(value);
                setSelectedRoom("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id}>
                    <span className="flex items-center">
                      <span className="mr-2">{dept.icon}</span> {dept.title}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDepartment && (
            <div className="space-y-4">
              <RadioGroup
                defaultValue="any"
                value={assignToAnyRoom ? "any" : "specific"}
                onValueChange={(value) => setAssignToAnyRoom(value === "any")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="any" />
                  <Label htmlFor="any">Assign to any available room</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="specific" />
                  <Label htmlFor="specific">Assign to specific room</Label>
                </div>
              </RadioGroup>

              {!assignToAnyRoom && (
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Select
                    value={selectedRoom}
                    onValueChange={setSelectedRoom}
                    disabled={availableRooms.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          availableRooms.length === 0
                            ? "No rooms created today"
                            : "Select room"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((room) => (
                        <SelectItem key={room._id} value={room._id}>
                          Room {room.roomNumber} - {room.staff.firstName}{" "}
                          {room.staff.lastName} {room.available ? "(Available)" : "(Occupied)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableRooms.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      No rooms were created today in this department. Please select
                      another department or choose "Assign to any available room".
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedDepartment ||
              (!assignToAnyRoom && !selectedRoom && availableRooms.length > 0)
            }
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};