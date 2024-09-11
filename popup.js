document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const activeTab = tabs[0];

        if (activeTab.url && activeTab.url.includes('https://timetracker.newagesmb.com/')) {
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                function: getAttendanceTimes
            }, (result) => {
                if (result && result[0] && result[0].result) {
                    const { punchIn, breakTime } = result[0].result;
                    document.getElementById('punchInTime').textContent = punchIn || 'N/A';
                    document.getElementById('breakTime').value = breakTime || 'N/A';

                    // Calculate initial end time (Punch-in time + 8 hours + break time)
                    const endTime = calculateEndTime(punchIn, breakTime);
                    updateEndTimeDisplay(endTime);

                    // Add event listener to refresh icon
                    document.getElementById('refreshBtn').addEventListener('click', function () {
                        // Get the updated break time from the input field
                        const updatedBreakTime = document.getElementById('breakTime').value;
                        // Recalculate the end time based on the updated break time
                        const updatedEndTime = calculateEndTime(punchIn, updatedBreakTime);
                        updateEndTimeDisplay(updatedEndTime);
                    });
                }
            });
        } else {
            document.getElementById('punchInTime').textContent = 'Invalid URL';
            document.getElementById('breakTime').style.display = 'none';
            document.getElementById('endTime').textContent = 'Invalid URL';
        }
    });
});


// Function to extract punch-in and break time using XPath
function getAttendanceTimes() {
    const punchInXPath = "//table[contains(@class,'jambo_table')]//tr[1]/td[4]";
    const breakTimeXPath = "//table[contains(@class,'jambo_table')]//tr[1]/td[2]";

    const punchInTime = document.evaluate(punchInXPath, document, null, XPathResult.STRING_TYPE, null).stringValue;
    const breakTime = document.evaluate(breakTimeXPath, document, null, XPathResult.STRING_TYPE, null).stringValue;

    return { punchIn: punchInTime, breakTime: breakTime };
}

// Function to calculate end time (Punch-in time + 8 hours + break time)
function calculateEndTime(punchInTime, breakTime) {
    if (!punchInTime) return null;

    // Convert Punch-in time to Date object
    const timeParts = punchInTime.split(':');
    let hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1].substring(0, 2));
    const ampm = timeParts[1].substring(2).trim();

    if (ampm === 'PM' && hours !== 12) {
        hours += 12; // Convert to 24-hour format
    } else if (ampm === 'AM' && hours === 12) {
        hours = 0; // Midnight case
    }

    // Create a new Date object for Punch-in time
    const punchInDate = new Date();
    punchInDate.setHours(hours);
    punchInDate.setMinutes(minutes);

    // Add 8 hours
    punchInDate.setHours(punchInDate.getHours() + 8);

    // Parse the break time and add it
    const breakMinutes = parseBreakTime(breakTime);
    punchInDate.setMinutes(punchInDate.getMinutes() + breakMinutes);

    return punchInDate;
}

// Function to parse break time in minutes (e.g., "25m" or "1h 30m")
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

// Function to update the display of Expected End Time based on comparison with current time
function updateEndTimeDisplay(endTime) {
    const endTimeElement = document.getElementById('endTime');
    
    // Format the end time to a human-readable string
    const endHours = endTime.getHours();
    const endMinutes = endTime.getMinutes();
    const endAmPm = endHours >= 12 ? 'PM' : 'AM';
    const formattedEndHours = endHours % 12 || 12; // Convert back to 12-hour format
    const formattedEndMinutes = endMinutes < 10 ? '0' + endMinutes : endMinutes;
    const formattedEndTime = `${formattedEndHours}:${formattedEndMinutes} ${endAmPm}`;

    // Display the formatted end time
    endTimeElement.textContent = formattedEndTime;

    // Get the current time
    const currentTime = new Date();

    // Compare the end time with the current time and change background color accordingly
    if (endTime > currentTime) {
        endTimeElement.style.backgroundColor = 'red';  // Set background color to red
        endTimeElement.style.color = 'white';          // Set font color to white
    } else {
        endTimeElement.style.backgroundColor = 'green'; // Set background color to green
        endTimeElement.style.color = 'white';           // Set font color to white
    }
}
