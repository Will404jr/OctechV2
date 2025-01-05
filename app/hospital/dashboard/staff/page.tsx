"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { QueueSpinner } from "@/components/queue-spinner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import departments, { Department } from "@/lib/models/departments";

interface RoleOrBranch {
  _id: string;
  name: string;
}

interface Staff {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  image: string;
  password: string;
  role: RoleOrBranch | null;
  department: string;
}

interface Role extends RoleOrBranch {}

export default function UsersPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const { toast } = useToast();
  const { control, handleSubmit, reset } = useForm<Staff>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      role: null,
      password: "",
      department: "",
    },
  });

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/hospital/staff");
      const data = await response.json();
      setStaff(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch staff",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const rolesResponse = await fetch("/api/hospital/roles");
      const rolesData = await rolesResponse.json();

      setRoles(rolesData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch roles",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchMetadata();
  }, []);

  const onSubmit = async (data: Staff) => {
    const method = editingStaff ? "PUT" : "POST";
    const url = editingStaff
      ? `/api/hospital/staff/${editingStaff._id}`
      : "/api/hospital/staff";

    const updatedData = {
      ...data,
      role: data.role?._id || null,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: editingStaff ? "Staff updated" : "Staff created",
        });
        fetchStaff();
        reset({
          firstName: "",
          lastName: "",
          email: "",
          username: "",
          password: "",
          role: null,
          department: "",
        });
        setIsOpen(false);
        setEditingStaff(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to save staff",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this staff?")) {
      try {
        const response = await fetch(`/api/hospital/staff/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "Staff deleted",
          });
          fetchStaff();
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete staff",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    reset({
      ...staff,
      role: staff.role || null,
    });
    setIsOpen(true);
  };

  return (
    <ProtectedRoute requiredPermission="Staff">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold tracking-tight">Staff</h2>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#0e4480]"
                onClick={() => {
                  setEditingStaff(null);
                  reset({
                    firstName: "",
                    lastName: "",
                    email: "",
                    username: "",
                    password: "",
                    role: null,
                    department: "",
                  });
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingStaff ? "Edit Staff" : "Add Staff"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Controller
                      name="firstName"
                      control={control}
                      rules={{ required: "First name is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <Input id="firstName" {...field} />
                          {error && (
                            <p className="text-red-500 text-sm">
                              {error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Controller
                      name="lastName"
                      control={control}
                      rules={{ required: "Last name is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <Input id="lastName" {...field} />
                          {error && (
                            <p className="text-red-500 text-sm">
                              {error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Controller
                      name="email"
                      control={control}
                      rules={{
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <Input id="email" type="email" {...field} />
                          {error && (
                            <p className="text-red-500 text-sm">
                              {error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Controller
                      name="username"
                      control={control}
                      rules={{ required: "Username is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <Input id="username" {...field} />
                          {error && (
                            <p className="text-red-500 text-sm">
                              {error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Controller
                      name="role"
                      control={control}
                      rules={{ required: "Role is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(
                                roles.find((role) => role._id === value) || null
                              )
                            }
                            value={field.value?._id || ""}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role._id} value={role._id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {error && (
                            <p className="text-red-500 text-sm">
                              {error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="department">Department</Label>
                    <Controller
                      name="department"
                      control={control}
                      rules={{ required: "Department is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <Select
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((dept: Department) => (
                                <SelectItem key={dept.title} value={dept.title}>
                                  {dept.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {error && (
                            <p className="text-red-500 text-sm">
                              {error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Controller
                      name="password"
                      control={control}
                      rules={{ required: "Password is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <Input id="password" type="password" {...field} />
                          {error && (
                            <p className="text-red-500 text-sm">
                              {error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-[#0e4480]">
                  {editingStaff ? "Update Staff" : "Create Staff"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
          </div>
        ) : staff.length === 0 ? (
          <p className="text-center text-gray-500">No staff available.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((staff) => (
                <TableRow key={staff._id}>
                  <TableCell>{staff.firstName}</TableCell>
                  <TableCell>{staff.lastName}</TableCell>
                  <TableCell>{staff.email}</TableCell>
                  <TableCell>{staff.username}</TableCell>
                  <TableCell>
                    {staff.role?.name || "No Role Assigned"}
                  </TableCell>
                  <TableCell>{staff.department}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      className="mr-2 bg-[#3a72ec]"
                      onClick={() => handleEdit(staff)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(staff._id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </ProtectedRoute>
  );
}
