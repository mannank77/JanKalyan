import { useMutation } from "@tanstack/react-query";
import { postChat, postEligibility, type ChatRequest, type ChatResponse } from "@/lib/api";

/**
 * React-Query mutation for POST /chat.
 * Usage:
 *   const chat = useChat();
 *   chat.mutate({ query: "...", scheme_id: "PM-KUSUM" });
 */
export function useChat() {
  return useMutation<ChatResponse, Error, ChatRequest>({
    mutationFn: postChat,
  });
}

/**
 * React-Query mutation for POST /eligibility.
 */
export function useEligibility() {
  return useMutation<ChatResponse, Error, ChatRequest>({
    mutationFn: postEligibility,
  });
}
