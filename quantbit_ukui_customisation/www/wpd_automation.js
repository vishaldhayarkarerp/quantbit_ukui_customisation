// WebPlotDigitizer Automation Script
// This script provides automatic calibration functionality

console.log('WebPlotDigitizer automation script loaded');

// Store record name received from parent
let recordName = 'Unknown Document';

// Listen for messages from parent window
window.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'setRecordName') {
        recordName = event.data.recordName;
        console.log('Record name received from parent:', recordName);
    }
});

// Intercept CSV downloads
function interceptCSVDownloads() {
    // Debug available CSV methods
    console.log('Available wpd objects:', Object.keys(wpd || {}));
    console.log('wpd.dataExport:', wpd.dataExport ? Object.keys(wpd.dataExport) : 'undefined');
    console.log('wpd.dataTable:', wpd.dataTable ? Object.keys(wpd.dataTable) : 'undefined');
    
    // Override the download functionality for both dataExport and dataTable
    if (typeof wpd !== 'undefined') {
        // Intercept dataExport.generateCSV() (main export function)
        if (wpd.dataExport && wpd.dataExport.generateCSV) {
            console.log('Found wpd.dataExport.generateCSV, setting up interception');
            const originalGenerateCSV = wpd.dataExport.generateCSV;
            wpd.dataExport.generateCSV = function() {
                console.log('CSV export intercepted (dataExport.generateCSV)');
                
                // Try different methods to get CSV data
                let csvData = '';
                if (typeof wpd.dataExport.generateCSVData === 'function') {
                    csvData = wpd.dataExport.generateCSVData();
                } else if (typeof wpd.dataExport.generateCSV === 'function') {
                    csvData = originalGenerateCSV.call(this);
                } else {
                    console.error('Could not find CSV data generation method');
                    return;
                }
                
                console.log('CSV data generated, size:', csvData.length);
                
                // Send CSV data to parent window
                window.parent.postMessage({
                    action: 'csvDownload',
                    csvData: csvData,
                    filename: 'plot_data.csv'
                }, '*');
                
                console.log('CSV data sent to parent window');
            };
        }
        
        // Also intercept dataTable.generateCSV() (table export function)
        if (wpd.dataTable && wpd.dataTable.generateCSV) {
            console.log('Found wpd.dataTable.generateCSV, setting up interception');
            const originalDataTableCSV = wpd.dataTable.generateCSV;
            wpd.dataTable.generateCSV = function() {
                console.log('CSV export intercepted (dataTable.generateCSV)');
                
                try {
                    // Get the CSV data BEFORE calling the original method
                    let csvData = '';
                    
                    // Method 1: Try to get CSV string directly
                    if (wpd.dataTable.getCSVString && typeof wpd.dataTable.getCSVString === 'function') {
                        console.log('Using getCSVString method');
                        csvData = wpd.dataTable.getCSVString();
                    } 
                    // Method 2: Try to get CSV method
                    else if (wpd.dataTable.getCSV && typeof wpd.dataTable.getCSV === 'function') {
                        console.log('Using getCSV method');
                        csvData = wpd.dataTable.getCSV();
                    } 
                    // Method 3: Extract from visible table in DOM
                    else {
                        console.log('Extracting CSV from DOM');
                        
                        // The actual data is in a textarea with id "digitizedDataTable"
                        const textareaElement = document.querySelector('#digitizedDataTable');
                        if (textareaElement && textareaElement.value) {
                            csvData = textareaElement.value;
                            console.log('Extracted CSV from textarea, size:', csvData.length);
                        } else {
                            // Fallback: try to find table with actual data
                            let tableElement = document.querySelector('#csvWindow table');
                            
                            if (!tableElement) {
                                const allTables = document.querySelectorAll('table');
                                for (let table of allTables) {
                                    const rows = table.querySelectorAll('tbody tr');
                                    if (rows.length > 0) {
                                        tableElement = table;
                                        break;
                                    }
                                }
                            }
                            
                            if (tableElement) {
                                // Get only tbody rows (actual data, not headers)
                                const rows = Array.from(tableElement.querySelectorAll('tbody tr'));
                                if (rows.length === 0) {
                                    // If no tbody, get all tr rows
                                    const allRows = Array.from(tableElement.querySelectorAll('tr'));
                                    csvData = allRows.map(row => {
                                        const cells = Array.from(row.querySelectorAll('td, th'));
                                        return cells.map(cell => {
                                            let content = cell.textContent.trim();
                                            if (content.includes(',') || content.includes('"')) {
                                                content = '"' + content.replace(/"/g, '""') + '"';
                                            }
                                            return content;
                                        }).join(',');
                                    }).join('\n');
                                } else {
                                    // Use tbody rows
                                    csvData = rows.map(row => {
                                        const cells = Array.from(row.querySelectorAll('td'));
                                        return cells.map(cell => {
                                            let content = cell.textContent.trim();
                                            if (content.includes(',') || content.includes('"')) {
                                                content = '"' + content.replace(/"/g, '""') + '"';
                                            }
                                            return content;
                                        }).join(',');
                                    }).join('\n');
                                }
                                console.log('Extracted CSV from DOM table, size:', csvData.length);
                            } else {
                                console.warn('Could not find data textarea or table in DOM');
                            }
                        }
                    }
                    
                    console.log('CSV data generated, size:', csvData ? csvData.length : 0);
                    
                    if (csvData && csvData.length > 0) {
                        // Send CSV data to parent window
                        window.parent.postMessage({
                            action: 'csvDownload',
                            csvData: csvData,
                            filename: 'plot_data.csv'
                        }, '*');
                        
                        console.log('CSV data sent to parent window');
                    } else {
                        console.error('CSV data is empty or undefined');
                        // Still call original to allow browser download as fallback
                        originalDataTableCSV.call(this);
                    }
                } catch (error) {
                    console.error('Error generating CSV data:', error);
                    // Call original as fallback
                    originalDataTableCSV.call(this);
                }
            };
        }
        
        console.log('CSV download interception setup complete');
    }
}

// Override the popup.show function to intercept the calibration dialog
function setupAutomation() {
    if (typeof wpd !== 'undefined' && wpd.popup && typeof wpd.popup.show === 'function') {
        console.log('Setting up automation...');
        
        const originalPopupShow = wpd.popup.show;
        wpd.popup.show = function(dialogId) {
            console.log(`wpd.popup.show called with dialogId: ${dialogId}`);
            
            if (dialogId === 'calibrate-axes-options') {
                console.log('Auto-selecting 2D XY Axes and calibrating...');
                
                // Small delay to ensure the dialog is rendered
                setTimeout(() => {
                    // Select 2D XY Axes (first item) and calibrate
                    const xyAxesOption = document.getElementById('calibrate-axes-option-xy');
                    if (xyAxesOption) {
                        console.log('Found calibrate-axes-option-xy element.');
                        // Trigger selection
                        xyAxesOption.click();
                        console.log('2D XY Axes selected');
                        
                        // Small delay then calibrate
                        setTimeout(() => {
                            wpd.calibrateAxesDialog.calibrate();
                            console.log('Calibration triggered - ready for point selection');
                        }, 100);
                    } else {
                        console.error('Could not find calibrate-axes-option-xy element.');
                    }
                }, 100);
            }
            
            return originalPopupShow.call(this, dialogId);
        };
        
        // Setup CSV interception
        interceptCSVDownloads();
        
        console.log('Automation setup complete');
        return true;
    } else {
        console.log('WebPlotDigitizer not ready yet, retrying...');
        return false;
    }
}

// Try to set up automation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Keep trying until wpd is available
        const setupInterval = setInterval(() => {
            if (setupAutomation()) {
                clearInterval(setupInterval);
            }
        }, 100);
        
        // Stop trying after 10 seconds
        setTimeout(() => clearInterval(setupInterval), 10000);
    });
} else {
    // DOM is already ready
    const setupInterval = setInterval(() => {
        if (setupAutomation()) {
            clearInterval(setupInterval);
        }
    }, 100);
    
    // Stop trying after 10 seconds
    setTimeout(() => clearInterval(setupInterval), 10000);
}

// Message listener to handle image loading from parent window
window.addEventListener('message', function(event) {
    console.log('Message received:', event.data);
    console.log('Message data type:', typeof event.data);
    console.log('Has action property:', event.data && event.data.action);
    console.log('Action value:', event.data?.action);
    
    if (event.data && event.data.action === 'test') {
        console.log('Test message received:', event.data.message);
        console.log('Iframe communication is working!');
        return;
    }
    
    if (event.data && event.data.action === 'loadImage') {
        const fileData = event.data;
        console.log('Loading image:', fileData.name);
        
        // Create a File object from the ArrayBuffer
        const blob = new Blob([fileData.arrayBuffer], { type: fileData.type });
        const file = new File([blob], fileData.name, { type: fileData.type });
        
        // Initialize WebPlotDigitizer with the file
        if (typeof wpd !== 'undefined' && wpd.imageManager) {
            console.log('Initializing with file');
            wpd.imageManager.initializeFileManager([file], true);
            wpd.imageManager.loadFromFile(file).then(() => {
                console.log('Image loaded successfully');
                wpd.busyNote.close();
                if (!wpd.browserInfo.isElectronBrowser()) {
                    // Auto-open calibration dialog
                    setTimeout(() => {
                        wpd.calibrateAxesDialog.open();
                        console.log('Calibration dialog opened');
                    }, 500);
                }
            }).catch(error => {
                console.error('Error loading image:', error);
            });
        } else {
            console.error('WebPlotDigitizer not initialized');
            console.log('wpd type:', typeof wpd);
            console.log('wpd keys:', wpd ? Object.keys(wpd) : 'undefined');
            console.log('imageManager type:', typeof wpd?.imageManager);
        }
    } else {
        console.log('Message is not for image loading, ignoring...');
    }
});
