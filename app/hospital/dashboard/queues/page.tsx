"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, X, ArrowRight, User, Save, Trash2 } from "lucide-react";
import departments, { Department } from "@/lib/models/departments";

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
      } catch (err) {
        setError("Failed to save journey. Please try again.");
      }
    }
  };

  const loadJourney = (journey: Journey) => {
    setSteps([...journey.steps]);
    setSelectedJourney(journey._id);
    setJourneyName(journey.name);
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
      }
    } catch (err) {
      setError("Failed to delete journey. Please try again.");
    }
  };

  const startNewJourney = () => {
    setSteps([]);
    setSelectedJourney(null);
    setJourneyName("");
  };

  if (isLoading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Patient Journey Management
        </h2>

        {/* Save Journey Section */}
        <div className="mb-6 flex gap-4 items-center">
          <input
            type="text"
            value={journeyName}
            onChange={(e) => setJourneyName(e.target.value)}
            placeholder="Enter journey name"
            className="p-2 border rounded flex-grow"
          />
          <button
            onClick={saveJourney}
            disabled={!journeyName.trim() || steps.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            Save Journey
          </button>
          <button
            onClick={startNewJourney}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusCircle size={20} />
            New Journey
          </button>
        </div>

        {/* Saved Journeys List */}
        {savedJourneys.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Saved Journeys:</h3>
            <div className="flex flex-wrap gap-2">
              {savedJourneys.map((journey) => (
                <div key={journey._id} className="flex items-center">
                  <button
                    onClick={() => loadJourney(journey)}
                    className={`px-3 py-1 rounded-l-full text-sm ${
                      selectedJourney === journey._id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {journey.name}
                  </button>
                  <button
                    onClick={() => deleteJourney(journey._id)}
                    className="bg-red-500 text-white p-1 rounded-r-full hover:bg-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Journey Display */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="bg-blue-50 rounded-lg p-4 relative group min-w-[150px]">
                <button
                  onClick={() => removeStep(step.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
                <div className="text-center">
                  <div className="text-3xl mb-2">{step.icon}</div>
                  <div className="font-medium text-gray-700">{step.title}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="mx-2 text-gray-400" />
              )}
            </div>
          ))}

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <PlusCircle size={20} />
              Add Step
            </button>
          )}
        </div>

        {/* Department Selection */}
        {isAdding && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <User size={20} />
              <span className="font-medium">Select Department:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <button
                  key={dept.title}
                  onClick={() => addStep(dept)}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <span className="text-xl">{dept.icon}</span>
                  <span>{dept.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalJourney;
