"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";

type Ticket = {
  _id: string;
  ticketNo: string;
  currentNodeId: string | null;
  journey: Array<{
    nodeId: string;
    status: "Pending" | "In Progress" | "Completed" | "Skipped";
    startTime?: Date;
    endTime?: Date;
  }>;
  issueDescription: string;
};

type TreeNode = {
  _id: string;
  name: string;
  type: "default" | "primary" | "secondary" | "warning" | "success";
  parentId: string | null;
  order: number;
  children?: TreeNode[];
};

function organizeNodesHierarchy(nodes: TreeNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // First pass: create a map of all nodes
  nodes.forEach((node) => {
    nodeMap.set(node._id, { ...node, children: [] });
  });

  // Second pass: organize nodes into hierarchy
  nodes.forEach((node) => {
    const currentNode = nodeMap.get(node._id)!;
    if (node.parentId) {
      const parentNode = nodeMap.get(node.parentId);
      if (parentNode) {
        parentNode.children!.push(currentNode);
      }
    } else {
      rootNodes.push(currentNode);
    }
  });

  // Sort children by order
  const sortChildren = (node: TreeNode) => {
    if (node.children) {
      node.children.sort((a, b) => a.order - b.order);
      node.children.forEach(sortChildren);
    }
  };
  rootNodes.forEach(sortChildren);

  return rootNodes;
}

const RecursiveSelectOptions = ({
  nodes,
  depth = 0,
}: {
  nodes: TreeNode[];
  depth?: number;
}) => {
  return (
    <>
      {nodes.map((node) => (
        <React.Fragment key={node._id}>
          <SelectItem value={node._id} className={`pl-${depth * 4}`}>
            {"\u00A0".repeat(depth * 2)}
            {node.name}
          </SelectItem>
          {node.children && node.children.length > 0 && (
            <RecursiveSelectOptions nodes={node.children} depth={depth + 1} />
          )}
        </React.Fragment>
      ))}
    </>
  );
};

export default function ServingPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);

  useEffect(() => {
    fetchTickets();
    fetchTreeNodes();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/hospital/ticket");
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  };

  const fetchTreeNodes = async () => {
    try {
      const response = await fetch("/api/hospital/queues");
      if (!response.ok) throw new Error("Failed to fetch tree nodes");
      const data = await response.json();
      const organizedNodes = organizeNodesHierarchy(data);
      setTreeNodes(organizedNodes);
    } catch (error) {
      console.error("Error fetching tree nodes:", error);
    }
  };

  const updateTicketJourney = async (ticketId: string, nodeId: string) => {
    try {
      const response = await fetch(`/api/hospital/ticket/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentNodeId: nodeId }),
      });
      if (!response.ok) throw new Error("Failed to update ticket");
      await fetchTickets(); // Refresh tickets after update
    } catch (error) {
      console.error("Error updating ticket:", error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Serving Page</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket._id}>
            <CardHeader>
              <CardTitle>Ticket: {ticket.ticketNo}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">
                Issue: {ticket.issueDescription || "Not specified"}
              </p>
              <p className="mb-2">
                Current Node:{" "}
                {ticket.currentNodeId
                  ? treeNodes.find((node) => node._id === ticket.currentNodeId)
                      ?.name || "Unknown"
                  : "Not assigned"}
              </p>
              <Select
                onValueChange={(value) =>
                  updateTicketJourney(ticket._id, value)
                }
                value={ticket.currentNodeId || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select journey" />
                </SelectTrigger>
                <SelectContent>
                  <RecursiveSelectOptions nodes={treeNodes} />
                </SelectContent>
              </Select>
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Journey:</h4>
                {ticket.journey.map((step, index) => (
                  <div key={index} className="text-sm">
                    {treeNodes.find((node) => node._id === step.nodeId)?.name ||
                      "Unknown"}
                    : {step.status}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
