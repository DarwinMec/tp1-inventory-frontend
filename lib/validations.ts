import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3, "Ingresa tu usuario"),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
});

export type LoginSchema = z.infer<typeof loginSchema>;
