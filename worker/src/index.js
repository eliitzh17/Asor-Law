/**
 * asor-digital-api — Cloudflare Worker
 *
 * Routes:
 *   POST /api/rental/create-payment
 *     Receives form submission, creates a SUMIT payment redirect, returns the URL.
 *     Frontend: digital/rental-agreement/form.js
 *
 *   GET /healthz
 *     Liveness check.
 *
 * Future routes (not yet wired):
 *   POST /api/rental/complete  — generates DOCX, emails to customer (after SUMIT redirect)
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { createPaymentRedirect } from "./sumit.js";

const app = new Hono();

// CORS — only allow from our own domains (configured in wrangler.toml [vars])
app.use("/api/*", async (c, next) => {
    const origins = c.env.CORS_ORIGINS.split(",").map(s => s.trim());
    return cors({
        origin: origins,
        allowMethods: ["POST", "GET", "OPTIONS"],
        allowHeaders: ["Content-Type"],
        maxAge: 600,
    })(c, next);
});

// ===== Health check =====
app.get("/healthz", c => c.json({ ok: true, service: "asor-digital-api" }));

// ===== Create payment for rental agreement =====
app.post("/api/rental/create-payment", async c => {
    let payload;
    try {
        payload = await c.req.json();
    } catch {
        return c.json({ error: "Invalid JSON body" }, 400);
    }

    // Minimal validation — full data validation happens client-side too,
    // here we just confirm the fields we need to charge & confirm exist
    const required = ["tenant_name", "tenant_email", "tenant_phone"];
    for (const k of required) {
        if (!payload[k]) return c.json({ error: `Missing field: ${k}` }, 400);
    }

    // Generate an order ID we'll echo through SUMIT and use to retrieve the order on return
    const orderId = crypto.randomUUID();

    // TODO (next task): persist `payload` keyed by orderId in KV/D1, with status="pending_payment"
    // For MVP scaffolding, we trust the redirect parameters back from SUMIT until storage is in place.

    const returnUrl = `${c.env.RETURN_URL_BASE}/digital/rental-agreement/success.html?orderId=${encodeURIComponent(orderId)}`;

    try {
        const { redirectUrl } = await createPaymentRedirect(c.env, {
            orderId,
            productName: c.env.PRODUCT_RENTAL_NAME,
            priceIls: Number(c.env.PRODUCT_RENTAL_PRICE),
            customerName: payload.tenant_name,
            customerEmail: payload.tenant_email,
            customerPhone: payload.tenant_phone,
            returnUrl,
        });
        return c.json({ orderId, redirectUrl });
    } catch (err) {
        console.error("create-payment failed", err);
        return c.json({ error: "Payment provider error", detail: err.message }, 502);
    }
});

// 404 for everything else
app.notFound(c => c.json({ error: "Not found" }, 404));

// 500 fallback
app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "Internal error", detail: err.message }, 500);
});

export default app;
