"use client"

import { useState, useEffect } from "react"
import { Search, Plus, X, Building2, Check, Edit, Trash2, User, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/ProtectedRoute"

interface Department {
  title: string
  icon: string
}

interface Staff {
  _id: string
  firstName: string
  lastName: string
  username?: string
}

interface Room {
  _id: string
  roomNumber: string
  staff: Staff
  available: boolean
  currentTicket?: string
  createdAt: string
  updatedAt: string
}

interface ActiveDepartment extends Department {
  _id: string
  rooms?: Room[]
}

const DepartmentsComponent = () => {
  // All available departments from the master list
  const [allDepartments, setAllDepartments] = useState<Department[]>([])
  // Departments that are active in the hospital
  const [activeDepartments, setActiveDepartments] = useState<ActiveDepartment[]>([])
  const [filteredActiveDepartments, setFilteredActiveDepartments] = useState<ActiveDepartment[]>([])
  const [departmentRooms, setDepartmentRooms] = useState<Record<string, Room[]>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false)
  const [isDeletingRoom, setIsDeletingRoom] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState("")
  const { toast } = useToast()

  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [createRoomDialogOpen, setCreateRoomDialogOpen] = useState(false)
  const [selectedDepartmentForRoom, setSelectedDepartmentForRoom] = useState<string | null>(null)
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [newRoomNumber, setNewRoomNumber] = useState("")
  const [selectedStaffId, setSelectedStaffId] = useState("")

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  }

  // Fetch all possible departments from the local data
  useEffect(() => {
    const fetchAllDepartments = async () => {
      try {
        const { default: departmentsData } = await import("@/data/departments")
        setAllDepartments(departmentsData)
      } catch (error) {
        console.error("Error fetching all departments:", error)
        toast({
          title: "Error",
          description: "Failed to load department options",
          variant: "destructive",
        })
      }
    }

    fetchAllDepartments()
  }, [toast])

  // Fetch today's rooms for a specific department
  const fetchDepartmentRooms = async (departmentId: string) => {
    try {
      const todayDate = getTodayDate()
      const response = await fetch(`/api/hospital/department/${departmentId}/rooms?date=${todayDate}`)

      if (!response.ok) {
        throw new Error("Failed to fetch rooms")
      }

      const data = await response.json()
      return data.rooms || []
    } catch (error) {
      console.error(`Error fetching rooms for department ${departmentId}:`, error)
      return []
    }
  }

  // Fetch active departments from the API
  useEffect(() => {
    const fetchActiveDepartments = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/hospital/department")
        if (!response.ok) throw new Error("Failed to fetch departments")
        const data = await response.json()
        setActiveDepartments(data)
        setFilteredActiveDepartments(data)

        // Fetch rooms for each department
        const roomsData: Record<string, Room[]> = {}
        await Promise.all(
          data.map(async (dept: ActiveDepartment) => {
            const rooms = await fetchDepartmentRooms(dept._id)
            roomsData[dept._id] = rooms
          }),
        )
        setDepartmentRooms(roomsData)
      } catch (error) {
        console.error("Error fetching active departments:", error)
        toast({
          title: "Error",
          description: "Failed to load active departments",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchActiveDepartments()
  }, [toast])

  // Handle search for active departments
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredActiveDepartments(activeDepartments)
    } else {
      const filtered = activeDepartments.filter((dept) => dept.title.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredActiveDepartments(filtered)
    }
  }, [searchQuery, activeDepartments])

  // Fetch all staff members
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch("/api/hospital/staff")
        if (!response.ok) throw new Error("Failed to fetch staff")
        const data = await response.json()
        setAllStaff(data)
      } catch (error) {
        console.error("Error fetching staff:", error)
        toast({
          title: "Error",
          description: "Failed to load staff members",
          variant: "destructive",
        })
      }
    }

    fetchStaff()
  }, [toast])

  const handleCreateDepartment = async () => {
    if (!selectedDepartment) {
      toast({
        title: "Validation Error",
        description: "Please select a department",
        variant: "destructive",
      })
      return
    }

    setIsCreatingDepartment(true)

    try {
      const response = await fetch("/api/hospital/department", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          departmentTitle: selectedDepartment.title,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create department")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: `${selectedDepartment.title} department created successfully`,
      })

      // Add the new department to the active departments list
      setActiveDepartments((prev) => [...prev, data.data])
      // Initialize empty rooms for the new department
      setDepartmentRooms((prev) => ({ ...prev, [data.data._id]: [] }))

      // Reset form
      setSelectedDepartment(null)
      setOpen(false)
      setDepartmentSearchQuery("")
    } catch (error: any) {
      console.error("Error creating department:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create department",
        variant: "destructive",
      })
    } finally {
      setIsCreatingDepartment(false)
    }
  }

  const handleDeleteDepartment = async (departmentId: string) => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/hospital/department/${departmentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete department")
      }

      toast({
        title: "Success",
        description: "Department deleted successfully",
      })

      // Remove the department from the list
      setActiveDepartments((prev) => prev.filter((dept) => dept._id !== departmentId))
      // Remove rooms data for the deleted department
      setDepartmentRooms((prev) => {
        const newRooms = { ...prev }
        delete newRooms[departmentId]
        return newRooms
      })
    } catch (error: any) {
      console.error("Error deleting department:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete department",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRoom = async (departmentId: string, roomId: string, roomNumber: string) => {
    try {
      setIsDeletingRoom(roomId)

      const response = await fetch(`/api/hospital/department/${departmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deleteRoom",
          roomId: roomId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete room")
      }

      toast({
        title: "Success",
        description: `Room ${roomNumber} deleted successfully`,
      })

      // Update the rooms data
      const updatedRooms = await fetchDepartmentRooms(departmentId)
      setDepartmentRooms((prev) => ({ ...prev, [departmentId]: updatedRooms }))
    } catch (error: any) {
      console.error("Error deleting room:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete room",
        variant: "destructive",
      })
    } finally {
      setIsDeletingRoom(null)
    }
  }

  const handleCreateRoom = async () => {
    if (!selectedDepartmentForRoom || !newRoomNumber || !selectedStaffId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsCreatingRoom(true)

    try {
      const response = await fetch("/api/hospital/room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: selectedStaffId,
          department: selectedDepartmentForRoom,
          roomNumber: newRoomNumber,
          available: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create room")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: `Room ${newRoomNumber} created successfully`,
      })

      // Update the rooms data for this department
      const updatedRooms = await fetchDepartmentRooms(selectedDepartmentForRoom)
      setDepartmentRooms((prev) => ({ ...prev, [selectedDepartmentForRoom]: updatedRooms }))

      // Reset form and close dialog
      setNewRoomNumber("")
      setSelectedStaffId("")
      setSelectedDepartmentForRoom(null)
      setCreateRoomDialogOpen(false)
    } catch (error: any) {
      console.error("Error creating room:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create room",
        variant: "destructive",
      })
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const openCreateRoomDialog = (departmentId: string) => {
    setSelectedDepartmentForRoom(departmentId)
    setCreateRoomDialogOpen(true)
  }

  // Format staff name
  const formatStaffName = (staff: Staff) => {
    return `${staff.firstName} ${staff.lastName}`
  }

  // Filter out departments that are already active
  const availableDepartments = allDepartments.filter(
    (dept) => !activeDepartments.some((activeDept) => activeDept.title === dept.title),
  )

  // Filter available departments based on search query
  const filteredAvailableDepartments = departmentSearchQuery
    ? availableDepartments.filter((dept) => dept.title.toLowerCase().includes(departmentSearchQuery.toLowerCase()))
    : availableDepartments

  const renderDepartmentCombobox = (dialogClose?: boolean) => (
    <div className="space-y-2">
      <Label htmlFor="department-combobox">Select Department</Label>
      <div className="relative">
        <Command className="rounded-lg border shadow-md">
          <CommandInput
            id="department-combobox"
            placeholder="Search departments..."
            value={departmentSearchQuery}
            onValueChange={setDepartmentSearchQuery}
          />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty>No departments found.</CommandEmpty>
            <CommandGroup>
              {filteredAvailableDepartments.length > 0 ? (
                filteredAvailableDepartments.map((dept) => (
                  <CommandItem
                    key={dept.title}
                    value={dept.title}
                    onSelect={(value) => {
                      const selectedDept = allDepartments.find((d) => d.title.toLowerCase() === value.toLowerCase())
                      setSelectedDepartment(selectedDept || null)
                      setDepartmentSearchQuery("")
                    }}
                    className="flex items-center cursor-pointer"
                  >
                    <span className="mr-2">{dept.icon}</span>
                    <span>{dept.title}</span>
                    {selectedDepartment?.title === dept.title && <Check className="ml-auto h-4 w-4 text-green-600" />}
                  </CommandItem>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-gray-500">
                  {departmentSearchQuery ? "No departments match your search" : "All departments have been created"}
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>

      {selectedDepartment && (
        <div className="mt-2 p-2 bg-blue-50 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2 text-lg">{selectedDepartment.icon}</span>
            <span className="font-medium">{selectedDepartment.title}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDepartment(null)}
            className="h-8 w-8 p-0 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <DialogFooter className={dialogClose ? "" : "mt-4"}>
        {dialogClose && (
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
        )}
        <Button
          onClick={handleCreateDepartment}
          disabled={isCreatingDepartment || !selectedDepartment}
          className={dialogClose ? "" : "w-full"}
        >
          {isCreatingDepartment ? "Creating..." : "Create Department"}
        </Button>
      </DialogFooter>
    </div>
  )

  return (
    <ProtectedRoute requiredPermission="Departments">
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Hospital Departments</h1>
          <p className="text-muted-foreground mt-1">Today's rooms ({getTodayDate()})</p>
        </div>

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
            <div className="space-y-4 py-4">{renderDepartmentCombobox(true)}</div>
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
            {searchQuery ? "No departments match your search" : "No departments have been created yet"}
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
              <div className="space-y-4 py-4">{renderDepartmentCombobox(true)}</div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredActiveDepartments.map((department) => {
            const todaysRooms = departmentRooms[department._id] || []

            return (
              <Card key={department._id} className="hover:shadow-md transition-all">
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center text-lg">
                      <span className="text-2xl mr-2">{department.icon}</span>
                      {department.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      {todaysRooms.length} room{todaysRooms.length !== 1 ? "s" : ""} today
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openCreateRoomDialog(department._id)}
                    >
                      <Plus size={16} />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-8 w-8">
                          <X size={16} />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Department</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <p>
                            Are you sure you want to delete the <strong>{department.title}</strong> department?
                          </p>
                          <p className="text-muted-foreground mt-2">This action cannot be undone.</p>
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
                  </div>
                </CardHeader>

                {todaysRooms.length > 0 && (
                  <>
                    <Separator />
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Today's Rooms</h4>
                        {todaysRooms.map((room) => (
                          <div key={room._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">Room {room.roomNumber}</span>
                                <Badge
                                  variant={room.available ? "default" : "secondary"}
                                  className={`text-xs ${
                                    room.available ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {room.available ? "Available" : "Unavailable"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{formatStaffName(room.staff)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Created: {new Date(room.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  toast({
                                    title: "Edit Room",
                                    description: "Edit functionality to be implemented",
                                  })
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Room</DialogTitle>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <p>
                                      Are you sure you want to delete <strong>Room {room.roomNumber}</strong>?
                                    </p>
                                    <p className="text-muted-foreground mt-2">This action cannot be undone.</p>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleDeleteRoom(department._id, room._id, room.roomNumber)}
                                      disabled={isDeletingRoom === room._id}
                                    >
                                      {isDeletingRoom === room._id ? "Deleting..." : "Delete Room"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Room Dialog */}
      <Dialog open={createRoomDialogOpen} onOpenChange={setCreateRoomDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-number">Room Number</Label>
              <Input
                id="room-number"
                placeholder="Enter room number (e.g., 101, A-205)"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-select">Assign Staff</Label>
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="Search staff members..." />
                <CommandList className="max-h-[200px] overflow-y-auto">
                  <CommandEmpty>No staff members found.</CommandEmpty>
                  <CommandGroup>
                    {allStaff.map((staff) => (
                      <CommandItem
                        key={staff._id}
                        value={`${staff.firstName} ${staff.lastName}`}
                        onSelect={() => {
                          setSelectedStaffId(staff._id)
                        }}
                        className="flex items-center cursor-pointer"
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>{formatStaffName(staff)}</span>
                        {selectedStaffId === staff._id && <Check className="ml-auto h-4 w-4 text-green-600" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            {selectedStaffId && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md flex items-center justify-between">
                <div className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span className="font-medium">
                    {formatStaffName(allStaff.find((s) => s._id === selectedStaffId)!)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStaffId("")}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateRoom} disabled={isCreatingRoom || !newRoomNumber || !selectedStaffId}>
              {isCreatingRoom ? "Creating..." : "Create Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  )
}

export default DepartmentsComponent
