// ============================================================================
//  FIREBASE CONFIG  —  the "remote control brain"
// ----------------------------------------------------------------------------
//  This is what lets YOU control Grandma's phone live from your control panel.
//  It is FREE. Setup takes ~10 minutes (see README.md, section "2. Firebase").
//
//  Until you paste real values here, the app still works in LOCAL MODE:
//  it shows the buttons from config.json (no live remote control yet).
// ============================================================================

export const firebaseConfig = {
  apiKey:            "PASTE_API_KEY",
  authDomain:        "PASTE_PROJECT.firebaseapp.com",
  databaseURL:       "https://PASTE_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "PASTE_PROJECT",
  storageBucket:     "PASTE_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId:             "PASTE_APP_ID",
};

// Password to OPEN your control panel (control.html). Change this to anything
// only you know. It just stops Grandma / random people from opening the
// control screen. Not bank-grade security — see README "Security notes".
export const CONTROL_PASSWORD = "change-me-now";

// A short id so multiple family setups don't clash. Any word is fine.
export const FAMILY_ID = "maa";

// --- helper: are we actually configured, or still on placeholders? ----------
export function isConfigured() {
  return !firebaseConfig.apiKey.includes("PASTE");
}
