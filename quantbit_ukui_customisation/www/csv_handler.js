// CSV Handler for WebPlotDigitizer Integration
// Handles CSV downloads and uploads to Frappe

console.log('CSV Handler loaded');

// Listen for CSV data from WebPlotDigitizer iframe
window.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'csvDownload') {
        console.log('CSV download intercepted:', event.data);
        handleCSVDownload(event.data.csvData, event.data.filename);
    }
});

// Handle CSV download and upload to Frappe
function handleCSVDownload(csvData, filename) {
    console.log('Handling CSV download:', filename);
    console.log('CSV data length:', csvData.length);
    
    // Create a Blob from the CSV data
    const blob = new Blob([csvData], { type: 'text/csv' });
    const file = new File([blob], filename, { type: 'text/csv' });
    
    // Get API credentials
    const API_KEY = "{{ api_key }}";
    const API_SECRET = "{{ api_secret }}";
    const currentRecordName = "{{ doc.name }}";
    
    console.log('Uploading CSV to Frappe for record:', currentRecordName);
    
    // Upload the CSV file to Frappe
    uploadFile(file, API_KEY, API_SECRET, "/api/method/upload_file")
        .then(fileUrl => {
            console.log('CSV uploaded successfully:', fileUrl);
            
            // Attach the file to the current record
            return attachFileToRecord(currentRecordName, fileUrl, filename, API_KEY, API_SECRET);
        })
        .then(() => {
            console.log('CSV attached to record successfully');
            
            // Show custom confirm dialog with automatic popup trigger
            const userConfirmed = confirm('CSV data has been downloaded and attached to the record!\n\nClick OK to automatically open the image loader for the next image, or Cancel to close.');
            
            if (userConfirmed) {
                // Trigger WebPlotDigitizer popup for loading new image
                console.log('User confirmed, triggering WebPlotDigitizer popup');
                setTimeout(() => {
                    // Try to trigger the popup using wpd object
                    try {
                        const wpdIframe = document.getElementById('wpd-iframe');
                        if (wpdIframe && wpdIframe.contentWindow && wpdIframe.contentWindow.wpd) {
                            // Show the load new image popup
                            wpdIframe.contentWindow.wpd.popup.show('loadNewImage');
                            console.log('WebPlotDigitizer popup triggered successfully');
                            
                            // Wait for popup to load and then automatically upload second image
                            setTimeout(() => {
                                const fileUploadMgr = window._fileUploadManager || new FileUploadManager();
                                const files = fileUploadMgr.files;
                                console.log('Available files:', files);
                                
                                if (files && files.length >= 2) {
                                    const secondImage = files[1]; // Get the second uploaded image
                                    console.log('Auto-uploading second image:', secondImage.name);
                                    
                                    // Find the file input in the iframe and set the file
                                    const iframeDoc = wpdIframe.contentWindow.document;
                                    const fileLoadBox = iframeDoc.getElementById('fileLoadBox');
                                    
                                    if (fileLoadBox) {
                                        // Create a DataTransfer object to set the file
                                        const dataTransfer = new DataTransfer();
                                        dataTransfer.items.add(secondImage);
                                        fileLoadBox.files = dataTransfer.files;
                                        
                                        // Trigger the onchange event to load the image
                                        const event = new Event('change', { bubbles: true });
                                        fileLoadBox.dispatchEvent(event);
                                        
                                        console.log('Second image automatically uploaded to WebPlotDigitizer');
                                    } else {
                                        console.error('fileLoadBox not found in iframe');
                                    }
                                } else {
                                    console.log('No second image found for auto-upload');
                                }
                            }, 1000); // Wait for popup to fully load
                        } else {
                            console.log('WebPlotDigitizer not available, showing iframe manually');
                            // Fallback: show the iframe and trigger load new image
                            const wpdIframe = document.getElementById('wpd-iframe');
                            if (wpdIframe) {
                                wpdIframe.style.display = 'block';
                                // Wait for iframe to load and then trigger
                                wpdIframe.onload = function() {
                                    setTimeout(() => {
                                        if (wpdIframe.contentWindow && wpdIframe.contentWindow.wpd && wpdIframe.contentWindow.wpd.popup) {
                                            wpdIframe.contentWindow.wpd.popup.show('loadNewImage');
                                            
                                            // Auto-upload second image after popup loads
                                            setTimeout(() => {
                                                const fileUploadMgr = window._fileUploadManager || new FileUploadManager();
                                                const files = fileUploadMgr.files;
                                                if (files && files.length >= 2) {
                                                    const secondImage = files[1];
                                                    const iframeDoc = wpdIframe.contentWindow.document;
                                                    const fileLoadBox = iframeDoc.getElementById('fileLoadBox');
                                                    
                                                    if (fileLoadBox) {
                                                        const dataTransfer = new DataTransfer();
                                                        dataTransfer.items.add(secondImage);
                                                        fileLoadBox.files = dataTransfer.files;
                                                        fileLoadBox.dispatchEvent(new Event('change', { bubbles: true }));
                                                        console.log('Second image automatically uploaded to WebPlotDigitizer');
                                                    }
                                                }
                                            }, 1000);
                                        }
                                    }, 1000);
                                };
                            }
                        }
                    } catch (error) {
                        console.error('Error triggering WebPlotDigitizer popup:', error);
                        alert('Please click the "Get Data Points" button again to load the next image.');
                    }
                }, 500);
            } else {
                console.log('User cancelled automatic popup');
            }
        })
        .catch(error => {
            console.error('Error handling CSV download:', error);
            alert('Error saving CSV to record. Please try downloading manually.');
        });
}

// Upload file to Frappe
function uploadFile(file, apiKey, apiSecret, methodUrl) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_private', 0);
        
        fetch(methodUrl.replace("/api/resource", "") + "/api/method/upload_file", {
            method: 'POST',
            headers: {
                'Authorization': 'token ' + apiKey + ':' + apiSecret
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                resolve(data.message.file_url);
            } else {
                reject(new Error('Upload failed'));
            }
        })
        .catch(reject);
    });
}

// Attach file to record (append to existing attachments)
function attachFileToRecord(recordName, fileUrl, filename, apiKey, apiSecret) {
    return new Promise((resolve, reject) => {
        // First, fetch the current record to get existing attachments
        fetch(`/api/resource/Medical Assessment/${recordName}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'token ' + apiKey + ':' + apiSecret
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.data) {
                const existingAttachments = data.data.attachments || [];
                console.log('Existing attachments:', existingAttachments);
                
                // Add the new attachment to the existing list
                const newAttachment = {
                    name_of_document: filename,
                    attachment: fileUrl
                };
                
                const updatedAttachments = [...existingAttachments, newAttachment];
                console.log('Updated attachments list:', updatedAttachments);
                
                // Update the record with all attachments (existing + new)
                return fetch(`/api/resource/Medical Assessment/${recordName}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'token ' + apiKey + ':' + apiSecret
                    },
                    body: JSON.stringify({
                        attachments: updatedAttachments
                    })
                });
            } else {
                reject(new Error('Failed to fetch existing attachments'));
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.data) {
                resolve(data.data);
            } else {
                reject(new Error('Attachment update failed'));
            }
        })
        .catch(reject);
    });
}
