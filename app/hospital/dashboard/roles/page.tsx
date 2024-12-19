"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { QueueSpinner } from "@/components/queue-spinner";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface Permission {
  [key: string]: boolean;
}

interface Role {
  _id: string;
  name: string;
  permissions: Permission;
}

interface RoleFormData {
  name: string;
  permissions: Permission;
}

const menuItems = [
  "Users",
  "Roles",
  "Serving",
  "Queues",
  "UpcomingEvents",
  "Ads",
  "Settings",
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { control, handleSubmit, reset, setValue } = useForm<RoleFormData>({
    defaultValues: {
      name: "",
      permissions: Object.fromEntries(
        menuItems.map((item) => [item, false])
      ) as Permission,
    },
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/hospital/roles");
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createRole: SubmitHandler<RoleFormData> = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/hospital/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchRoles();
        reset();
        setIsDialogOpen(false);
      } else {
        const errorData = await response.json();
        console.error("Error creating role:", errorData);
      }
    } catch (error) {
      console.error("Error creating role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRole: SubmitHandler<RoleFormData> = async (data) => {
    if (!editingRole) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/hospital/roles?id=${editingRole._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        await fetchRoles();
        reset();
        setEditingRole(null);
        setIsDialogOpen(false);
      } else {
        const errorData = await response.json();
        console.error("Error updating role:", errorData);
      }
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRole = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/hospital/roles?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchRoles();
      }
    } catch (error) {
      console.error("Error deleting role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (role: Role) => {
    setEditingRole(role);
    setValue("name", role.name);
    Object.entries(role.permissions).forEach(([key, value]) => {
      setValue(`permissions.${key}`, value);
    });
    setIsDialogOpen(true);
  };

  return (
    <ProtectedRoute requiredPermission="Roles">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold tracking-tight">User Roles</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#0e4480]"
                onClick={() => {
                  setEditingRole(null);
                  reset();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>
                  {editingRole ? "Edit Role" : "Create New Role"}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit(editingRole ? updateRole : createRole)}
                className="space-y-4"
              >
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Role Name</Label>
                    <Controller
                      name="name"
                      control={control}
                      rules={{ required: "Role name is required" }}
                      render={({ field, fieldState: { error } }) => (
                        <>
                          <Input id="name" {...field} />
                          {error && (
                            <p className="text-red-500 text-sm">
                              {error.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div className="space-y-4">
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {menuItems.map((item) => (
                        <div key={item} className="flex items-center space-x-2">
                          <Controller
                            name={`permissions.${item}`}
                            control={control}
                            render={({ field }) => (
                              <Checkbox
                                id={item}
                                checked={field.value}
                                onCheckedChange={(checked) =>
                                  field.onChange(checked)
                                }
                              />
                            )}
                          />
                          <Label htmlFor={item}>{item}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#0e4480]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editingRole ? "Update" : "Create"} Role
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && !roles.length ? (
          <div className="flex justify-center items-center h-64">
            <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Card key={role._id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>{role.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      className="bg-[#3a72ec]"
                      size="icon"
                      onClick={() => startEditing(role)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteRole(role._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Permissions:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(role.permissions).map(
                        ([key, value]) =>
                          value && (
                            <div
                              key={key}
                              className="flex items-center space-x-2"
                            >
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              <span>{key}</span>
                            </div>
                          )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
