"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { X, Plus, ArrowRight, Info } from "lucide-react"

interface Department {
  _id: string
  title: string
  icon: string
  rooms: {
    _id: string
    roomNumber: string
    staff: {
      _id: string
      firstName: string
      lastName: string
    }
    available: boolean
    createdAt?: string
  }[]
}

interface DepartmentSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (departments: Array<{ departmentId: string; roomId?: string }>) => void
  departments: Department[]
  currentDepartmentId?: string
  currentRoomId?: string
}

interface SelectedDepartment {
  departmentId: string
  departmentName: string
  roomId?: string
  assignToAnyRoom: boolean
}

export const DepartmentSelectionDialog: React.FC<DepartmentSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  departments,
  currentDepartmentId,
  currentRoomId,
}) => {
  const [selectedDepartments, setSelectedDepartments] = useState<SelectedDepartment[]>([])
  const [currentDepartment, setCurrentDepartment] = useState<string>("")
  const [currentRoom, setCurrentRoom] = useState<string>("")
  const [assignToAnyRoom, setAssignToAnyRoom] = useState<boolean>(true)
  const [availableRooms, setAvailableRooms] = useState<Department["rooms"]>([])
  const [multipleMode, setMultipleMode] = useState<boolean>(false)
  const [andBack, setAndBack] = useState<boolean>(false)

  const handleSubmit = () => {
    let departmentQueue: Array<{ departmentId: string; roomId?: string }> = []

    if (multipleMode) {
      if (selectedDepartments.length === 0) return

      departmentQueue = selectedDepartments.map((dept) => ({
        departmentId: dept.departmentId,
        roomId: dept.assignToAnyRoom ? undefined : dept.roomId,
      }))
    } else {
      if (!currentDepartment) return

      departmentQueue = [
        {
          departmentId: currentDepartment,
          roomId: assignToAnyRoom ? undefined : currentRoom,
        },
      ]
    }

    // Add current department and room to the end if "And back" is enabled
    if (andBack && currentDepartmentId) {
      departmentQueue.push({
        departmentId: currentDepartmentId,
        roomId: currentRoomId,
      })
    }

    onSubmit(departmentQueue)

    // Reset form
    setSelectedDepartments([])
    setCurrentDepartment("")
    setCurrentRoom("")
    setAssignToAnyRoom(true)
    setMultipleMode(false)
    setAndBack(false)
  }

  const addDepartment = () => {
    if (!currentDepartment) return

    const department = departments.find((d) => d._id === currentDepartment)
    if (!department) return

    // Check if department is already selected
    if (selectedDepartments.some((d) => d.departmentId === currentDepartment)) {
      return
    }

    const newDept: SelectedDepartment = {
      departmentId: currentDepartment,
      departmentName: department.title,
      roomId: assignToAnyRoom ? undefined : currentRoom,
      assignToAnyRoom,
    }

    setSelectedDepartments([...selectedDepartments, newDept])
    setCurrentDepartment("")
    setCurrentRoom("")
    setAssignToAnyRoom(true)
  }

  const removeDepartment = (index: number) => {
    setSelectedDepartments(selectedDepartments.filter((_, i) => i !== index))
  }

  const moveDepartment = (fromIndex: number, toIndex: number) => {
    const newDepartments = [...selectedDepartments]
    const [movedItem] = newDepartments.splice(fromIndex, 1)
    newDepartments.splice(toIndex, 0, movedItem)
    setSelectedDepartments(newDepartments)
  }

  // Fetch rooms for the selected department
  useEffect(() => {
    const fetchRoomsForDepartment = async () => {
      if (!currentDepartment) {
        setAvailableRooms([])
        return
      }

      try {
        const today = new Date().toISOString().split("T")[0]
        const response = await fetch(`/api/hospital/department/${currentDepartment}/rooms?date=${today}`)
        if (!response.ok) throw new Error("Failed to fetch rooms")

        const data = await response.json()
        setAvailableRooms(data.rooms)
      } catch (error) {
        console.error("Error fetching rooms:", error)
        setAvailableRooms([])
      }
    }

    fetchRoomsForDepartment()
  }, [currentDepartment])

  // Reset selected room when department changes
  useEffect(() => {
    setCurrentRoom("")
  }, [currentDepartment])

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Next Department(s)</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Mode Selection */}
            <div className="space-y-4">
              <RadioGroup
                value={multipleMode ? "multiple" : "single"}
                onValueChange={(value) => {
                  setMultipleMode(value === "multiple")
                  if (value === "single") {
                    setSelectedDepartments([])
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single">Send to single department</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple" id="multiple" />
                  <Label htmlFor="multiple">Send to multiple departments (in order)</Label>
                </div>
              </RadioGroup>
            </div>

            {multipleMode && (
              <>
                {/* Selected Departments Queue */}
                {selectedDepartments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Department Queue (in order):</Label>
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      {selectedDepartments.map((dept, index) => {
                        const deptInfo = departments.find((d) => d._id === dept.departmentId)
                        return (
                          <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{index + 1}</Badge>
                              <span className="flex items-center gap-2">
                                {deptInfo?.icon} {dept.departmentName}
                              </span>
                              {!dept.assignToAnyRoom && dept.roomId && <Badge variant="secondary">Specific Room</Badge>}
                              {index < selectedDepartments.length - 1 && (
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {index > 0 && (
                                <Button variant="ghost" size="sm" onClick={() => moveDepartment(index, index - 1)}>
                                  ↑
                                </Button>
                              )}
                              {index < selectedDepartments.length - 1 && (
                                <Button variant="ghost" size="sm" onClick={() => moveDepartment(index, index + 1)}>
                                  ↓
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => removeDepartment(index)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Add Department Section */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <Label>Add Department to Queue:</Label>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={currentDepartment}
                      onValueChange={(value) => {
                        setCurrentDepartment(value)
                        setCurrentRoom("")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments
                          .filter((dept) => !selectedDepartments.some((d) => d.departmentId === dept._id))
                          .map((dept) => (
                            <SelectItem key={dept._id} value={dept._id}>
                              <span className="flex items-center">
                                <span className="mr-2">{dept.icon}</span> {dept.title}
                              </span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {currentDepartment && (
                    <div className="space-y-4">
                      <RadioGroup
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
                            value={currentRoom}
                            onValueChange={setCurrentRoom}
                            disabled={availableRooms.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={availableRooms.length === 0 ? "No rooms created today" : "Select room"}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRooms.map((room) => (
                                <SelectItem key={room._id} value={room._id}>
                                  Room {room.roomNumber} - {room.staff.firstName} {room.staff.lastName}{" "}
                                  {room.available ? "(Available)" : "(Unavailable)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button
                        onClick={addDepartment}
                        disabled={!currentDepartment || (!assignToAnyRoom && !currentRoom && availableRooms.length > 0)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Queue
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Single Department Mode */}
            {!multipleMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={currentDepartment}
                    onValueChange={(value) => {
                      setCurrentDepartment(value)
                      setCurrentRoom("")
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

                {currentDepartment && (
                  <div className="space-y-4">
                    <RadioGroup
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
                          value={currentRoom}
                          onValueChange={setCurrentRoom}
                          disabled={availableRooms.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={availableRooms.length === 0 ? "No rooms created today" : "Select room"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRooms.map((room) => (
                              <SelectItem key={room._id} value={room._id}>
                                Room {room.roomNumber} - {room.staff.firstName} {room.staff.lastName}{" "}
                                {room.available ? "(Available)" : "(Unavailable)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {availableRooms.length === 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            No rooms were created today in this department. Please select another department or choose
                            "Assign to any available room".
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-3">
            {/* And Back Toggle - Left side */}
            {(currentDepartmentId || currentRoomId) && (
              <div className="flex items-center space-x-2">
                <Switch id="and-back-switch" checked={andBack} onCheckedChange={setAndBack} />
                <Label htmlFor="and-back-switch" className="text-sm font-medium">
                  And Back
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      When enabled, the ticket will return to this department and room after visiting the selected
                      department(s). This allows the ticket to come back to you after processing elsewhere.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Action Buttons - Right side */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  multipleMode
                    ? selectedDepartments.length === 0
                    : !currentDepartment || (!assignToAnyRoom && !currentRoom && availableRooms.length > 0)
                }
              >
                {multipleMode
                  ? `Assign to ${selectedDepartments.length} Department${selectedDepartments.length !== 1 ? "s" : ""}`
                  : "Assign"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
