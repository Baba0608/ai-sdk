import { openai } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { prisma } from "@/lib/prisma";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // For now, we'll create a new conversation for each chat session
  // In a real app, you'd get this from the request or session
  const conversation = await prisma.conversation.create({
    data: {},
  });
  const conversationId = conversation.id;

  // Save user message to database
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.role === "user") {
    if (conversationId) {
      await prisma.message.create({
        data: {
          role: "USER",
          content:
            lastMessage.parts[0]?.type === "text"
              ? lastMessage.parts[0].text
              : "",
          conversationId: conversationId,
        },
      });
    }
  }

  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    onFinish: async (result) => {
      // Save assistant response to database
      if (conversationId) {
        await prisma.message.create({
          data: {
            role: "ASSISTANT",
            content: result.text,
            conversationId: conversationId,
          },
        });

        // Update conversation title if it's the first message
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { messages: true },
        });

        if (
          conversation &&
          conversation.messages.length === 2 &&
          !conversation.title
        ) {
          const firstUserMessage = conversation.messages.find(
            (m: any) => m.role === "USER"
          );
          if (firstUserMessage) {
            const title =
              firstUserMessage.content.slice(0, 50) +
              (firstUserMessage.content.length > 50 ? "..." : "");
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { title },
            });
          }
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
