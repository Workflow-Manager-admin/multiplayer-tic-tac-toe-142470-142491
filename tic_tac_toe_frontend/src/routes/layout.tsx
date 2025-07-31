import { component$, Slot, useStyles$ } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";
import styles from "./styles.css?inline";
import tictactoe from "./tictactoe.css?inline";

export const onGet: RequestHandler = async ({ cacheControl }) => {
  cacheControl({
    staleWhileRevalidate: 60 * 60 * 24 * 7,
    maxAge: 5,
  });
};

// PUBLIC_INTERFACE
export default component$(() => {
  // Apply layout-level + tictactoe styles (makes everything responsive and themed)
  useStyles$(styles);
  useStyles$(tictactoe);
  return (
    <main>
      <Slot />
    </main>
  );
});
