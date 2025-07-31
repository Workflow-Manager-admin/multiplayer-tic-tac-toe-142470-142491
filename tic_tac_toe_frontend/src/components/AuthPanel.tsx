import { component$, $, useSignal, useTask$ } from "@builder.io/qwik";

/**
 * Handles authentication UI. Uses signals for user state; for use in Qwik components.
 * Props: userSignal (signal), setUserSignal (signal)
 */
export interface AuthPanelProps {
  userSignal: any;
  setUserSignal: any;
}
// PUBLIC_INTERFACE
export const AuthPanel = component$((props: AuthPanelProps) => {
  // User state is a signal: props.userSignal & props.setUserSignal
  const username = useSignal("");
  const errorMsg = useSignal("");
  const loading = useSignal(false);

  // Restore session only if not set yet
  useTask$(({ cleanup }) => {
    let ignore = false;
    // Only restore if no user yet
    if (!props.userSignal.value) {
      loading.value = true;
      fetch("/api/session")
        .then((res) => res.json())
        .then((data) => {
          if (!ignore && data && data.user && props.setUserSignal)
            props.setUserSignal.value(data.user);
        })
        .catch(() => {
          /* ignore */
        })
        .finally(() => {
          loading.value = false;
        });
    }
    cleanup(() => {
      ignore = true;
    });
  });

  // Place setUser & setUser(null) into the $-closure, via signal indirection
  const handleLogin = $(async () => {
    errorMsg.value = "";
    loading.value = true;
    const res = await fetch("/api/users", {
      method: "POST",
      body: JSON.stringify({ username: username.value.trim() }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (res.ok && data && data.user) {
      if (props.setUserSignal) props.setUserSignal.value(data.user);
    } else {
      errorMsg.value = data.message || "Failed to authenticate";
    }
    loading.value = false;
  });

  const handleLogout = $(async () => {
    await fetch("/api/session", { method: "DELETE" });
    if (props.setUserSignal) props.setUserSignal.value(null);
  });

  if (loading.value) {
    return (
      <div class="auth-panel">
        <span class="spinner" /> <span>Loading…</span>
      </div>
    );
  }
  if (props.userSignal.value) {
    return (
      <div class="auth-panel logged-in">
        <span>👤 {props.userSignal.value.username}</span>
        <button onClick$={handleLogout} class="logout-btn">Logout</button>
      </div>
    );
  }
  return (
    <div class="auth-panel">
      <input
        class="auth-input"
        placeholder="Enter a username"
        maxLength={20}
        value={username.value}
        onInput$={(e) =>
          (username.value = (e.target as HTMLInputElement).value)
        }
      />
      <button class="login-btn" disabled={loading.value} onClick$={handleLogin}>
        Login / Register
      </button>
      {errorMsg.value && <div class="auth-error">{errorMsg.value}</div>}
    </div>
  );
});
