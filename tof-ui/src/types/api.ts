export interface Club {
  id: number;
  name: string;
  code: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number: string | null;
  is_referee: boolean;
  is_club_manager: boolean;
  is_admin: boolean;
  club?: Club | null;
}
