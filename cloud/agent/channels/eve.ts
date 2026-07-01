import { eveChannel } from "eve/channels/eve";
import { localDev, none, vercelOidc } from "eve/channels/auth";

export default eveChannel({
  auth: [
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // This agent has no browser UI — it's driven by the daily Schedule and the
    // Slack channel, both of which carry their own auth (Vercel Connect / OIDC).
    // none() lets the deploy succeed without a browser auth provider; there is no
    // sensitive browser endpoint to protect (it only scans public boards + posts
    // to a private Slack). Swap in Auth.js/Clerk here if a browser UI is ever added.
    none(),
  ],
});
