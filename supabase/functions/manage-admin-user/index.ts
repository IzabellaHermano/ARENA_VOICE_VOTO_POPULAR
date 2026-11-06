// ============================================================================
// ARENA VOICE — VOTO POPULAR
// Supabase Edge Function: manage-admin-user
// Operações Administrativas com Privilégios Elevados (SUPABASE_SERVICE_ROLE_KEY)
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

interface ManageUserRequest {
  action: "create" | "update" | "toggle_active" | "delete";
  userId?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: "superadmin" | "admin" | "operator";
  active?: boolean;
}

serve(async (req: Request) => {
  // Trata preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor Supabase incompleta." }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 1. Extrai o token JWT de autorização do solicitante
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Cabeçalho de autorização não fornecido." }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. Valida o solicitante usando a chave anônima + JWT dele
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: callerUser },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida ou expirada." }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 3. Cliente elevado com SERVICE_ROLE para auditoria de perfil e operações restritas
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: callerProfile, error: profileError } = await adminClient
      .from("admin_profiles")
      .select("role, active")
      .eq("id", callerUser.id)
      .single();

    if (
      profileError ||
      !callerProfile ||
      !callerProfile.active ||
      callerProfile.role !== "superadmin"
    ) {
      return new Response(
        JSON.stringify({
          error: "Acesso negado: Apenas superadministradores ativos possuem permissão para gerenciar usuários.",
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 4. Processamento da Ação Requisitada
    const payload: ManageUserRequest = await req.json();
    const { action, userId, name, email, password, role, active } = payload;

    switch (action) {
      case "create": {
        if (!email || !password || !name) {
          return new Response(
            JSON.stringify({ error: "Nome, e-mail e senha inicial são obrigatórios." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const targetRole = role || "operator";
        const isTargetActive = active !== undefined ? active : true;

        // Cria o usuário no Supabase Auth com senha e confirmação automática
        const { data: newUser, error: createAuthError } =
          await adminClient.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password,
            email_confirm: true,
            user_metadata: {
              name: name.trim(),
              role: targetRole,
            },
          });

        if (createAuthError || !newUser?.user) {
          return new Response(
            JSON.stringify({
              error: `Erro ao criar usuário no Supabase Auth: ${createAuthError?.message || "Erro desconhecido"}`,
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Insere o perfil na tabela admin_profiles
        const { error: profileInsertError } = await adminClient
          .from("admin_profiles")
          .insert({
            id: newUser.user.id,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            role: targetRole,
            active: isTargetActive,
          });

        if (profileInsertError) {
          // Reverte o usuário criado em auth em caso de falha no perfil
          await adminClient.auth.admin.deleteUser(newUser.user.id);
          return new Response(
            JSON.stringify({
              error: `Erro ao registrar perfil do administrador: ${profileInsertError.message}`,
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: newUser.user.id,
              name: name.trim(),
              email: email.trim().toLowerCase(),
              role: targetRole,
              active: isTargetActive,
            },
          }),
          { status: 201, headers: corsHeaders }
        );
      }

      case "update": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Identificador de usuário (userId) obrigatório." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const updates: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (name) updates.name = name.trim();
        if (role) updates.role = role;
        if (active !== undefined) updates.active = active;

        // Atualiza admin_profiles
        const { error: updateProfileError } = await adminClient
          .from("admin_profiles")
          .update(updates)
          .eq("id", userId);

        if (updateProfileError) {
          return new Response(
            JSON.stringify({ error: updateProfileError.message }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Se senha for fornecida, atualiza no Supabase Auth
        if (password) {
          const { error: pwdError } =
            await adminClient.auth.admin.updateUserById(userId, {
              password,
            });
          if (pwdError) {
            return new Response(
              JSON.stringify({
                warning: "Perfil atualizado, mas houve erro ao redefinir senha.",
                details: pwdError.message,
              }),
              { status: 200, headers: corsHeaders }
            );
          }
        }

        return new Response(
          JSON.stringify({ success: true, userId, updates }),
          { status: 200, headers: corsHeaders }
        );
      }

      case "toggle_active": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Identificador de usuário (userId) obrigatório." }),
            { status: 400, headers: corsHeaders }
          );
        }

        if (userId === callerUser.id) {
          return new Response(
            JSON.stringify({
              error: "Operação inválida: Você não pode desativar a sua própria conta de superadministrador.",
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        const newActiveState = active !== undefined ? active : false;
        const { error: toggleError } = await adminClient
          .from("admin_profiles")
          .update({ active: newActiveState, updated_at: new Date().toISOString() })
          .eq("id", userId);

        if (toggleError) {
          return new Response(
            JSON.stringify({ error: toggleError.message }),
            { status: 400, headers: corsHeaders }
          );
        }

        return new Response(
          JSON.stringify({ success: true, userId, active: newActiveState }),
          { status: 200, headers: corsHeaders }
        );
      }

      case "delete": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Identificador de usuário (userId) obrigatório." }),
            { status: 400, headers: corsHeaders }
          );
        }

        if (userId === callerUser.id) {
          return new Response(
            JSON.stringify({
              error: "Operação inválida: Você não pode excluir a sua própria conta de superadministrador.",
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        // 1. Remove da tabela admin_profiles
        await adminClient.from("admin_profiles").delete().eq("id", userId);

        // 2. Remove do Supabase Auth
        const { error: deleteAuthError } =
          await adminClient.auth.admin.deleteUser(userId);

        if (deleteAuthError) {
          return new Response(
            JSON.stringify({
              warning: "Perfil removido, mas houve falha ao excluir do Auth.",
              details: deleteAuthError.message,
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        return new Response(
          JSON.stringify({ success: true, deletedUserId: userId }),
          { status: 200, headers: corsHeaders }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação inválida: ${action}` }),
          { status: 400, headers: corsHeaders }
        );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno do servidor." }),
      { status: 500, headers: corsHeaders }
    );
  }
});

