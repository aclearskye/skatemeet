import { supabase } from "../supabaseClient";

export type CreateUserResult = {
  needsEmailConfirmation: boolean;
};

const createUser = async (email: string, password: string): Promise<CreateUserResult> => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Failed to create account");
  // session is null when the project requires email confirmation before sign-in
  return { needsEmailConfirmation: data.session === null };
};

export default createUser;
