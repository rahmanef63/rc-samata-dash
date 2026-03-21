const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient("https://api-rcsamata.rahmanef.com");

async function testSignUp() {
  console.log("Starting test-signup...");
  try {
    const res = await client.action("auth:signIn", {
      provider: "password",
      params: {
        email: "test2@gmail.com",
        password: "namam",
        flow: "signUp",
        name: "test user"
      }
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Action Failed:", err.message);
  }
}

testSignUp();
