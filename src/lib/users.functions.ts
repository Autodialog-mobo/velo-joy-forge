import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "staff";

async function assertAdminStrict(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const getMyRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { roles: (data ?? []).map((r: any) => r.role as string) };
  });

export const listAdmins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertAdminStrict(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allow, error: ae } = await (supabaseAdmin as any)
      .from("admin_email_allowlist")
      .select("email, role, created_at")
      .order("created_at", { ascending: false });
    if (ae) throw new Error(ae.message);

    const { data: roles, error: re } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("user_id, role, created_at")
      .in("role", ["admin", "staff"]);
    if (re) throw new Error(re.message);

    // Group roles per user
    const rolesByUser: Record<string, string[]> = {};
    for (const r of roles ?? []) {
      (rolesByUser[r.user_id] ??= []).push(r.role);
    }

    const usersById: Record<string, { email: string | null; last_sign_in_at: string | null; created_at: string | null }> = {};
    for (const uid of Object.keys(rolesByUser)) {
      try {
        const { data: u } = await (supabaseAdmin as any).auth.admin.getUserById(uid);
        if (u?.user) {
          usersById[uid] = {
            email: u.user.email ?? null,
            last_sign_in_at: u.user.last_sign_in_at ?? null,
            created_at: u.user.created_at ?? null,
          };
        }
      } catch {}
    }

    const members = Object.keys(rolesByUser).map((uid) => ({
      user_id: uid,
      email: usersById[uid]?.email ?? null,
      roles: rolesByUser[uid],
      last_sign_in_at: usersById[uid]?.last_sign_in_at ?? null,
      created_at: usersById[uid]?.created_at ?? null,
    }));

    return { allowlist: allow ?? [], members };
  });

export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: AppRole }) => {
    const email = (d.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ongeldig e-mailadres");
    const role = d.role === "staff" ? "staff" : "admin";
    return { email, role: role as AppRole };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdminStrict(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Upsert allowlist with role
    const { error: ie } = await (supabaseAdmin as any)
      .from("admin_email_allowlist")
      .upsert({ email: data.email, role: data.role }, { onConflict: "email" });
    if (ie) throw new Error(ie.message);

    // 2. Look up existing user
    let existingUserId: string | null = null;
    try {
      const { data: list } = await (supabaseAdmin as any).auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === data.email);
      if (found) existingUserId = found.id;
    } catch {}

    const origin = process.env.SITE_URL || "https://www.velopass.com";
    const redirectTo = `${origin}/reset-password`;

    if (existingUserId) {
      // Sync roles: ensure desired role, remove the opposite one
      const other = data.role === "admin" ? "staff" : "admin";
      await (supabaseAdmin as any)
        .from("user_roles")
        .delete()
        .eq("user_id", existingUserId)
        .eq("role", other);
      await (supabaseAdmin as any)
        .from("user_roles")
        .upsert({ user_id: existingUserId, role: data.role }, { onConflict: "user_id,role" });
      await (supabaseAdmin as any).auth.resetPasswordForEmail(data.email, { redirectTo });
      return { ok: true, status: "existing_user_role_granted" as const };
    }

    const { error: invErr } = await (supabaseAdmin as any).auth.admin.inviteUserByEmail(
      data.email,
      { redirectTo },
    );
    if (invErr) throw new Error(invErr.message);

    const { writeAudit } = await import("./audit.server");
    await writeAudit(context, {
      action: "admin.invite",
      target_type: "email",
      target_id: data.email,
      metadata: { role: data.role, status: "invited" },
    });
    return { ok: true, status: "invited" as const };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; email: string; role: AppRole }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdminStrict(supabase, userId);
    if (data.userId === userId && data.role !== "admin") {
      throw new Error("Je kan je eigen adminrol niet downgraden.");
    }
    const role: AppRole = data.role === "staff" ? "staff" : "admin";
    const other: AppRole = role === "admin" ? "staff" : "admin";
    const email = (data.email || "").trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await (supabaseAdmin as any)
      .from("admin_email_allowlist")
      .upsert({ email, role }, { onConflict: "email" });
    await (supabaseAdmin as any)
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", other);
    await (supabaseAdmin as any)
      .from("user_roles")
      .upsert({ user_id: data.userId, role }, { onConflict: "user_id,role" });
    return { ok: true };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; userId?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertAdminStrict(supabase, userId);
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
        .in("role", ["admin", "staff"]);
    }
    return { ok: true };
  });
