import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listAdmins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allow, error: ae } = await (supabaseAdmin as any)
      .from("admin_email_allowlist")
      .select("email, created_at")
      .order("created_at", { ascending: false });
    if (ae) throw new Error(ae.message);

    const { data: roles, error: re } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("user_id, role, created_at")
      .eq("role", "admin");
    if (re) throw new Error(re.message);

    // Resolve emails + last sign-in for admin role users
    const usersById: Record<string, { email: string | null; last_sign_in_at: string | null; created_at: string | null }> = {};
    for (const r of roles ?? []) {
      try {
        const { data: u } = await (supabaseAdmin as any).auth.admin.getUserById(r.user_id);
        if (u?.user) {
          usersById[r.user_id] = {
            email: u.user.email ?? null,
            last_sign_in_at: u.user.last_sign_in_at ?? null,
            created_at: u.user.created_at ?? null,
          };
        }
      } catch {}
    }

    const admins = (roles ?? []).map((r: any) => ({
      user_id: r.user_id,
      email: usersById[r.user_id]?.email ?? null,
      last_sign_in_at: usersById[r.user_id]?.last_sign_in_at ?? null,
      created_at: usersById[r.user_id]?.created_at ?? r.created_at,
    }));

    return { allowlist: allow ?? [], admins };
  });

export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) => {
    const email = (d.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ongeldig e-mailadres");
    return { email };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Add to allowlist (idempotent)
    const { error: ie } = await (supabaseAdmin as any)
      .from("admin_email_allowlist")
      .upsert({ email: data.email }, { onConflict: "email" });
    if (ie) throw new Error(ie.message);

    // 2. Look up existing user
    let existingUserId: string | null = null;
    try {
      // listUsers paginated; search by email via filter
      const { data: list } = await (supabaseAdmin as any).auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === data.email);
      if (found) existingUserId = found.id;
    } catch {}

    const origin = process.env.SITE_URL || "https://www.velopass.com";
    const redirectTo = `${origin}/reset-password`;

    if (existingUserId) {
      // Ensure admin role
      await (supabaseAdmin as any)
        .from("user_roles")
        .upsert({ user_id: existingUserId, role: "admin" }, { onConflict: "user_id,role" });
      // Send password reset so they can (re)set their password
      await (supabaseAdmin as any).auth.resetPasswordForEmail(data.email, { redirectTo });
      return { ok: true, status: "existing_user_role_granted" as const };
    }

    // 3. Send invite — trigger handle_new_admin_user grants role on signup
    const { error: invErr } = await (supabaseAdmin as any).auth.admin.inviteUserByEmail(
      data.email,
      { redirectTo },
    );
    if (invErr) throw new Error(invErr.message);

    return { ok: true, status: "invited" as const };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; userId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    if (data.userId && data.userId === userId) {
      throw new Error("Je kan jezelf niet verwijderen.");
    }
    const email = (data.email || "").trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await (supabaseAdmin as any).from("admin_email_allowlist").delete().eq("email", email);
    if (data.userId) {
      await (supabaseAdmin as any)
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
    }
    return { ok: true };
  });
