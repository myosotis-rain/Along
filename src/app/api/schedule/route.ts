import { NextRequest, NextResponse } from "next/server";
import type { ScheduleItem } from "@/types/app";

export const runtime = 'edge';

// In-memory storage for demo (replace with real database)
let scheduleStore: ScheduleItem[] = [];

export async function GET() {
  return NextResponse.json(scheduleStore);
}

export async function POST(req: NextRequest) {
  try {
    const scheduleItem: ScheduleItem = await req.json();
    
    // Validate required fields
    if (!scheduleItem.id || !scheduleItem.title || !scheduleItem.start || !scheduleItem.end) {
      return NextResponse.json(
        { error: "Missing required fields" }, 
        { status: 400 }
      );
    }

    scheduleStore.push(scheduleItem);
    return NextResponse.json({ success: true, item: scheduleItem });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request data" }, 
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "ID is required" }, 
        { status: 400 }
      );
    }

    const initialLength = scheduleStore.length;
    scheduleStore = scheduleStore.filter(item => item.id !== id);
    
    if (scheduleStore.length === initialLength) {
      return NextResponse.json(
        { error: "Item not found" }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request data" }, 
      { status: 400 }
    );
  }
}