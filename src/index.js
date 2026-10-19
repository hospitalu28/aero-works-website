
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Kontaktformas pieprasījums
    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Method not allowed" },
          { status: 405 }
        );
      }

      try {
        if (!request.headers.get("content-type")?.includes("application/json")) {
          return Response.json(
            { error: "Invalid content type" },
            { status: 415 }
          );
        }

        const raw = await request.text();
        if (raw.length > 12000) {
          return Response.json(
            { error: "Message too large" },
            { status: 413 }
          );
        }

        const data = JSON.parse(raw);
        const clean = (value, limit) =>
          typeof value === "string" ? value.trim().slice(0, limit) : "";

        const name = clean(data.name, 120);
        const company = clean(data.company, 150);
        const email = clean(data.email, 254);
        const phone = clean(data.phone, 80);
        const subject = clean(data.subject, 200);
        const message = clean(data.message, 5000);

        if (
          !name ||
          !phone ||
          !message ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
          return Response.json(
            { error: "Please complete all required fields." },
            { status: 400 }
          );
        }

        // Vienkārša aizsardzība pret automātisku formu aizpildīšanu
        if (data.website) {
          return Response.json({ success: true });
        }

        const emailBody = [
          "New AERO-WORKS website enquiry",
          "",
          `Name: ${name}`,
          `Company: ${company}`,
          `Email: ${email}`,
          `Phone: ${phone}`,
          `Subject: ${subject}`,
          "",
          "Message:",
          message
        ].join("\n");

        const resendResponse = await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: "AERO-WORKS Website <website@aero-works.no>",
              to: ["hello@aero-works.no"],
              reply_to: email,
              subject: `Website enquiry: ${subject || "New message"}`,
              text: emailBody
            })
          }
        );

        if (!resendResponse.ok) {
          console.error(
            "Resend error:",
            resendResponse.status,
            await resendResponse.text()
          );

          return Response.json(
            { error: "Message could not be sent." },
            { status: 502 }
          );
        }

        return Response.json({ success: true });
      } catch (error) {
        console.error("Contact form error:", error);

        return Response.json(
          { error: "Invalid request." },
          { status: 400 }
        );
      }
    }

    // Pārējie pieprasījumi atver esošo mājaslapu
    return env.ASSETS.fetch(request);
  }
};
