export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  document: string;
  phone: string;
  birthDate: string;
  email: string;
  password: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}
