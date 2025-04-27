import { NextResponse } from 'next/server'
import PocketBase from 'pocketbase'

export async function POST(request: Request) {
  try {
    const pb = new PocketBase('https://brs-agent-pb.acroford.com')
    const formData = await request.formData()
    
    const record = await pb.collection('images').create(formData)
    
    return NextResponse.json({
      url: `https://brs-agent-pb.acroford.com/api/files/${record.collectionId}/${record.id}/${record.image}`,
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
