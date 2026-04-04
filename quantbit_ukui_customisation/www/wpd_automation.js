// WebPlotDigitizer Automation Script
// This script provides automatic calibration functionality

console.log('WebPlotDigitizer automation script loaded');

// Store record name received from parent
let recordName = 'Unknown Document';

// Store current image name when loaded
let currentImageName = 'image';

// Listen for messages from parent window
window.addEventListener('message', function (event) {
    if (event.data && event.data.action === 'setRecordName') {
        recordName = event.data.recordName;
        console.log('Record name received from parent:', recordName);
    }
});

// Message listener to handle image loading from parent window
window.addEventListener('message', function (event) {
    if (!event.data) return;

    if (event.data.action === 'loadImage') {
        const fileData = event.data;
        console.log('Loading image:', fileData.name);
        
        // Store the image name for later use
        currentImageName = fileData.name ? fileData.name.replace(/\.[^/.]+$/, "") : 'image';
        console.log('Stored current image name:', currentImageName);

        if (typeof wpd === 'undefined' || !wpd.imageManager) {
            console.error('WebPlotDigitizer not fully initialized');
            return;
        }

        try {
            const blob = new Blob([fileData.arrayBuffer], { type: fileData.type });
            const file = new File([blob], fileData.name, { type: fileData.type });

            // wpd.imageManager.loadFromFile expects a File object
            // Some versions might require initialization
            if (wpd.imageManager.initializeFileManager) {
                wpd.imageManager.initializeFileManager([file], true);
            }

            wpd.imageManager.loadFromFile(file).then(() => {
                console.log('Image loaded successfully');
                if (wpd.busyNote) wpd.busyNote.close();

                // Auto-open calibration dialog if not in Electron
                if (wpd.browserInfo && !wpd.browserInfo.isElectronBrowser()) {
                    setTimeout(() => {
                        if (wpd.calibrateAxesDialog) wpd.calibrateAxesDialog.open();
                    }, 500);
                }
            }).catch(error => {
                console.error('Error parsing image:', error);
            });
        } catch (e) {
            console.error('Error handling loadImage:', e);
        }
    }
});

// Intercept CSV downloads
function interceptCSVDownloads() {
    if (typeof wpd === 'undefined') return;

    // Intercept dataExport.generateCSV() (main export function)
    if (wpd.dataExport && wpd.dataExport.generateCSV) {
        const originalGenerateCSV = wpd.dataExport.generateCSV;
        wpd.dataExport.generateCSV = function () {
            console.log('CSV export intercepted (dataExport.generateCSV)');

            let csvData = '';
            try {
                if (typeof wpd.dataExport.generateCSVData === 'function') {
                    csvData = wpd.dataExport.generateCSVData();
                } else {
                    csvData = originalGenerateCSV.call(this);
                }
            } catch (e) {
                console.error('Error generating CSV data:', e);
            }

            if (csvData) {
                sendCSVToParent(csvData);
            }
        };
    }

    // Also intercept dataTable.generateCSV() (table export function)
    if (wpd.dataTable && wpd.dataTable.generateCSV) {
        const originalDataTableCSV = wpd.dataTable.generateCSV;
        wpd.dataTable.generateCSV = function () {
            console.log('CSV export intercepted (dataTable.generateCSV)');

            try {
                let csvData = '';

                // Method 1: Try to get CSV string directly
                if (typeof wpd.dataTable.getCSVString === 'function') {
                    csvData = wpd.dataTable.getCSVString();
                }
                // Method 2: Try to get CSV method
                else if (typeof wpd.dataTable.getCSV === 'function') {
                    csvData = wpd.dataTable.getCSV();
                }
                // Method 3: Extract from visible table in DOM
                else {
                    csvData = extractCSVFromDOM();
                }

                if (csvData && csvData.length > 0) {
                    sendCSVToParent(csvData);
                } else {
                    console.error('CSV data is empty or undefined');
                    originalDataTableCSV.call(this);
                }
            } catch (error) {
                console.error('Error generating CSV data:', error);
                originalDataTableCSV.call(this);
            }
        };
    }
}

function sendCSVToParent(csvData) {
    console.log('Sending CSV data to parent, size:', csvData.length);
    console.log('Using stored image name:', currentImageName);
    
    // Use the stored image name from when the image was loaded
    const imageName = currentImageName || 'image';
    
    console.log('Final image name to send:', imageName);
    
    window.parent.postMessage({
        action: 'csvDownload',
        csvData: csvData,
        filename: 'plot_data.csv',
        imageName: imageName
    }, '*');
}

function extractCSVFromDOM() {
    // The actual data is in a textarea with id "digitizedDataTable"
    const textareaElement = document.querySelector('#digitizedDataTable');
    if (textareaElement && textareaElement.value) {
        return textareaElement.value;
    }

    // Fallback: try to find table with actual data
    let tableElement = document.querySelector('#csvWindow table');
    if (!tableElement) {
        const allTables = document.querySelectorAll('table');
        for (let table of allTables) {
            if (table.querySelector('tbody tr')) {
                tableElement = table;
                break;
            }
        }
    }

    if (tableElement) {
        const rows = Array.from(tableElement.querySelectorAll('tr'));
        return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            return cells.map(cell => {
                let content = cell.textContent.trim();
                if (content.includes(',') || content.includes('"')) {
                    content = '"' + content.replace(/"/g, '""') + '"';
                }
                return content;
            }).join(',');
        }).join('\n');
    }
    return '';
}

// Override the popup.show function to intercept the calibration dialog
function setupAutomation() {
    if (typeof wpd === 'undefined') return false;

    // Setup CSV interception
    interceptCSVDownloads();

    // Override imageManager.load() to prevent manual loading when using automation
    if (wpd.imageManager && wpd.imageManager.load) {
        const originalLoad = wpd.imageManager.load;
        wpd.imageManager.load = function() {
            console.log('Manual image load intercepted - use parent window messages instead');
            // Don't call originalLoad() to prevent the popup
            return false;
        };
    }

    if (wpd.popup && typeof wpd.popup.show === 'function') {
        const originalPopupShow = wpd.popup.show;
        wpd.popup.show = function (dialogId) {
            // console.log(`wpd.popup.show called with dialogId: ${dialogId}`);

            if (dialogId === 'calibrate-axes-options') {
                setTimeout(() => {
                    const xyAxesOption = document.getElementById('calibrate-axes-option-xy');
                    if (xyAxesOption) {
                        xyAxesOption.click();
                        setTimeout(() => {
                            if (wpd.calibrateAxesDialog && wpd.calibrateAxesDialog.calibrate) {
                                wpd.calibrateAxesDialog.calibrate();
                            }
                        }, 100);
                    }
                }, 100);
            }
            // Auto-close the loadNewImage popup since image is already loaded programmatically
            else if (dialogId === 'loadNewImage') {
                console.log('Auto-closing loadNewImage popup - image loaded via automation');
                setTimeout(() => {
                    if (wpd.popup && wpd.popup.close) {
                        wpd.popup.close('loadNewImage');
                    }
                }, 100);
            }
            return originalPopupShow.call(this, dialogId);
        };
        console.log('Automation setup complete');
        return true;
    }
    return false;
}

// Try to set up automation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutomation);
} else {
    initAutomation();
}

function initAutomation() {
    const setupInterval = setInterval(() => {
        if (setupAutomation()) {
            clearInterval(setupInterval);
        }
    }, 500);
    // Stop trying after 15 seconds
    setTimeout(() => clearInterval(setupInterval), 15000);
}

