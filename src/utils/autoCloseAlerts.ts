
export function autoCloseAlerts() {
    const alerts = document.querySelectorAll<HTMLElement>(
        [
            '[class*="-alert"]',
            '[class^="alert-"]',
            '[class*=" alert-"]',
            ".location-capture-message",
        ].join(",")
    );

    alerts.forEach((alert) => {
        if (alert.dataset.autoCloseInitialized) return;

        alert.dataset.autoCloseInitialized = "true";

        window.setTimeout(() => {
            alert.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            alert.style.opacity = "0";
            alert.style.transform = "translateX(20px)";

            window.setTimeout(() => {
                alert.remove();
            }, 300);
        }, 4000);
    });
}
