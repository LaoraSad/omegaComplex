// TODO(auth): implementar auth.types.ts
export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: {
    id: string;
    name: "user" | "admin" | "employee";
  };
};
