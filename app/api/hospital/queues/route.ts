import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { TreeNode } from "@/lib/models/hospital";

export async function GET() {
  await dbConnect();
  const nodes = await TreeNode.find({}).sort("order");
  return NextResponse.json(nodes);
}

export async function POST(request: Request) {
  const { name, type, parentId } = await request.json();
  await dbConnect();
  const maxOrderNode = await TreeNode.findOne({ parentId }).sort("-order");
  const order = maxOrderNode ? maxOrderNode.order + 1 : 0;
  const node = await TreeNode.create({ name, type, parentId, order });
  return NextResponse.json(node);
}

export async function PUT(request: Request) {
  const { id, updates } = await request.json();
  await dbConnect();
  const node = await TreeNode.findByIdAndUpdate(id, updates, { new: true });
  return NextResponse.json(node);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  await dbConnect();
  await TreeNode.deleteMany({ $or: [{ _id: id }, { parentId: id }] });
  return NextResponse.json({ success: true });
}
