"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
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
}

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

    const branchData = {
      name: formData.get("name")?.toString() || undefined,
      address: formData.get("address")?.toString() || undefined,
      localNetworkAddress:
        formData.get("localNetworkAddress")?.toString() || undefined,
      databaseHost: formData.get("databaseHost")?.toString() || undefined,
      databaseName: formData.get("databaseName")?.toString() || undefined,
      databaseUser: formData.get("databaseUser")?.toString() || undefined,
      databasePassword:
        formData.get("databasePassword")?.toString() || undefined,
    };

    if (editingBranch) {
      handleUpdate(branchData);
    } else {
      handleCreate(branchData);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Branches</h1>
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
                  <Label htmlFor="databasePassword">Database Password</Label>
                  <Input
                    id="databasePassword"
                    name="databasePassword"
                    defaultValue={editingBranch?.databasePassword || ""}
                    required
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
        <p className="text-center text-gray-500">No branches available.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Network Address</TableHead>
              <TableHead>Database Name</TableHead>
              <TableHead>Database Host</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((branch) => (
              <TableRow key={branch._id}>
                <TableCell>{branch.name}</TableCell>
                <TableCell>{branch.address}</TableCell>
                <TableCell>{branch.localNetworkAddress}</TableCell>
                <TableCell>{branch.databaseName}</TableCell>
                <TableCell>{branch.databaseHost}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    className="mr-2 bg-[#3a72ec]"
                    onClick={() => {
                      setEditingBranch(branch);
                      setIsOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(branch._id)}
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
