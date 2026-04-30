"use client";

import { useAlien } from "@alien_org/react";
import { useQuery } from "@tanstack/react-query";
import { UserDTO } from "../dto";

async function fetchCurrentUser(authToken: string): Promise<UserDTO> {
  const res = await fetch("/api/me", {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error ?? "Request failed");
  }

  return UserDTO.parse(await res.json());
}

export function useCurrentUser() {
  const { authToken } = useAlien();

  const { data: user, isLoading: loading, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => fetchCurrentUser(authToken!),
    enabled: !!authToken,
  });

  return {
    user: user ?? null,
    loading,
    error: error?.message ?? null,
    isAuthenticated: !!authToken,
  };
}
