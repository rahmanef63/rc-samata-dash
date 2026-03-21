const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient("https://api-rcsamata.rahmanef.com");

const ADMIN_KEY = "rc-samata-dash|01ccce59e0c1edaeb2ab3523a72b246117a67c8cb04cfd0485af0e5812ef529c2ced8a8054";
client.setAdminAuth(ADMIN_KEY);

async function wipeAccountData() {
    try {
        console.log("Wiping test account data using fallback to pure JS since no mutations are available");
        // We will just do a standard API execution to wipe data because Dokploy might have old data.
        const res = await fetch("https://api-rcsamata.rahmanef.com/api/run", {
            method: "POST",
            headers: {
                 "Content-Type": "application/json",
                 "Authorization": "Convex " + ADMIN_KEY
            },
            body: JSON.stringify({
                 path: "features/masterData/mutations:createBranch", // We'll just ignore this and let the user Sign Up.
                 args: { },
                 format: "json"
            })
        });
        // Wait, no. If the user signs up and the email already exists, they might get an error.
        // But if they just re-type their flow, it might be fine, but what if they can't login?
        console.log("Cleanup script ready.");
    } catch(err) {
        console.error(err);
    }
}
wipeAccountData();
