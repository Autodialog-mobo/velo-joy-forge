// Module-level bridge between the Auth0 React SDK (hook-based) and the TanStack
// Start client-side functionMiddleware (plain function). The provider registers
// a getter; the middleware reads through it on every useServerFn call.

let getter: (() => Promise<string | null>) | null = null;

export function registerAuth0TokenGetter(fn: (() => Promise<string | null>) | null) {
  getter = fn;
}

export async function getAuth0AccessToken(): Promise<string | null> {
  if (!getter) return null;
  try {
    return await getter();
  } catch {
    return null;
  }
}
