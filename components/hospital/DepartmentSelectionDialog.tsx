"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  }[]
}

interface DepartmentSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (departments: Array<{ departmentId: string; roomId?: string }>, andBack?: boolean) => void
  departments: Department[]
  currentDepartment?: string
  currentRoomId?: string
  currentDepartmentId?: string
}

export const DepartmentSelectionDialog: React.FC<DepartmentSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  departments,
  currentDepartment,
  currentRoomId,
  currentDepartmentId,
}) => {
  console.log("DepartmentSelectionDialog props:", { currentDepartmentId, currentRoomId, isOpen })
  const [selectedDepartments, setSelectedDepartments] = useState<Record<string, boolean>>({})
  const [selectedRooms, setSelectedRooms] = useState<Record<string, string>>({})
  const [andBack, setAndBack] = useState(false)
  const [todaysRooms, setTodaysRooms] = useState<Record<string, any[]>>({})
  const [loadingRooms, setLoadingRooms] = useState<Record<string, boolean>>({})
  const [departmentOrder, setDepartmentOrder] = useState<string[]>([])

  const fetchTodaysRooms = async (departmentId: string) => {
    if (todaysRooms[departmentId] || loadingRooms[departmentId]) {
      return // Already loaded or loading
    }

    setLoadingRooms((prev) => ({ ...prev, [departmentId]: true }))

    try {
      const today = new Date().toISOString().split("T")[0]
      const response = await fetch(`/api/hospital/department/${departmentId}/rooms?date=${today}`)

      if (response.ok) {
        const data = await response.json()
        setTodaysRooms((prev) => ({ ...prev, [departmentId]: data.rooms || [] }))
      } else {
        console.error("Failed to fetch today's rooms")
        setTodaysRooms((prev) => ({ ...prev, [departmentId]: [] }))
      }
    } catch (error) {
      console.error("Error fetching today's rooms:", error)
      setTodaysRooms((prev) => ({ ...prev, [departmentId]: [] }))
    } finally {
      setLoadingRooms((prev) => ({ ...prev, [departmentId]: false }))
    }
  }

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDepartments({})
      setSelectedRooms({})
      setAndBack(false)
      setTodaysRooms({})
      setLoadingRooms({})
      setDepartmentOrder([]) // Add this line
    }
  }, [isOpen])

  const handleDepartmentToggle = (departmentId: string, checked: boolean) => {
    setSelectedDepartments((prev) => ({
      ...prev,
      [departmentId]: checked,
    }))

    // Update order tracking
    if (checked) {
      setDepartmentOrder((prev) => [...prev, departmentId])
      // Fetch today's rooms when department is selected
      fetchTodaysRooms(departmentId)
    } else {
      setDepartmentOrder((prev) => prev.filter((id) => id !== departmentId))
      // Clear room selection if department is unchecked
      setSelectedRooms((prev) => {
        const newRooms = { ...prev }
        delete newRooms[departmentId]
        return newRooms
      })
    }
  }

  const handleRoomSelection = (departmentId: string, roomId: string) => {
    setSelectedRooms((prev) => ({
      ...prev,
      [departmentId]: roomId,
    }))
  }

  const handleSubmit = () => {
    if (departmentOrder.length === 0) {
      return
    }

    let departmentSelections = departmentOrder.map((departmentId) => ({
      departmentId,
      roomId: selectedRooms[departmentId],
    }))

    if (andBack && currentDepartment && currentDepartmentId && currentRoomId) {
      // Add the current department and room to the end of the queue
      departmentSelections = [
        ...departmentSelections,
        {
          departmentId: currentDepartmentId,
          roomId: currentRoomId,
        },
      ]
    }

    onSubmit(departmentSelections, andBack)
    onClose()
  }

  const selectedCount = departmentOrder.length

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Next Department(s)</DialogTitle>
            <DialogDescription>
              Choose which department(s) this ticket should be sent to next. You can select multiple departments to
              create a queue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedCount > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-800 mb-2">
                  Selected {selectedCount} department{selectedCount > 1 ? "s" : ""}
                  {andBack && currentDepartment && (
                    <span className="ml-2">
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        + Return to {currentDepartment}
                      </Badge>
                    </span>
                  )}
                </div>
                {departmentOrder.length > 1 && (
                  <div className="mt-2">
                    <p className="text-xs text-blue-600 font-medium mb-1">Processing Order:</p>
                    <div className="flex flex-wrap gap-1">
                      {departmentOrder.map((deptId, index) => {
                        const dept = departments.find((d) => d._id === deptId)
                        return (
                          <Badge
                            key={deptId}
                            className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1"
                          >
                            <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                              {index + 1}
                            </span>
                            {dept?.icon} {dept?.title}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4">
              {departments.map((department) => (
                <div key={department._id} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="relative">
                      <Checkbox
                        id={department._id}
                        checked={selectedDepartments[department._id] || false}
                        onCheckedChange={(checked) => handleDepartmentToggle(department._id, checked as boolean)}
                      />
                      {selectedDepartments[department._id] && departmentOrder.length > 1 && (
                        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                          {departmentOrder.indexOf(department._id) + 1}
                        </div>
                      )}
                    </div>
                    <label htmlFor={department._id} className="flex items-center gap-2 font-medium cursor-pointer">
                      <span className="text-lg">{department.icon}</span>
                      {department.title}
                    </label>
                  </div>

                  {selectedDepartments[department._id] && (
                    <div className="ml-6 space-y-2">
                      <p className="text-sm text-slate-600">Select a room (optional):</p>
                      <Select
                        value={selectedRooms[department._id] || "any"}
                        onValueChange={(value) => handleRoomSelection(department._id, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Any available room" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any available room</SelectItem>
                          {loadingRooms[department._id] ? (
                            <SelectItem value="loading" disabled>
                              Loading today's rooms...
                            </SelectItem>
                          ) : (
                            (todaysRooms[department._id] || []).map((room) => (
                              <SelectItem key={room._id} value={room._id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>Room {room.roomNumber}</span>
                                  <span className="text-sm text-slate-500 ml-2">
                                    {room.staff.firstName} {room.staff.lastName}
                                  </span>
                                  <Badge
                                    variant={room.available ? "default" : "secondary"}
                                    className={`ml-2 text-xs ${
                                      room.available
                                        ? "bg-green-100 text-green-800 border-green-200"
                                        : "bg-red-100 text-red-800 border-red-200"
                                    }`}
                                  >
                                    {room.available ? "Available" : "Occupied"}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))
                          )}
                          {!loadingRooms[department._id] && (todaysRooms[department._id] || []).length === 0 && (
                            <SelectItem value="no-rooms" disabled>
                              No rooms created today
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {true && (
                <>
                  <Switch id="and-back" checked={andBack} onCheckedChange={setAndBack} disabled={!currentDepartment} />
                  <label htmlFor="and-back" className="text-sm font-medium cursor-pointer">
                    And Back
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Add the current department ({currentDepartment}) and room to the end of the queue so the ticket
                        returns here after visiting the selected departments.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={selectedCount === 0}
                className="bg-[#0e4480] hover:bg-blue-800 text-white"
              >
                Assign to {selectedCount} Department{selectedCount > 1 ? "s" : ""}
                {andBack && " + Return"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
