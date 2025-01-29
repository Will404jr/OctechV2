"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash,
  MapPin,
  Database,
  Network,
  Building2,
  Monitor,
  Keyboard,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { QueueSpinner } from "@/components/queue-spinner";

interface Branch {
  _id: string;
  name: string;
  address: string;
  localNetworkAddress: string;
  databaseHost: string;
  databaseName: string;
  databaseUser: string;
  databasePassword: string;
  kioskUsername: string;
  kioskPassword: string;
  hallDisplayUsername: string;
  hallDisplayPassword: string;
}
const IconWithTooltip = ({
  icon: Icon,
  text,
  children,
  className = "",
}: {
  icon: LucideIcon;
  text: string;
  children?: React.ReactNode;
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className={`inline-flex items-center ${className}`}>
        <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
        {children}
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p className="text-sm">{text}</p>
    </TooltipContent>
  </Tooltip>
);

export default function BranchPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const { toast } = useToast();

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/bank/branches");
      const data = await response.json();
      setBranches(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch branches",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreate = async (branchData: Partial<Branch>) => {
    try {
      const response = await fetch("/api/bank/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branchData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Branch created successfully",
        });
        fetchBranches();
        setIsOpen(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create branch",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async (branchData: Partial<Branch>) => {
    if (!editingBranch) return;

    try {
      const response = await fetch(`/api/bank/branches/${editingBranch._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branchData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Branch updated successfully",
        });
        fetchBranches();
        setIsOpen(false);
        setEditingBranch(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update branch",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this branch?")) {
      try {
        const response = await fetch(`/api/bank/branches/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "Branch deleted successfully",
          });
          fetchBranches();
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete branch",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const branchData: Partial<Branch> = {
      name: formData.get("name")?.toString() || undefined,
      address: formData.get("address")?.toString() || undefined,
      localNetworkAddress:
        formData.get("localNetworkAddress")?.toString() || undefined,
      databaseHost: formData.get("databaseHost")?.toString() || undefined,
      databaseName: formData.get("databaseName")?.toString() || undefined,
      databaseUser: formData.get("databaseUser")?.toString() || undefined,
      kioskUsername: formData.get("kioskUsername")?.toString() || undefined,
      hallDisplayUsername:
        formData.get("hallDisplayUsername")?.toString() || undefined,
    };

    // Only include password fields if they are not empty
    const databasePassword = formData.get("databasePassword")?.toString();
    if (databasePassword) branchData.databasePassword = databasePassword;

    const kioskPassword = formData.get("kioskPassword")?.toString();
    if (kioskPassword) branchData.kioskPassword = kioskPassword;

    const hallDisplayPassword = formData.get("hallDisplayPassword")?.toString();
    if (hallDisplayPassword)
      branchData.hallDisplayPassword = hallDisplayPassword;

    if (editingBranch) {
      handleUpdate(branchData);
    } else {
      handleCreate(branchData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Branch Management
          </h1>
          <p className="text-gray-500">
            Manage your bank branch locations and configurations
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0e4480]">
              <Plus className="mr-2 h-4 w-4" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBranch ? "Edit Branch" : "Add New Branch"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Branch Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingBranch?.name || ""}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={editingBranch?.address || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="localNetworkAddress">
                    Local Network Address
                  </Label>
                  <Input
                    id="localNetworkAddress"
                    name="localNetworkAddress"
                    defaultValue={editingBranch?.localNetworkAddress || ""}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="databaseHost">Database Host</Label>
                  <Input
                    id="databaseHost"
                    name="databaseHost"
                    defaultValue={editingBranch?.databaseHost || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="databaseName">Database Name</Label>
                  <Input
                    id="databaseName"
                    name="databaseName"
                    defaultValue={editingBranch?.databaseName || ""}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="databaseUser">Database User</Label>
                  <Input
                    id="databaseUser"
                    name="databaseUser"
                    defaultValue={editingBranch?.databaseUser || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="databasePassword">
                    Update Database Password
                  </Label>
                  <Input
                    id="databasePassword"
                    name="databasePassword"
                    type="password"
                    placeholder="Enter new password to update"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kioskUsername">Kiosk Username</Label>
                  <Input
                    id="kioskUsername"
                    name="kioskUsername"
                    defaultValue={editingBranch?.kioskUsername || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kioskPassword">Update Kiosk Password</Label>
                  <Input
                    id="kioskPassword"
                    name="kioskPassword"
                    type="password"
                    placeholder="Enter new password to update"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hallDisplayUsername">
                    Hall Display Username
                  </Label>
                  <Input
                    id="hallDisplayUsername"
                    name="hallDisplayUsername"
                    defaultValue={editingBranch?.hallDisplayUsername || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hallDisplayPassword">
                    Update Hall Display Password
                  </Label>
                  <Input
                    id="hallDisplayPassword"
                    name="hallDisplayPassword"
                    type="password"
                    placeholder="Enter new password to update"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#0e4480]">
                {editingBranch ? "Update" : "Create"} Branch
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
        </div>
      ) : branches.length === 0 ? (
        <Card className="flex flex-col items-center justify-center h-48 border-dashed">
          <IconWithTooltip
            icon={Building2}
            text="No branches have been added yet"
            className="h-12 w-12 text-gray-400 mb-4"
          />
          <p className="text-lg text-gray-500">No branches available</p>
          <p className="text-sm text-gray-400">
            Add your first branch to get started
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <TooltipProvider key={branch._id}>
              <Card className="flex flex-col hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="mb-2">
                          Branch
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Bank branch location</TooltipContent>
                    </Tooltip>
                    <div className="flex space-x-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-blue-600"
                            onClick={() => {
                              setEditingBranch(branch);
                              setIsOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit branch details</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600"
                            onClick={() => handleDelete(branch._id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete this branch</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{branch.name}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="space-y-3">
                    <IconWithTooltip
                      icon={MapPin}
                      text="Physical branch location"
                      className="flex space-x-2 text-sm"
                    >
                      <span
                        className="text-gray-600 truncate ml-2"
                        title={branch.address}
                      >
                        {branch.address}
                      </span>
                    </IconWithTooltip>
                    <IconWithTooltip
                      icon={Network}
                      text="Local network configuration"
                      className="flex space-x-2 text-sm"
                    >
                      <span
                        className="text-gray-600 truncate ml-2"
                        title={branch.localNetworkAddress}
                      >
                        {branch.localNetworkAddress}
                      </span>
                    </IconWithTooltip>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-3">
                      <IconWithTooltip
                        icon={Database}
                        text="Database configuration details"
                        className="text-sm font-medium"
                      >
                        <span className="ml-2">Database</span>
                      </IconWithTooltip>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">
                          Host: {branch.databaseHost}
                        </p>
                        <p className="text-xs text-gray-500">
                          Name: {branch.databaseName}
                        </p>
                        <p className="text-xs text-gray-500">
                          User: {branch.databaseUser}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <IconWithTooltip
                        icon={Monitor}
                        text="System access credentials"
                        className="text-sm font-medium"
                      >
                        <span className="ml-2">Access</span>
                      </IconWithTooltip>
                      <div className="space-y-1">
                        <IconWithTooltip
                          icon={Keyboard}
                          text="Kiosk system username"
                          className="flex items-center space-x-1"
                        >
                          <p className="text-xs text-gray-500 ml-1">
                            {branch.kioskUsername}
                          </p>
                        </IconWithTooltip>
                        <IconWithTooltip
                          icon={Monitor}
                          text="Hall display system username"
                          className="flex items-center space-x-1"
                        >
                          <p className="text-xs text-gray-500 ml-1">
                            {branch.hallDisplayUsername}
                          </p>
                        </IconWithTooltip>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipProvider>
          ))}
        </div>
      )}
    </div>
  );
}
