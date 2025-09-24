import { getCookie } from "./cookieUtils";

// Centralized fetch wrapper that injects Authorization header and handles expired signature
let sessionExpiredHandled = false;
export async function authorizedFetch(url, options = {}) {
    const csrfToken = getCookie("csrftoken");
    const mergedHeaders = {
        ...(options.headers || {}),
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    };

    const response = await fetch(url, { 
        ...options, 
        headers: mergedHeaders,
        credentials: 'include'
    });

    if (!response.ok) {
        let responseText = "";
        try {
            responseText = await response.text();
        } catch (_) {
        }

        throw new Error(`HTTP ${response.status} for ${url} :: ${responseText}`);
    }

    return response;
}


