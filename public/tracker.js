/**
 * FormTrack v2.2 - Universal Form Tracking Script
 * 
 * This script automatically discovers and tracks all form submissions on a website.
 * It's designed to be lightweight, robust, and work with both static sites and SPAs.
 * v2.2: Adds a fallback to generate a form identifier if 'id' or 'name' is missing.
 */
(function () {
    "use strict";

    const SCRIPT_NAME = "FormTrack";
    const API_ENDPOINT = "http://localhost:3000/api/collect";

    function getScriptTag() {
        // Find the script tag on the page that loaded this script.
        // It's used to retrieve the `data-website-id`.
        return document.currentScript || document.querySelector('script[src*="tracker.js"]');
    }

    function getFormIdentifier(form) {
        if (form.id) {
            return { id: form.id, name: form.name || null };
        }
        if (form.name) {
            return { id: null, name: form.name };
        }
        // Fallback: generate an identifier from the input names
        const inputs = form.querySelectorAll('input, textarea, select');
        const fieldNames = Array.from(inputs)
                                .map(input => input.name)
                                .filter(Boolean) // Remove empty names
                                .sort();
        if (fieldNames.length > 0) {
            const generatedId = `fields:${fieldNames.join('-')}`;
            // Return it as formName as it's a descriptive generated identifier
            return { id: null, name: generatedId };
        }

        return { id: null, name: 'untitled-form' };
    }

    function serializeForm(form) {
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            // Basic sanitization: if a field has the same name, convert it to an array.
            if (data.hasOwnProperty(key)) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        });
        return data;
    }

    function handleFormSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const { id: formId, name: formName } = getFormIdentifier(form);
        const websiteId = getScriptTag().dataset.websiteId;
        
        if (!websiteId) {
            console.error(`${SCRIPT_NAME}: websiteId is not set on the script tag. Tracking aborted.`);
            return;
        }

        const payload = {
            websiteId: websiteId,
            formId: formId,
            formName: formName,
            formData: serializeForm(form),
            pageURL: window.location.href,
            submittedAt: new Date().toISOString(),
        };

        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(API_ENDPOINT, blob);
        } else {
            fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(error => console.error(`${SCRIPT_NAME}: Fetch fallback error:`, error));
        }

        setTimeout(() => {
            form.submit();
        }, 300);
    }

    function attachListenerToForm(form) {
        // Avoid attaching multiple listeners to the same form
        if (form.dataset.formtrackAttached) return;

        form.addEventListener("submit", handleFormSubmit);
        form.dataset.formtrackAttached = "true";
        const { id, name } = getFormIdentifier(form);
        console.log(`${SCRIPT_NAME}: Attached listener to form:`, id || name);
    }

    function scanForForms() {
        document.querySelectorAll("form").forEach(attachListenerToForm);
    }

    function init() {
        const scriptTag = getScriptTag();
        if (!scriptTag) {
            console.error(`${SCRIPT_NAME}: Could not find its own script tag. Initialization failed.`);
            return;
        }
        
        const websiteId = scriptTag.dataset.websiteId;
        if (!websiteId) {
            console.error(`${SCRIPT_NAME}: data-website-id attribute is missing from script tag. Tracking will not work.`);
            return;
        }

        console.log(`${SCRIPT_NAME}: Initializing with Website ID: ${websiteId}`);

        // Initial scan for forms on page load
        scanForForms();

        // Use MutationObserver to detect forms added dynamically (for SPAs)
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === "childList") {
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName === 'FORM') {
                            attachListenerToForm(node);
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll('form').forEach(attachListenerToForm);
                        }
                    });
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        console.log(`${SCRIPT_NAME}: Observer is watching for new forms.`);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();