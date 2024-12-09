// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add a theme toggle button
    const themeButton = document.createElement('button');
    themeButton.textContent = '🌙 Toggle Dark Mode';
    themeButton.classList.add('theme-toggle');
    document.querySelector('header').appendChild(themeButton);

    // Theme toggle functionality
    let isDarkMode = false;
    themeButton.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode');
        themeButton.textContent = isDarkMode ? '☀️ Toggle Light Mode' : '🌙 Toggle Dark Mode';
    });

    // Add current time display
    const timeDisplay = document.createElement('div');
    timeDisplay.classList.add('time-display');
    document.querySelector('footer').prepend(timeDisplay);

    function updateTime() {
        const now = new Date();
        timeDisplay.textContent = `Current time: ${now.toLocaleTimeString()}`;
    }

    // Update time every second
    updateTime();
    setInterval(updateTime, 1000);

    // Add interactive greeting
    const greeting = document.querySelector('.greeting');
    if (greeting) {
        greeting.addEventListener('mouseover', () => {
            greeting.style.transform = 'scale(1.1)';
        });
        greeting.addEventListener('mouseout', () => {
            greeting.style.transform = 'scale(1)';
        });
    }
});
