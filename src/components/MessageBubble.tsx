"use client";

import { formatMessageTime } from "@/lib/format";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  chatMemberCount: number;
}

function ReadReceipt({
  message,
  isOwn,
  chatMemberCount,
}: {
  message: Message;
  isOwn: boolean;
  chatMemberCount: number;
}) {
  if (!isOwn) return null;

  const readCount = message.readBy.length;
  const allRead = readCount >= chatMemberCount;

  return (
    <span
      className={`label-xs ml-1 ${allRead ? "opacity-100" : "opacity-45"}`}
      title={allRead ? "Read by all" : "Delivered"}
    >
      {allRead ? "✓✓" : "✓"}
    </span>
  );
}

function deliveryLabel(message: Message): string | null {
  const status = message.sideEffectsStatus;
  if (!status) return "Sending";
  if (status === "applied") return null;
  if (status === "rate_limited") return "Rate limited";
  if (status === "rejected") return "Not delivered";
  if (status === "error") return "Failed";
  return "Sending";
}

export default function MessageBubble({
  message,
  isOwn,
  chatMemberCount,
}: MessageBubbleProps) {
  const delivery = isOwn ? deliveryLabel(message) : null;
  const isPending = isOwn && message.sideEffectsStatus !== "applied";
  const isFailed =
    isOwn &&
    (message.sideEffectsStatus === "rejected" ||
      message.sideEffectsStatus === "rate_limited" ||
      message.sideEffectsStatus === "error");

  return (
    <div className={`mb-3 flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`message-bubble ${
          isOwn ? "message-bubble--own" : "message-bubble--other"
        } ${isPending && !isFailed ? "message-bubble--pending" : ""} ${
          isFailed ? "message-bubble--failed" : ""
        }`}
      >
        {!isOwn && (
          <p className="label-xs mb-2 opacity-70">{message.senderName}</p>
        )}

        {message.type === "image" && message.imageUrl && (
          <a href={message.imageUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.imageUrl}
              alt="Shared image"
              className="mb-2 block"
            />
          </a>
        )}

        {message.text && (
          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
            {message.text}
          </p>
        )}

        <div className="mt-2 flex items-center justify-end gap-1">
          {delivery && (
            <span
              className={`label-xs ${
                isFailed ? "opacity-90" : "opacity-55"
              }`}
            >
              {delivery}
            </span>
          )}
          <time
            dateTime={
              message.createdAt?.toDate?.()?.toISOString() ?? undefined
            }
            className={`label-xs ${isOwn ? "opacity-55" : "opacity-45"}`}
          >
            {formatMessageTime(message.createdAt)}
          </time>
          <ReadReceipt
            message={message}
            isOwn={isOwn}
            chatMemberCount={chatMemberCount}
          />
        </div>
      </div>
    </div>
  );
}
