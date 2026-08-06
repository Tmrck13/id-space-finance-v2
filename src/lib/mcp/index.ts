import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyAccount from "./tools/get-my-account";
import listMyTransactions from "./tools/list-my-transactions";
import listMyNotifications from "./tools/list-my-notifications";
import listMembershipLevels from "./tools/list-membership-levels";
import updateMyProfile from "./tools/update-my-profile";

// The OAuth issuer must be the direct Supabase host; the project ref is inlined
// at build time and survives publish unchanged.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "id-space-finance-v2",
  title: "Id Space Finance V2",
  version: "0.1.0",
  instructions:
    "Tools for ID•SPACE FINANCE (IDPI). Read the signed-in user's profile, unified wallet balances (Pi, IDPoints, Cashback), ledger transactions, notifications and membership levels, and update their profile. All balance changes happen through the app's ledger — these tools never write balances.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyAccount, listMyTransactions, listMyNotifications, listMembershipLevels, updateMyProfile],
});
