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
import { Plus, Edit, Trash, Eye, EyeOff } from "lucide-react";
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

interface RoleOrBranch {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  image: string;
  role: RoleOrBranch | null;
  branch: RoleOrBranch | null;
  password?: string; // Add this line
}

interface Role extends RoleOrBranch {}
interface Branch extends RoleOrBranch {}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { control, handleSubmit, reset } = useForm<
    User & { password?: string }
  >({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      role: null,
      branch: null,
    },
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/bank/users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const rolesResponse = await fetch("/api/bank/roles");
      const branchesResponse = await fetch("/api/bank/branches");
      const rolesData = await rolesResponse.json();
      const branchesData = await branchesResponse.json();

      setRoles(rolesData);
      setBranches(branchesData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch roles or branches",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMetadata();
  }, []);

  const onSubmit = async (data: User & { password?: string }) => {
    const method = editingUser ? "PUT" : "POST";
    const url = editingUser
      ? `/api/bank/users/${editingUser._id}`
      : "/api/bank/users";

    const updatedData = {
      ...data,
      role: data.role?._id || null,
      branch: data.branch?._id || null,
    };

    // Remove password field if it's empty (for editing)
    if (!data.password) {
      delete updatedData.password;
    }

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
          description: editingUser ? "User updated" : "User created",
        });
        fetchUsers();
        reset({
          firstName: "",
          lastName: "",
          email: "",
          username: "",
          password: "",
          role: null,
          branch: null,
        });
        setIsOpen(false);
        setEditingUser(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to save user",
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
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        const response = await fetch(`/api/bank/users/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "User deleted",
          });
          fetchUsers();
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    reset({
      ...user,
      role: user.role || null,
      branch: user.branch || null,
      password: "", // Add this line
    });
    setIsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-[#0e4480]"
              onClick={() => {
                setEditingUser(null);
                reset({
                  firstName: "",
                  lastName: "",
                  email: "",
                  username: "",
                  password: "",
                  role: null,
                  branch: null,
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Edit User" : "Add User"}
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
                  <Label htmlFor="password">
                    {editingUser ? "Update Password" : "Password"}
                  </Label>
                  <div className="relative">
                    <Controller
                      name="password"
                      control={control}
                      rules={{
                        required: editingUser ? false : "Password is required",
                        minLength: {
                          value: 8,
                          message: "Password must be at least 8 characters",
                        },
                      }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            {...field}
                            placeholder={
                              editingUser
                                ? "Leave blank to keep current password"
                                : "Enter password"
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
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
                  <Label htmlFor="branch">Branch</Label>
                  <Controller
                    name="branch"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(value) =>
                          field.onChange(
                            value === "no-branch"
                              ? null
                              : branches.find(
                                  (branch) => branch._id === value
                                ) || null
                          )
                        }
                        value={field.value?._id || "no-branch"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-branch">No Branch</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch._id} value={branch._id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#0e4480]">
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
        </div>
      ) : users.length === 0 ? (
        <p className="text-center text-gray-500">No users available.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.firstName}</TableCell>
                <TableCell>{user.lastName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.role?.name || "No Role Assigned"}</TableCell>
                <TableCell>{user.branch?.name || "N/A"}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    className="mr-2 bg-[#3a72ec]"
                    onClick={() => handleEdit(user)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(user._id)}
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
  );
}
