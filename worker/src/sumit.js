/**
 * SUMIT API client.
 * Wraps the /billing/payments/beginredirect/ call which creates a one-time
 * hosted payment page. After the customer pays SUMIT issues an automatic
 * חשבונית מס/קבלה and redirects them to our return URL.
 *
 * Verified working on 2026-04-28 with real credentials.
 */

const ENDPOINT_BEGIN_REDIRECT = "/billing/payments/beginredirect/";

/**
 * Create a one-time payment redirect URL.
 *
 * @param {Object} env - Worker env containing SUMIT_API_BASE, SUMIT_COMPANY_ID, SUMIT_API_KEY
 * @param {Object} order - The order details
 * @param {string} order.orderId        - Our internal order ID (UUID); echoed back via return URL
 * @param {string} order.productName    - Item name shown to the customer
 * @param {number} order.priceIls       - Price in ש״ח (integer or with decimals)
 * @param {string} order.customerName
 * @param {string} order.customerEmail
 * @param {string} order.customerPhone
 * @param {string} order.returnUrl      - Where SUMIT sends the user after payment
 * @returns {Promise<{redirectUrl: string}>}
 */
export async function createPaymentRedirect(env, order) {
    const body = {
        Credentials: {
            CompanyID: Number(env.SUMIT_COMPANY_ID),
            APIKey: env.SUMIT_API_KEY,
        },
        Customer: {
            Name: order.customerName,
            EmailAddress: order.customerEmail,
            PhoneNumber: order.customerPhone,
        },
        Items: [{
            Item: { Name: order.productName },
            Quantity: 1,
            UnitPrice: order.priceIls,
            Currency: 1, // 1 = ILS
        }],
        RedirectUrl: order.returnUrl,
        Source: "API",
        // Order metadata SUMIT echoes back on the redirect — useful for verification
        ExternalReference: order.orderId,
    };

    const res = await fetch(env.SUMIT_API_BASE + ENDPOINT_BEGIN_REDIRECT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Language": "he",
        },
        body: JSON.stringify(body),
    });

    const json = await res.json();

    // SUMIT always returns 200 — Status 0 means success, anything else is an error
    if (json.Status !== 0) {
        const msg = json.UserErrorMessage || json.TechnicalErrorDetails || "Unknown SUMIT error";
        const err = new Error("SUMIT API error: " + msg);
        err.code = "SUMIT_ERROR";
        err.sumitStatus = json.Status;
        throw err;
    }

    return { redirectUrl: json.Data.RedirectURL };
}
