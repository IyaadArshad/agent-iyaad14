import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
  }

  try {
    const pb = new PocketBase('https://brs-agent-pb.acroford.com');
    const record = await pb.collection('images').getOne(id, {
      fields: 'id,image',
    });
    
    if (!record) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const imageUrl = `https://brs-agent-pb.acroford.com/api/files/${record.collectionId}/${record.id}/${record.image}`;

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
