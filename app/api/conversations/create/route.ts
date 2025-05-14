import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';

// In-memory storage - for a real app, this would be a database
// For demo purposes, we're using a simple JSON file
const CONVERSATIONS_PATH = path.join(process.cwd(), 'data', 'conversations.json');

// Ensure storage directory exists
const ensureStorageExists = () => {
  const dir = path.dirname(CONVERSATIONS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(CONVERSATIONS_PATH)) {
    fs.writeFileSync(CONVERSATIONS_PATH, JSON.stringify({ conversations: [] }));
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, messages } = body;
    
    if (!title || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid request. Title and messages array required.' 
      }, { status: 400 });
    }
    
    // Create conversation record
    const conversation = {
      id: nanoid(),
      title,
      date: new Date().toISOString(),
      messages
    };
    
    // Save to storage
    ensureStorageExists();
    
    const storage = JSON.parse(fs.readFileSync(CONVERSATIONS_PATH, 'utf8'));
    storage.conversations.push(conversation);
    fs.writeFileSync(CONVERSATIONS_PATH, JSON.stringify(storage, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Conversation created successfully',
      conversation
    });
    
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Failed to create conversation: ${error.message}` 
    }, { status: 500 });
  }
}
