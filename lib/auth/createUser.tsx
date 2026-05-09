import { supabase } from "../supabaseClient";

const createUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Failed to create account");
  return data;
};

export default createUser;
