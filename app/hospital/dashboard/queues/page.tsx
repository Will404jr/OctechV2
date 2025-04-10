"use client";

import { useState, useEffect } from "react";
import { Search, Plus, X, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
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

interface ActiveDepartment extends Department {
  _id: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const { toast } = useToast();

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
    if (!selectedDepartment) {
      toast({
        title: "Validation Error",
        description: "Please select a department",
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create department");
      }

      const data = await response.json();

      toast({
        title: "Success",
        description: `${selectedDepartment.title} department created successfully`,
      });

      // Add the new department to the active departments list
      setActiveDepartments((prev) => [...prev, data.data]);

      // Reset form
      setSelectedDepartment(null);
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
            <Button className="mt-4 md:mt-0 bg-[#0e4480]">
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
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleCreateDepartment}
                disabled={isCreatingDepartment || !selectedDepartment}
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
              <Button className="bg-[#0e4480]">
                <Plus size={16} className="mr-2" /> Create Your First Department
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
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={handleCreateDepartment}
                  disabled={isCreatingDepartment || !selectedDepartment}
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
                    {/* Department ID: {department._id} */}
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
                        This action cannot be undone.
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentsComponent;
