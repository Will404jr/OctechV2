"use client";

import React, { useState, useEffect } from "react";
import {
  PlusCircle,
  X,
  ArrowRight,
  User,
  Save,
  Trash2,
  Loader2,
  Edit,
} from "lucide-react";
import departments, { Department } from "@/lib/models/departments";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { QueueSpinner } from "@/components/queue-spinner";

interface Step {
  id: number;
  title: string;
  icon: string;
}

interface Journey {
  _id: string;
  name: string;
  steps: Step[];
}

const HospitalJourney: React.FC = () => {
  const [steps, setSteps] = useState<Step[]>([]);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [journeyName, setJourneyName] = useState<string>("");
  const [savedJourneys, setSavedJourneys] = useState<Journey[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isPreview, setIsPreview] = useState<boolean>(false);

  useEffect(() => {
    fetchJourneys();
  }, []);

  const fetchJourneys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/hospital/journey");
      if (!response.ok) throw new Error("Failed to fetch journeys");
      const data = await response.json();
      setSavedJourneys(data);
    } catch (err) {
      setError("Failed to load journeys. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const addStep = (department: Department) => {
    setSteps([
      ...steps,
      {
        id: steps.length + 1,
        title: department.title,
        icon: department.icon,
      },
    ]);
    setIsAdding(false);
  };

  const removeStep = (id: number) => {
    setSteps(steps.filter((step) => step.id !== id));
  };

  const saveJourney = async () => {
    if (journeyName.trim() && steps.length > 0) {
      try {
        const response = await fetch("/api/hospital/journey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: journeyName, steps }),
        });
        if (!response.ok) throw new Error("Failed to save journey");
        await fetchJourneys();
        setJourneyName("");
        setSteps([]);
        setSelectedJourney(null);
        setIsEditing(false);
        setIsPreview(false);
      } catch (err) {
        setError("Failed to save journey. Please try again.");
      }
    }
  };

  const updateJourney = async () => {
    if (selectedJourney && journeyName.trim() && steps.length > 0) {
      try {
        const response = await fetch(
          `/api/hospital/journey/${selectedJourney}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: journeyName, steps }),
          }
        );
        if (!response.ok) throw new Error("Failed to update journey");
        await fetchJourneys();
        setIsEditing(false);
        setIsPreview(true);
      } catch (err) {
        setError("Failed to update journey. Please try again.");
      }
    }
  };

  const loadJourney = (journey: Journey) => {
    setSteps([...journey.steps]);
    setSelectedJourney(journey._id);
    setJourneyName(journey.name);
    setIsEditing(false);
    setIsPreview(true);
    setIsAdding(false);
  };

  const deleteJourney = async (id: string) => {
    try {
      const response = await fetch(`/api/hospital/journey/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete journey");
      await fetchJourneys();
      if (selectedJourney === id) {
        setSteps([]);
        setSelectedJourney(null);
        setJourneyName("");
        setIsEditing(false);
        setIsPreview(false);
      }
    } catch (err) {
      setError("Failed to delete journey. Please try again.");
    }
  };

  const startNewJourney = () => {
    setSteps([]);
    setSelectedJourney(null);
    setJourneyName("");
    setIsAdding(false);
    setIsEditing(false);
    setIsPreview(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <QueueSpinner size="lg" color="bg-[#0e4480]" dotCount={12} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission="Queues">
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Journey Management
          </h1>
          <p className="text-muted-foreground">
            Create and manage patient journey templates
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Saved Journeys Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Saved Journeys</CardTitle>
              <CardDescription>
                {savedJourneys.length} template
                {savedJourneys.length !== 1 ? "s" : ""} available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  onClick={startNewJourney}
                  className="w-full mb-4"
                  variant="outline"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Journey
                </Button>

                <div className="space-y-2">
                  {savedJourneys.map((journey) => (
                    <div
                      key={journey._id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        selectedJourney === journey._id
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-secondary/50"
                      }`}
                    >
                      <button
                        onClick={() => loadJourney(journey)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium">{journey.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {journey.steps.length} step
                          {journey.steps.length !== 1 ? "s" : ""}
                        </div>
                      </button>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadJourney(journey);
                            setIsEditing(true);
                            setIsPreview(false);
                          }}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteJourney(journey._id);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Journey Editor Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Journey Editor</CardTitle>
              <CardDescription>
                {isPreview
                  ? "Journey preview"
                  : isEditing
                  ? "Edit existing journey"
                  : "Build your journey by adding steps"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Journey Name Input and Buttons */}
              <div className="flex gap-4">
                <Input
                  value={journeyName}
                  onChange={(e) => setJourneyName(e.target.value)}
                  placeholder="Enter journey name"
                  className="flex-1"
                  disabled={isPreview}
                />
                {isEditing ? (
                  <Button
                    onClick={updateJourney}
                    disabled={!journeyName.trim() || steps.length === 0}
                    className="bg-[#0e4480]"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Update Journey
                  </Button>
                ) : (
                  !isPreview && (
                    <Button
                      onClick={saveJourney}
                      disabled={!journeyName.trim() || steps.length === 0}
                      className="bg-[#0e4480]"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Journey
                    </Button>
                  )
                )}
              </div>

              {/* Steps Display */}
              <Card>
                <CardContent className="pt-6">
                  {steps.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-4">
                      {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                          <div className="relative group">
                            <div className="bg-secondary/50 rounded-lg p-4 text-center min-w-[120px]">
                              <div className="text-3xl mb-2">{step.icon}</div>
                              <div className="font-medium">{step.title}</div>
                            </div>
                            {!isPreview && (
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeStep(step.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {index < steps.length - 1 && (
                            <ArrowRight className="mx-2 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No steps added yet. Click "Add Step" to begin building
                      your journey.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Step Button & Department Selection */}
              {!isPreview && (
                <div>
                  {!isAdding ? (
                    <Button
                      variant="outline"
                      onClick={() => setIsAdding(true)}
                      className="w-full"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Step
                    </Button>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Select Department
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          {departments.map((dept) => (
                            <Button
                              key={dept.title}
                              variant="outline"
                              onClick={() => addStep(dept)}
                              className="justify-start "
                            >
                              <span className="text-xl mr-2">{dept.icon}</span>
                              <span>{dept.title}</span>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default HospitalJourney;
