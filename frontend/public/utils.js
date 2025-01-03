// utils.js

export function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');

    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;

    container.appendChild(notification);

    // Automatically remove the notification after 5 seconds
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            container.removeChild(notification);
        }, 500); // Match the CSS transition duration
    }, 5000);
}
