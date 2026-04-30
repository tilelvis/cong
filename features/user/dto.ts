import { z } from "zod";

export const UserDTO = z.object({
  id: z.string(),
  alienId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserDTO = z.infer<typeof UserDTO>;
