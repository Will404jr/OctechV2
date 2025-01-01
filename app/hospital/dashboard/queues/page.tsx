"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type NodeType = "default" | "primary" | "secondary" | "warning" | "success";

type TreeNode = {
  _id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  order: number;
};

const nodeTypeColors: Record<NodeType, string> = {
  default: "bg-background",
  primary: "bg-primary/10",
  secondary: "bg-secondary/10",
  warning: "bg-orange-100",
  success: "bg-green-100",
};

interface TreeNodeProps {
  node: TreeNode;
  onAdd: (parentId: string, name: string, type: NodeType) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TreeNode>) => void;
  allNodes: TreeNode[];
}

const TreeNodeComponent = ({
  node,
  onAdd,
  onDelete,
  onUpdate,
  allNodes,
}: TreeNodeProps) => {
  const [showInput, setShowInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeType, setNewNodeType] = useState<NodeType>("default");
  const [editName, setEditName] = useState(node.name);

  const handleAdd = () => {
    if (newNodeName.trim()) {
      onAdd(node._id, newNodeName.trim(), newNodeType);
      setNewNodeName("");
      setNewNodeType("default");
      setShowInput(false);
    }
  };

  const handleEdit = () => {
    if (editName.trim()) {
      onUpdate(node._id, { name: editName.trim() });
      setIsEditing(false);
    }
  };

  const childNodes = allNodes.filter((n) => n.parentId === node._id);

  return (
    <div className="relative">
      <Card
        className={`p-4 mb-2 ${
          nodeTypeColors[node.type]
        } transition-colors duration-200`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="max-w-xs"
                />
                <Button size="icon" variant="ghost" onClick={handleEdit}>
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <span className="font-medium">{node.name}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Select
              value={node.type}
              onValueChange={(value: NodeType) =>
                onUpdate(node._id, { type: value })
              }
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowInput(!showInput)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(node._id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {showInput && (
          <div className="mt-4 flex gap-2">
            <Input
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              placeholder="Enter node name"
              className="max-w-xs"
            />
            <Select
              value={newNodeType}
              onValueChange={(value: NodeType) => setNewNodeType(value)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd}>Add</Button>
          </div>
        )}
      </Card>

      {childNodes.length > 0 && (
        <div className="ml-8 pl-4 border-l border-border">
          {childNodes.map((child) => (
            <TreeNodeComponent
              key={child._id}
              node={child}
              onAdd={onAdd}
              onDelete={onDelete}
              onUpdate={onUpdate}
              allNodes={allNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DynamicTree = () => {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [newRootName, setNewRootName] = useState("");
  const [newRootType, setNewRootType] = useState<NodeType>("default");

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    const response = await fetch("/api/hospital/queues");
    const data = await response.json();
    setNodes(data);
  };

  const addNode = async (
    parentId: string | null,
    name: string,
    type: NodeType
  ) => {
    const response = await fetch("/api/hospital/queues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, parentId }),
    });
    const newNode = await response.json();
    setNodes([...nodes, newNode]);
  };

  const deleteNode = async (id: string) => {
    await fetch("/api/hospital/queues", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNodes(nodes.filter((node) => node._id !== id && node.parentId !== id));
  };

  const updateNode = async (id: string, updates: Partial<TreeNode>) => {
    const response = await fetch("/api/hospital/queues", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates }),
    });
    const updatedNode = await response.json();
    setNodes(nodes.map((node) => (node._id === id ? updatedNode : node)));
  };

  const rootNodes = nodes.filter((node) => node.parentId === null);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Dynamic Tree Layout</h1>

      <div className="flex gap-4 mb-8">
        <Input
          value={newRootName}
          onChange={(e) => setNewRootName(e.target.value)}
          placeholder="Enter root node name"
          className="max-w-xs"
        />
        <Select
          value={newRootType}
          onValueChange={(value: string) => setNewRootType(value as NodeType)}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="success">Success</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            if (newRootName.trim()) {
              addNode(null, newRootName.trim(), newRootType);
              setNewRootName("");
              setNewRootType("default");
            }
          }}
        >
          Add Root Node
        </Button>
      </div>

      {rootNodes.length > 0 ? (
        rootNodes.map((rootNode) => (
          <TreeNodeComponent
            key={rootNode._id}
            node={rootNode}
            onAdd={addNode}
            onDelete={deleteNode}
            onUpdate={updateNode}
            allNodes={nodes}
          />
        ))
      ) : (
        <Alert>
          <AlertDescription>
            Start by adding a root node to create your tree structure.
          </AlertDescription>
        </Alert>
      )}

      {rootNodes.length > 0 && (
        <div className="mt-12 p-8 bg-muted/20 rounded-lg">
          <h2 className="text-2xl font-semibold mb-6">Tree Visualization</h2>
          <div className="flex flex-col items-center">
            {rootNodes.map((rootNode) => (
              <TreeVisualization
                key={rootNode._id}
                node={rootNode}
                allNodes={nodes}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TreeVisualization = ({
  node,
  allNodes,
}: {
  node: TreeNode;
  allNodes: TreeNode[];
}) => {
  const childNodes = allNodes.filter((n) => n.parentId === node._id);

  return (
    <div className="relative">
      <div
        className={cn(
          "flex flex-col items-center p-4 rounded-xl shadow-lg min-w-[180px]",
          nodeTypeColors[node.type],
          "border-2 border-primary/20 relative z-10"
        )}
      >
        <span className="font-medium text-lg">{node.name}</span>
        {node.type !== "default" && (
          <span className="text-xs text-muted-foreground mt-1 capitalize">
            {node.type}
          </span>
        )}
      </div>

      {childNodes.length > 0 && (
        <div className="mt-8 pt-4 flex gap-8 items-start relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-primary/30" />
          <div className="absolute top-8 left-0 right-0 h-px bg-primary/30" />

          {childNodes.map((child) => (
            <div key={child._id} className="relative flex-1">
              <TreeVisualization node={child} allNodes={allNodes} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DynamicTree;
