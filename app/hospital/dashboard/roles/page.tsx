"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";

const permissions = [
  { id: "viewUsers", label: "View Staff Members" },
  { id: "manageUsers", label: "Manage Staff Members" },
  { id: "viewRoles", label: "View Roles" },
  { id: "manageRoles", label: "Manage Roles" },
  { id: "viewServing", label: "View Serving" },
  { id: "manageServing", label: "Manage Serving" },
  { id: "viewQueues", label: "View Queues" },
  { id: "manageQueues", label: "Manage Queues" },
  { id: "viewAds", label: "View Display Ads" },
  { id: "manageAds", label: "Manage Display Ads" },
  { id: "viewSettings", label: "View Settings" },
  { id: "manageSettings", label: "Manage Settings" },
];

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/hospital/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedRoles = await response.json();
        setRoles(updatedRoles);
        reset();
      }
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Staff Roles</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input id="name" {...register("name")} required />
                </div>
                <div className="space-y-4">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox id={permission.id} {...register(`permissions.${permission.id}`)} />
                        <Label htmlFor={permission.id}>{permission.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full">Create Role</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role: any) => (
          <Card key={role._id}>
            <CardHeader>
              <CardTitle>{role.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-semibold">Permissions:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(role.permissions).map(([key, value]: [string, any]) => (
                    value && (
                      <div key={key} className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}