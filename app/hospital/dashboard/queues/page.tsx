"use client";

import { useState, useEffect } from "react";
import { Search, Plus, X, Building2, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Department } from "@/types/department";

interface Staff {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
}

interface Room {
  _id: string;
  roomNumber: string;
  staff: Staff;
}

interface ActiveDepartment extends Department {
  _id: string;
  rooms: Room[];
}

const DepartmentsComponent = () => {
  // All available departments from the master list
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  // Departments that are active in the hospital
  const [activeDepartments, setActiveDepartments] = useState<
    ActiveDepartment[]
  >([]);
  const [filteredActiveDepartments, setFilteredActiveDepartments] = useState<
    ActiveDepartment[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const { toast } = useToast();

  const [editRoomNumber, setEditRoomNumber] = useState("");
  const [editStaffId, setEditStaffId] = useState("");

  // Fetch all possible departments from the local data
  useEffect(() => {
    const fetchAllDepartments = async () => {
      try {
        const { default: departmentsData } = await import("@/data/departments");
        setAllDepartments(departmentsData);
      } catch (error) {
        console.error("Error fetching all departments:", error);
        toast({
          title: "Error",
          description: "Failed to load department options",
          variant: "destructive",
        });
      }
    };

    fetchAllDepartments();
  }, [toast]);

  // Fetch active departments from the API
  useEffect(() => {
    const fetchActiveDepartments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/hospital/department");
        if (!response.ok) throw new Error("Failed to fetch departments");
        const data = await response.json();
        setActiveDepartments(data);
        setFilteredActiveDepartments(data);
      } catch (error) {
        console.error("Error fetching active departments:", error);
        toast({
          title: "Error",
          description: "Failed to load active departments",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveDepartments();
  }, [toast]);

  // Fetch staff list
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch("/api/hospital/staff");
        if (!response.ok) throw new Error("Failed to fetch staff");
        const data = await response.json();
        setStaffList(data);
      } catch (error) {
        console.error("Error fetching staff:", error);
        toast({
          title: "Error",
          description: "Failed to load staff list",
          variant: "destructive",
        });
      }
    };

    fetchStaff();
  }, [toast]);

  // Handle search for active departments
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredActiveDepartments(activeDepartments);
    } else {
      const filtered = activeDepartments.filter((dept) =>
        dept.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredActiveDepartments(filtered);
    }
  }, [searchQuery, activeDepartments]);

  const handleCreateDepartment = async () => {
    if (!selectedDepartment || !roomNumber || !selectedStaff) {
      toast({
        title: "Validation Error",
        description:
          "Please select a department, enter a room number, and assign a staff member",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingDepartment(true);

    try {
      const response = await fetch("/api/hospital/department", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          departmentTitle: selectedDepartment.title,
          roomNumber,
          staffId: selectedStaff,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create department");
      }

      const data = await response.json();

      toast({
        title: "Success",
        description: `${selectedDepartment.title} department created with room ${roomNumber}`,
      });

      // Add the new department to the active departments list
      setActiveDepartments((prev) => [...prev, data.data]);

      // Reset form
      setSelectedDepartment(null);
      setRoomNumber("");
      setSelectedStaff("");
    } catch (error: any) {
      console.error("Error creating department:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create department",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDepartment(false);
    }
  };

  const handleAddRoom = async (
    departmentId: string,
    departmentTitle: string
  ) => {
    if (!roomNumber || !selectedStaff) {
      toast({
        title: "Validation Error",
        description: "Please enter a room number and assign a staff member",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/hospital/department/${departmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "addRoom",
          roomData: {
            roomNumber,
            staff: selectedStaff,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add room");
      }

      const data = await response.json();

      toast({
        title: "Success",
        description: `Room ${roomNumber} added to ${departmentTitle} department`,
      });

      // Update the active departments list
      setActiveDepartments((prev) =>
        prev.map((dept) => (dept._id === departmentId ? data.data : dept))
      );

      // Reset form
      setRoomNumber("");
      setSelectedStaff("");
    } catch (error: any) {
      console.error("Error adding room:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add room",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/hospital/department/${departmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete department");
      }

      toast({
        title: "Success",
        description: "Department deleted successfully",
      });

      // Remove the department from the list
      setActiveDepartments((prev) =>
        prev.filter((dept) => dept._id !== departmentId)
      );
    } catch (error: any) {
      console.error("Error deleting department:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete department",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRoom = async (departmentId: string, roomId: string) => {
    if (!editRoomNumber && !editStaffId) {
      toast({
        title: "No Changes",
        description: "No changes were made",
      });
      return;
    }

    setIsLoading(true);

    try {
      const roomData: any = {};
      if (editRoomNumber) roomData.roomNumber = editRoomNumber;
      if (editStaffId) roomData.staff = editStaffId;

      const response = await fetch(`/api/hospital/department/${departmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateRoom",
          roomId,
          roomData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update room");
      }

      const data = await response.json();

      toast({
        title: "Success",
        description: "Room updated successfully",
      });

      // Update the department in the list
      setActiveDepartments((prev) =>
        prev.map((dept) => (dept._id === departmentId ? data.data : dept))
      );

      // Reset form
      setEditRoomNumber("");
      setEditStaffId("");
    } catch (error: any) {
      console.error("Error updating room:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update room",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async (departmentId: string, roomId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/hospital/department/${departmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deleteRoom",
          roomId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete room");
      }

      const data = await response.json();

      toast({
        title: "Success",
        description: "Room deleted successfully",
      });

      // Update the department in the list
      setActiveDepartments((prev) =>
        prev.map((dept) => (dept._id === departmentId ? data.data : dept))
      );
    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete room",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out departments that are already active
  const availableDepartments = allDepartments.filter(
    (dept) =>
      !activeDepartments.some((activeDept) => activeDept.title === dept.title)
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Hospital Departments</h1>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="mt-4 md:mt-0">
              <Plus size={16} className="mr-2" /> Create Department
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="department">Select Department</Label>
                <Select
                  value={selectedDepartment ? selectedDepartment.title : ""}
                  onValueChange={(value) => {
                    const dept = allDepartments.find((d) => d.title === value);
                    setSelectedDepartment(dept || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDepartments.map((dept) => (
                      <SelectItem key={dept.title} value={dept.title}>
                        <span className="flex items-center">
                          <span className="mr-2">{dept.icon}</span> {dept.title}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomNumber">Room Number</Label>
                <Input
                  id="roomNumber"
                  placeholder="Enter room number"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff">Assign Staff</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((staff) => (
                      <SelectItem key={staff._id} value={staff._id}>
                        {staff.firstName} {staff.lastName} ({staff.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleCreateDepartment}
                disabled={
                  isCreatingDepartment ||
                  !selectedDepartment ||
                  !roomNumber ||
                  !selectedStaff
                }
              >
                {isCreatingDepartment ? "Creating..." : "Create Department"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center mb-6 relative">
        <Search className="absolute left-3 text-gray-400" size={18} />
        <Input
          placeholder="Search active departments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading && activeDepartments.length === 0 ? (
        <div className="flex justify-center items-center h-40">
          <p className="text-muted-foreground">Loading departments...</p>
        </div>
      ) : filteredActiveDepartments.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-40 space-y-4">
          <Building2 size={48} className="text-muted-foreground" />
          <p className="text-muted-foreground">
            {searchQuery
              ? "No departments match your search"
              : "No departments have been created yet"}
          </p>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} className="mr-2" /> Create Your First Department
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              {/* Same content as the Create Department dialog above */}
              <DialogHeader>
                <DialogTitle>Create New Department</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Select Department</Label>
                  <Select
                    value={selectedDepartment ? selectedDepartment.title : ""}
                    onValueChange={(value) => {
                      const dept = allDepartments.find(
                        (d) => d.title === value
                      );
                      setSelectedDepartment(dept || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepartments.map((dept) => (
                        <SelectItem key={dept.title} value={dept.title}>
                          <span className="flex items-center">
                            <span className="mr-2">{dept.icon}</span>{" "}
                            {dept.title}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomNumber">Room Number</Label>
                  <Input
                    id="roomNumber"
                    placeholder="Enter room number"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff">Assign Staff</Label>
                  <Select
                    value={selectedStaff}
                    onValueChange={setSelectedStaff}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff._id} value={staff._id}>
                          {staff.firstName} {staff.lastName} ({staff.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={handleCreateDepartment}
                  disabled={
                    isCreatingDepartment ||
                    !selectedDepartment ||
                    !roomNumber ||
                    !selectedStaff
                  }
                >
                  {isCreatingDepartment ? "Creating..." : "Create Department"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredActiveDepartments.map((department) => (
            <Card
              key={department._id}
              className="hover:shadow-md transition-all"
            >
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center text-lg">
                    <span className="text-2xl mr-2">{department.icon}</span>
                    {department.title}
                  </CardTitle>
                  <CardDescription>
                    {department.rooms.length}{" "}
                    {department.rooms.length === 1 ? "room" : "rooms"}
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <X size={16} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Department</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p>
                        Are you sure you want to delete the{" "}
                        <strong>{department.title}</strong> department?
                      </p>
                      <p className="text-muted-foreground mt-2">
                        This will remove all rooms and assignments. This action
                        cannot be undone.
                      </p>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteDepartment(department._id)}
                        disabled={isLoading}
                      >
                        {isLoading ? "Deleting..." : "Delete Department"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                <div className="space-y-4">
                  <div>
                    {department.rooms.length > 0 ? (
                      <ul className="space-y-2">
                        {department.rooms.map((room) => (
                          <li
                            key={room._id}
                            className="text-sm flex justify-between items-center p-3 bg-muted/50 rounded-md mb-2"
                          >
                            <span>Room {room.roomNumber}</span>
                            <span className="text-muted-foreground">
                              {room.staff.firstName} {room.staff.lastName}
                            </span>
                            <div className="flex space-x-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                  >
                                    <Pencil size={12} />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Room</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="editRoomNumber">
                                        Room Number
                                      </Label>
                                      <Input
                                        id="editRoomNumber"
                                        placeholder="Enter room number"
                                        defaultValue={room.roomNumber}
                                        onChange={(e) =>
                                          setEditRoomNumber(e.target.value)
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="editStaff">
                                        Assign Staff
                                      </Label>
                                      <Select
                                        defaultValue={room.staff._id}
                                        onValueChange={setEditStaffId}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select staff member" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {staffList.map((staff) => (
                                            <SelectItem
                                              key={staff._id}
                                              value={staff._id}
                                            >
                                              {staff.firstName} {staff.lastName}{" "}
                                              ({staff.username})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button
                                      onClick={() =>
                                        handleEditRoom(department._id, room._id)
                                      }
                                      disabled={isLoading}
                                    >
                                      {isLoading ? "Saving..." : "Save Changes"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Room</DialogTitle>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <p>
                                      Are you sure you want to delete Room{" "}
                                      <strong>{room.roomNumber}</strong>?
                                    </p>
                                    <p className="text-muted-foreground mt-2">
                                      This action cannot be undone.
                                    </p>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button
                                      variant="destructive"
                                      onClick={() =>
                                        handleDeleteRoom(
                                          department._id,
                                          room._id
                                        )
                                      }
                                      disabled={isLoading}
                                    >
                                      {isLoading
                                        ? "Deleting..."
                                        : "Delete Room"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No rooms added yet
                      </p>
                    )}
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full">
                        <Plus size={16} className="mr-1" /> Add Room
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          <span className="flex items-center">
                            <span className="text-2xl mr-2">
                              {department.icon}
                            </span>
                            Add Room to {department.title}
                          </span>
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="roomNumber">Room Number</Label>
                          <Input
                            id="roomNumber"
                            placeholder="Enter room number"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="staff">Assign Staff</Label>
                          <Select
                            value={selectedStaff}
                            onValueChange={setSelectedStaff}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent>
                              {staffList.map((staff) => (
                                <SelectItem key={staff._id} value={staff._id}>
                                  {staff.firstName} {staff.lastName} (
                                  {staff.username})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                          onClick={() =>
                            handleAddRoom(department._id, department.title)
                          }
                          disabled={isLoading}
                        >
                          {isLoading ? "Adding..." : "Add Room"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentsComponent;
