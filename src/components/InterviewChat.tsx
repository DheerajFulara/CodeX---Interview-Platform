import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { SendIcon, XIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";

type InterviewChatProps = {
  roomId: string;
  onClose: () => void;
};

function InterviewChat({ roomId, onClose }: InterviewChatProps) {
  const { user } = useUser();
  const [text, setText] = useState("");
  const sendingRef = useRef(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const messages = useQuery(api.chatMessages.getMessagesByRoomId, roomId ? { roomId } : "skip") ?? [];
  const sendMessage = useMutation(api.chatMessages.sendMessage);
  const markMessagesAsSeen = useMutation(api.chatMessages.markMessagesAsSeen);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a._creationTime - b._creationTime),
    [messages]
  );

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [sortedMessages.length]);

  useEffect(() => {
    if (!roomId) return;

    markMessagesAsSeen({ roomId }).catch((error) => {
      console.error("Failed to mark messages as seen:", error);
    });
  }, [roomId, sortedMessages.length, markMessagesAsSeen]);

  const sendCurrentMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !roomId || sendingRef.current) return;

    sendingRef.current = true;
    try {
      await sendMessage({ roomId, text: trimmed });
      setText("");
    } catch (error) {
      console.error("Failed to send chat message:", error);
    } finally {
      sendingRef.current = false;
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await sendCurrentMessage();
  };

  return (
    <div className="absolute right-3 top-3 bottom-24 z-30 w-[min(92vw,360px)] rounded-xl border border-border/70 bg-background shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/70 bg-muted/40">
        <h3 className="text-sm font-semibold">Interview Chat</h3>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-3">
          {sortedMessages.length === 0 && (
            <div className="rounded-md border border-dashed p-3">
              <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
            </div>
          )}

          {sortedMessages.map((message) => {
            const isMine = message.senderId === user?.id;
            const initials = message.senderName
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={message._id}
                className={`flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}
              >
                {!isMine && (
                  <Avatar className="size-7 mt-1">
                    <AvatarImage src={message.senderImage} alt={message.senderName} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                )}

                <div className={`max-w-[220px] rounded-xl px-3 py-2 ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p className="text-xs opacity-80 mb-1">{isMine ? "You" : message.senderName}</p>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                </div>
              </div>
            );
          })}
          <div ref={messageEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border/70 bg-background space-y-2">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a message..."
          className="min-h-[84px] resize-none"
          maxLength={1000}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendCurrentMessage();
            }
          }}
        />
        <Button type="submit" className="w-full" disabled={!text.trim()}>
          <SendIcon className="size-4 mr-2" />
          Send
        </Button>
      </form>
    </div>
  );
}

export default InterviewChat;
