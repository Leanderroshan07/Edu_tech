export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  phoneNum: string | null;
  department: string | null;
  role: string;
};
