// Sleep function to introduce a delay (in milliseconds)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

document.addEventListener('DOMContentLoaded', async function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const activeTab = tabs[0];
        const targetUrl = 'https://timetracker.newagesmb.com/#/yattendance';

        // Check if the current tab's URL is the target URL
        if (activeTab.url !== targetUrl) {
            chrome.tabs.update(activeTab.id, { url: targetUrl }, async function () {
                chrome.tabs.onUpdated.addListener(async function onUpdated(tabId, changeInfo, tab) {
                    if (tabId === activeTab.id && changeInfo.status === 'complete' && tab.url === targetUrl) {
                        await sleep(2000);
                        runTimeTrackerScript(tabId);
                        chrome.tabs.onUpdated.removeListener(onUpdated);
                    }
                });
            });
        } else {
            runTimeTrackerScript(activeTab.id);
        }
    });
});

function runTimeTrackerScript(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: getAttendanceTimes
    }, (result) => {
        if (result && result[0] && result[0].result) {
            const { punchIn, breakTime } = result[0].result;
            document.getElementById('punchInTime').textContent = punchIn || 'N/A';
            document.getElementById('breakTime').value = breakTime || 'N/A';

            const endTime = calculateEndTime(punchIn, breakTime, 8);
            const minHours = calculateEndTime(punchIn, breakTime, 6);

            updateEndTimeDisplay(endTime, 'endTime');
            updateEndTimeDisplay(minHours, 'minHours');

            // Update the pending time dynamically
            updatePendingTime(endTime);

            // Set interval to update the pending time every minute
            setInterval(() => {
                updatePendingTime(endTime);
            }, 60000); // 60 seconds

            // Add event listener to the refresh button
            document.getElementById('refreshBtn').addEventListener('click', function () {
                const updatedBreakTime = document.getElementById('breakTime').value;
                const updatedEndTime = calculateEndTime(punchIn, updatedBreakTime, 8);
                const updatedMinHours = calculateEndTime(punchIn, updatedBreakTime, 6);

                // Update displayed times
                updateEndTimeDisplay(updatedEndTime, 'endTime');
                updateEndTimeDisplay(updatedMinHours, 'minHours');

                // Recalculate and update pending time
                updatePendingTime(updatedEndTime);
            });
        }
    });
}

function getAttendanceTimes() {
    const punchInXPath = "//table[contains(@class,'jambo_table')]//tr[1]/td[4]";
    const breakTimeXPath = "//table[contains(@class,'jambo_table')]//tr[1]/td[2]";

    const punchInTime = document.evaluate(punchInXPath, document, null, XPathResult.STRING_TYPE, null).stringValue;
    const breakTime = document.evaluate(breakTimeXPath, document, null, XPathResult.STRING_TYPE, null).stringValue;

    return { punchIn: punchInTime, breakTime: breakTime };
}

function calculateEndTime(punchInTime, breakTime, additionalHours) {
    if (!punchInTime) return null;

    const timeParts = punchInTime.split(':');
    let hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1].substring(0, 2));
    const ampm = timeParts[1].substring(2).trim();

    if (ampm === 'PM' && hours !== 12) {
        hours += 12; // Convert to 24-hour format
    } else if (ampm === 'AM' && hours === 12) {
        hours = 0; // Midnight case
    }

    const punchInDate = new Date();
    punchInDate.setHours(hours);
    punchInDate.setMinutes(minutes);

    punchInDate.setHours(punchInDate.getHours() + additionalHours);

    const breakMinutes = parseBreakTime(breakTime);
    punchInDate.setMinutes(punchInDate.getMinutes() + breakMinutes);

    return punchInDate;
}

function parseBreakTime(breakTime) {
    if (!breakTime) return 0;

    let totalMinutes = 0;
    const hourMatch = breakTime.match(/(\d+)h/);
    const minuteMatch = breakTime.match(/(\d+)m/);

    if (hourMatch) {
        totalMinutes += parseInt(hourMatch[1]) * 60; // Convert hours to minutes
    }
    if (minuteMatch) {
        totalMinutes += parseInt(minuteMatch[1]); // Add minutes
    }

    return totalMinutes;
}

function updateEndTimeDisplay(time, elementId) {
    const timeElement = document.getElementById(elementId);
    const timeHours = time.getHours();
    const timeMinutes = time.getMinutes();
    const timeAmPm = timeHours >= 12 ? 'PM' : 'AM';
    const formattedTimeHours = timeHours % 12 || 12;
    const formattedTimeMinutes = timeMinutes < 10 ? '0' + timeMinutes : timeMinutes;
    const formattedTime = `${formattedTimeHours}:${formattedTimeMinutes} ${timeAmPm}`;

    timeElement.textContent = formattedTime;

    const currentTime = new Date();

    if (time > currentTime) {
        timeElement.style.backgroundColor = 'red';
        timeElement.style.color = 'white';
    } else {
        timeElement.style.backgroundColor = 'green';
        timeElement.style.color = 'white';
    }
}

function updatePendingTime(endTime) {
    const pendingElement = document.getElementById('pendingTime');
    const currentTime = new Date();
    const timeDiff = endTime - currentTime;

    if (timeDiff <= 0) {
        pendingElement.textContent = 'No pending time';
        pendingElement.style.backgroundColor = 'green';
    } else {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const formattedPendingTime = `${hours > 0 ? hours + 'h ' : ''}${minutes}m`;

        pendingElement.textContent = `Pending: ${formattedPendingTime}`;
        pendingElement.style.backgroundColor = 'orange';
    }
}
