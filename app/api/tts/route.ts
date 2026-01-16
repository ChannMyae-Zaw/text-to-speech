import { OpenAI } from "openai";
import { NextResponse } from "next/server";

// This initializes the OpenAI connection using your secret key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // 1. Extract 'input' (matching the key your frontend sends in 'formData')
    const { input, voice, instructions, speed, format } = await req.json();

    // 2. Safety check: If for some reason 'input' is missing
    if (!input) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const startTime = Date.now();

    // 3. Call OpenAI with the correct field names
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice,
      input: input, // This now matches the variable extracted above
      speed: parseFloat(speed),
      response_format: format,
      // @ts-ignore - instructions is a special GPT-4o-mini-tts feature
      instructions: instructions,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    const buffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": `audio/${format}`,
        "X-Response-Time": duration.toString(),
      },
    });
  } catch (error: any) {
    console.error("OPENAI ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}