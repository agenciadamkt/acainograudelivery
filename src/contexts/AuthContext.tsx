import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export type UserRole = 'admin' | 'manager' | 'staff' | 'franchisee_master';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole[] | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Fetch user role if authenticated
        if (session?.user) {
          setTimeout(async () => {
            try {
              console.log('Fetching roles for user:', session.user.id);
              const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id);

              console.log('Roles query result:', { data, error });

              if (!error && data && data.length > 0) {
                const roles = data.map(r => r.role as UserRole);
                setUserRole(roles);
                console.log('User roles set:', roles);
              } else if (error) {
                console.error('Error fetching user roles:', error);
                setUserRole(null);
              } else {
                console.log('No roles found for user');
                setUserRole(null);
              }
            } catch (err) {
              console.error('Exception fetching user roles:', err);
              setUserRole(null);
            }
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(async () => {
          try {
            console.log('Initial session - Fetching roles for user:', session.user.id);
            const { data, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id);

            console.log('Initial roles query result:', { data, error });

            if (!error && data && data.length > 0) {
              const roles = data.map(r => r.role as UserRole);
              setUserRole(roles);
              console.log('Initial user roles set:', roles);
            } else if (error) {
              console.error('Error fetching initial user roles:', error);
              setUserRole(null);
            } else {
              console.log('No roles found for user');
              setUserRole(null);
            }
          } catch (err) {
            console.error('Exception fetching initial user roles:', err);
            setUserRole(null);
          } finally {
            setIsLoading(false);
          }
        }, 0);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/admin/dashboard`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          is_admin_signup: true
        }
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Conta criada com sucesso!');
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error);
      if (error.message.toLowerCase().includes('email not confirmed')) {
        toast.info('Por favor, confirme seu e-mail antes de fazer login.', {
          description: 'Verifique sua caixa de entrada (e spam) para encontrar o link de ativação.'
        });
      } else if (error.message.toLowerCase().includes('invalid login credentials')) {
        toast.error('Email ou senha inválidos');
      } else {
        toast.error('Erro ao fazer login: ' + error.message);
      }
    } else {
      toast.success('Login realizado com sucesso!');
    }

    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Exception during sign out:', error);
    } finally {
      setUser(null);
      setSession(null);
      setUserRole(null);
      navigate('/admin/login');
      toast.success('Logout realizado com sucesso!');
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/update-password`,
    });
    return { error };
  };

  const hasRole = (role: UserRole): boolean => {
    if (!userRole || userRole.length === 0) {
      return false;
    }

    // franchisee_master tem acesso a tudo
    if (userRole.includes('franchisee_master')) {
      return true;
    }

    // Verificar se tem a role específica
    if (userRole.includes(role)) {
      return true;
    }

    // Hierarquia de roles
    if (role === 'staff') {
      return userRole.includes('admin') || userRole.includes('manager') || userRole.includes('staff');
    }
    if (role === 'manager') {
      return userRole.includes('admin') || userRole.includes('manager');
    }

    return false;
  };

  const register = async (email: string, password: string, name: string, phone: string) => {
    try {
      // ETAPA 1: Validar ANTES de criar usuário
      console.log('Validating customer data:', { email, phone });

      let validationData: any = { available: true, conflicts: {} };

      try {
        const { data, error } = await supabase.functions.invoke(
          'validate-customer',
          {
            body: { email, phone }
          }
        );

        if (error) {
          throw error;
        }

        validationData = data;
        console.log('Validation result:', validationData);
      } catch (err) {
        console.warn('Validação indisponível, seguindo fallback:', err);
      }

      // Se houver conflitos, retornar erro específico
      if (!validationData.available) {
        const { conflicts } = validationData;

        if (conflicts.phone && conflicts.email) {
          return {
            error: { message: 'Este telefone e email já estão cadastrados. Faça login ou use outros dados.' }
          };
        } else if (conflicts.phone) {
          return {
            error: { message: 'Este telefone já está cadastrado. Use outro número ou faça login.' }
          };
        } else if (conflicts.email) {
          return {
            error: { message: 'Este email já está cadastrado. Faça login ou use outro email.' }
          };
        }
      }

      // ETAPA 2: Criar usuário apenas se validação passou
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        // Tratar erros específicos do trigger
        if (error.message.includes('Phone number already registered')) {
          return {
            error: { message: 'Este telefone já está cadastrado. Use outro número ou faça login.' }
          };
        } else if (error.message.includes('Email already registered')) {
          return {
            error: { message: 'Este email já está cadastrado. Faça login ou use outro email.' }
          };
        }
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      isLoading,
      signUp,
      signIn,
      signOut,
      register,
      resetPassword,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
