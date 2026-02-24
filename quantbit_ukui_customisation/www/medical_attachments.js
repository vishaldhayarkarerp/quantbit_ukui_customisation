const API_KEY = "{{ api_key }}";
const API_SECRET = "{{ api_secret }}";
const DOCTYPE_NAME = 'Medical Assessment';
const FRAPPE_API_BASE = window.location.origin;

let globalRecordName = 'Unknown Document';
let currentFiles = []; // Stores both local and server files
let selectedFiles = []; // Array of selected file objects
let currentCropper = null;
let pendingImageFile = null;
let croppingExistingImage = false;
let existingImageIndex = null;

document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    globalRecordName = urlParams.get('name') || 'Unknown Document';
    document.getElementById('recordDisplay').textContent = globalRecordName;

    fetchExistingFiles();

    // Listen for CSV data from WebPlotDigitizer iframe
    window.addEventListener('message', function (event) {
        if (event.data && event.data.action === 'csvDownload') {
            handleCSVDownload(event.data.csvData, event.data.filename);
        }
    });

    const fileInput = document.getElementById('file-upload');
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);

        // Separate images and non-images
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        const nonImageFiles = files.filter(f => !f.type.startsWith('image/'));

        // Handle non-image files normally
        if (nonImageFiles.length > 0) {
            const nonImageFileObjects = nonImageFiles.map(f => ({
                type: 'local',
                name: f.name,
                fileType: f.type,
                raw: f
            }));
            currentFiles = [...currentFiles.filter(f => f.type !== 'local'), ...nonImageFileObjects];
        }

        // Handle image files with cropper
        if (imageFiles.length > 0) {
            // Process first image file for cropping
            pendingImageFile = imageFiles[0];
            openCropperModal(pendingImageFile);

            // Add remaining image files to queue (if any)
            if (imageFiles.length > 1) {
                const remainingImageFiles = imageFiles.slice(1).map(f => ({
                    type: 'local',
                    name: f.name,
                    fileType: f.type,
                    raw: f
                }));
                currentFiles = [...currentFiles.filter(f => f.type !== 'local'), ...remainingImageFiles];
            }
        }

        // Update file list if non-image files were added
        if (nonImageFiles.length > 0 || imageFiles.length > 1) {
            renderFileList();
        }

        // Clear file input
        e.target.value = '';
    });

    const getDataPointsBtn = document.getElementById('get-data-points-btn');
    const wpdIframe = document.getElementById('wpd-iframe');

    getDataPointsBtn.addEventListener('click', function () {
        if (selectedFiles.length === 0) {
            alert('Please select at least one image file from the list below.');
            return;
        }

        // Start processing from the first selected file
        processNextFile(0);
    });

    // Function to process files sequentially
    window.processNextFile = async function (index) {
        if (index >= selectedFiles.length) {
            alert('All selected files have been processed!');
            location.reload();
            return;
        }

        const fileToProcess = selectedFiles[index];

        wpdIframe.style.display = 'block';

        // Load the ArrayBuffer
        let arrayBuffer;
        try {
            if (fileToProcess.type === 'local') {
                arrayBuffer = await fileToProcess.raw.arrayBuffer();
            } else {
                const resp = await fetch(fileToProcess.url);
                arrayBuffer = await resp.arrayBuffer();
            }
        } catch (e) {
            console.error('Error loading file data:', e);
            alert(`Failed to load file: ${fileToProcess.name}. Skipping...`);
            processNextFile(index + 1);
            return;
        }

        // We need to ensure the iframe is ready or re-use the existing one
        // If it's already loaded, we can just postMessage
        if (wpdIframe.contentWindow && wpdIframe.contentWindow.wpd) {
            injectAndLoad(wpdIframe, fileToProcess, arrayBuffer, index);
        } else {
            wpdIframe.onload = function () {
                const waitForWPD = setInterval(() => {
                    if (wpdIframe.contentWindow && wpdIframe.contentWindow.wpd) {
                        clearInterval(waitForWPD);
                        injectAndLoad(wpdIframe, fileToProcess, arrayBuffer, index);
                    }
                }, 500);
            };
            // If already complete but onload didn't fire (cached)
            if (wpdIframe.contentWindow?.document?.readyState === 'complete') {
                // trigger load logic manually if needed, or just wait for interval
            }
        }
    };

    function injectAndLoad(iframe, file, buffer, index) {
        // We always try to inject existing script or ensure it's there
        const script = iframe.contentWindow.document.createElement('script');
        script.src = '/wpd_automation.js';
        script.onload = function () {
            sendLoadMessage(iframe, file, buffer, index);
        };
        // If script is already there, we might not need to append, but appending again usually interprets it again 
        // or we can just send message. Safest is to append or check.
        // For simplicity, we just append. WPD automation script handles re-injection gracefully (console log).
        iframe.contentWindow.document.head.appendChild(script);

        // Fallback if script load event doesn't fire (e.g. already cached/loaded)
        setTimeout(() => sendLoadMessage(iframe, file, buffer, index), 500);
    }

    function sendLoadMessage(iframe, file, buffer, currentIndex) {
        // Store current index in a data attribute or global variable to track
        iframe.setAttribute('data-current-index', currentIndex);

        iframe.contentWindow.postMessage({ action: 'setRecordName', recordName: globalRecordName }, '*');
        iframe.contentWindow.postMessage({
            action: 'loadImage',
            name: file.name,
            type: file.fileType || 'image/png',
            arrayBuffer: buffer
        }, '*');
    }
});

async function handleCSVDownload(csvData, filename) {
    const wpdIframe = document.getElementById('wpd-iframe');
    const currentIndex = parseInt(wpdIframe.getAttribute('data-current-index') || '0');

    // Use the name of the file currently being processed
    const currentFile = selectedFiles[currentIndex];
    const baseName = currentFile ? currentFile.name : globalRecordName;

    const blob = new Blob([csvData], { type: 'text/csv' });
    const csvFilename = baseName + '_digitized.csv';
    const file = new File([blob], csvFilename, { type: 'text/csv' });

    try {
        const fileUrl = await uploadFileToFrappe(file);
        await attachFileToRecord(fileUrl, csvFilename);

        // Show success message
        alert(`Data for ${baseName} saved and attached to the Medical Assessment record!`);

        // Move to next file
        processNextFile(currentIndex + 1);

    } catch (error) {
        console.error('Error handling CSV download:', error);
        alert('Error saving CSV to record: ' + error.message);
    }
}

async function uploadFileToFrappe(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_private', 0);
    const resp = await fetch(`${FRAPPE_API_BASE}/api/method/upload_file`, {
        method: 'POST',
        headers: { 'Authorization': `token ${API_KEY}:${API_SECRET}` },
        body: formData
    });
    const data = await resp.json();
    return data.message.file_url;
}

async function attachFileToRecord(fileUrl, filename) {
    try {
        const getResp = await fetch(`${FRAPPE_API_BASE}/api/resource/${DOCTYPE_NAME}/${globalRecordName}`, {
            headers: { 'Authorization': `token ${API_KEY}:${API_SECRET}` }
        });
        const doc = await getResp.json();

        if (!doc.data) {
            throw new Error('Failed to fetch existing attachments');
        }

        const attachments = doc.data.attachments || [];
        attachments.push({ name_of_document: filename, attachment: fileUrl });

        const putResp = await fetch(`${FRAPPE_API_BASE}/api/resource/${DOCTYPE_NAME}/${globalRecordName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `token ${API_KEY}:${API_SECRET}` },
            body: JSON.stringify({ attachments: attachments })
        });

        const result = await putResp.json();

        if (!result.data) {
            throw new Error('Attachment update failed');
        }

        return result.data;
    } catch (error) {
        console.error('Error in attachFileToRecord:', error);
        throw error;
    }
}

async function fetchExistingFiles() {
    try {
        const filters = JSON.stringify([
            ["attached_to_doctype", "=", DOCTYPE_NAME],
            ["attached_to_name", "=", globalRecordName]
        ]);
        const fields = JSON.stringify(["file_name", "file_url", "is_private"]);
        const url = `${FRAPPE_API_BASE}/api/resource/File?filters=${filters}&fields=${fields}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `token ${API_KEY}:${API_SECRET}` }
        });
        const result = await response.json();

        if (result.data && result.data.length > 0) {
            const serverFiles = result.data.map(f => ({
                type: 'server',
                name: f.file_name,
                url: f.file_url,
                fileType: f.file_name.endsWith('.csv') ? 'text/csv' : 'image/png'
            }));
            currentFiles = [...serverFiles, ...currentFiles.filter(f => f.type === 'local')];
        }
        renderFileList();
    } catch (e) {
        console.error(e);
        document.getElementById('fileList').innerHTML = '<div class="text-red-500 italic">Error loading files.</div>';
    }
}

function selectFile(index) {
    const file = currentFiles[index];
    const existingIndex = selectedFiles.findIndex(f =>
        (f.type === 'server' && f.url === file.url) ||
        (f.type === 'local' && f.name === file.name)
    );

    if (existingIndex > -1) {
        selectedFiles.splice(existingIndex, 1);
    } else {
        selectedFiles.push(file);
    }
    renderFileList();
}

function renderFileList() {
    const list = document.getElementById('fileList');
    const btn = document.getElementById('get-data-points-btn');
    list.innerHTML = '';

    if (currentFiles.length === 0) {
        list.innerHTML = '<div class="text-gray-500 italic">No files currently attached.</div>';
        btn.textContent = 'Get Data Points';
        return;
    }

    // Update button text
    btn.textContent = selectedFiles.length > 0
        ? `Get Data Points (${selectedFiles.length})`
        : 'Get Data Points';

    list.innerHTML = currentFiles.map((f, i) => {
        const isSelected = selectedFiles.some(sf =>
            (f.type === 'server' && f.url === sf.url) ||
            (f.type === 'local' && f.name === sf.name)
        );

        const cardClass = isSelected
            ? "border-pink-500 bg-pink-900/40"
            : "border-gray-700 bg-gray-800 hover:bg-gray-700";

        return `
            <div onclick="selectFile(${i})" class="flex justify-between items-center p-3 border rounded mt-2 cursor-pointer transition ${cardClass}">
                <div class="flex items-center gap-3">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} class="w-4 h-4 accent-pink-600" onclick="event.stopPropagation(); selectFile(${i})">
                    <span class="text-sm">${f.type === 'server' ? '✅' : '⏳'} ${f.name}</span>
                </div>
                <div class="flex gap-4">
                    ${isImageFile(f) ? `<button onclick="event.stopPropagation(); cropExistingImage(${i})" class="text-xs text-green-400 hover:text-green-300 hover:underline">Crop</button>` : ''}
                    ${f.url ? `<a href="${f.url}" target="_blank" class="text-xs text-blue-400 hover:underline" onclick="event.stopPropagation()">View</a>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Helper function to check if file is an image
function isImageFile(file) {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    return imageTypes.includes(file.fileType) ||
        (file.name && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name));
}

// Function to crop existing image
function cropExistingImage(index) {
    const file = currentFiles[index];
    if (!isImageFile(file)) {
        alert('This file is not an image and cannot be cropped.');
        return;
    }

    croppingExistingImage = true;
    existingImageIndex = index;

    if (file.type === 'server') {
        // For server files, load from URL
        openCropperModalForServerImage(file);
    } else {
        // For local files, use existing function
        pendingImageFile = file.raw;
        openCropperModal(file.raw);
    }
}

// Cropper Modal Functions
function openCropperModal(file) {
    const modal = document.getElementById('cropperModal');
    const image = document.getElementById('cropperImage');
    const filenameInput = document.getElementById('croppedFileName');
    const reader = new FileReader();

    reader.onload = function (e) {
        image.src = e.target.result;
        // Set the filename input to original filename (without extension for editing)
        const originalName = file.name.replace(/\.[^/.]+$/, "");
        filenameInput.value = originalName;
        modal.classList.remove('hidden');

        // Initialize Cropper.js
        setTimeout(() => {
            currentCropper = new Cropper(image, {
                aspectRatio: NaN, // Free aspect ratio
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.8,
                restore: false,
                guides: true,
                center: true,
                highlight: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: true,
            });
        }, 100);
    };

    reader.readAsDataURL(file);
}

function closeCropperModal() {
    const modal = document.getElementById('cropperModal');
    const filenameInput = document.getElementById('croppedFileName');

    if (currentCropper) {
        currentCropper.destroy();
        currentCropper = null;
    }

    modal.classList.add('hidden');
    filenameInput.value = '';
    pendingImageFile = null;
    croppingExistingImage = false;
    existingImageIndex = null;
}

function openCropperModalForServerImage(file) {
    const modal = document.getElementById('cropperModal');
    const image = document.getElementById('cropperImage');
    const filenameInput = document.getElementById('croppedFileName');

    image.src = file.url;
    // Set the filename input to original filename (without extension for editing)
    const originalName = file.name.replace(/\.[^/.]+$/, "");
    filenameInput.value = originalName;
    modal.classList.remove('hidden');

    // Initialize Cropper.js for server image
    setTimeout(() => {
        currentCropper = new Cropper(image, {
            aspectRatio: NaN, // Free aspect ratio
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            restore: false,
            guides: true,
            center: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: true,
        });
    }, 100);
}

async function cropAndSaveImage() {
    if (!currentCropper) {
        alert('No image to crop');
        return;
    }

    if (croppingExistingImage && existingImageIndex === null) {
        alert('No existing image selected for cropping');
        return;
    }

    if (!croppingExistingImage && !pendingImageFile) {
        alert('No new image to crop');
        return;
    }

    try {
        // Get cropped canvas
        const canvas = currentCropper.getCroppedCanvas({
            maxWidth: 1920,
            maxHeight: 1080,
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        // Convert canvas to blob
        canvas.toBlob(async function (blob) {
            if (!blob) {
                alert('Failed to crop image');
                return;
            }

            // Get custom filename from input field
            const filenameInput = document.getElementById('croppedFileName');
            const customFilename = filenameInput.value.trim();

            if (croppingExistingImage) {
                // Handle existing image replacement
                const originalFile = currentFiles[existingImageIndex];
                const fileExtension = originalFile.name.split('.').pop();

                // Use custom filename or original filename
                const finalFilename = customFilename ?
                    `${customFilename}.${fileExtension}` :
                    originalFile.name;

                const croppedFile = new File([blob], finalFilename, {
                    type: originalFile.fileType || 'image/jpeg'
                });

                // Replace the existing image with cropped version
                const fileObject = {
                    type: 'local',
                    name: finalFilename,
                    fileType: croppedFile.type,
                    raw: croppedFile
                };

                currentFiles[existingImageIndex] = fileObject;

                // Update selected files if this image was selected
                const selectedIdx = selectedFiles.findIndex(f =>
                    (f.type === 'server' && f.url === originalFile.url) ||
                    (f.type === 'local' && f.name === originalFile.name)
                );

                if (selectedIdx > -1) {
                    selectedFiles[selectedIdx] = fileObject;
                }

                renderFileList();
                closeCropperModal();
                alert('Image cropped and replaced successfully!');

            } else {
                // Handle new image upload
                const fileExtension = pendingImageFile.name.split('.').pop();

                // Use custom filename or original filename
                const finalFilename = customFilename ?
                    `${customFilename}.${fileExtension}` :
                    pendingImageFile.name;

                const croppedFile = new File([blob], finalFilename, {
                    type: pendingImageFile.type
                });

                const fileObject = {
                    type: 'local',
                    name: finalFilename,
                    fileType: croppedFile.type,
                    raw: croppedFile
                };

                currentFiles = [...currentFiles.filter(f => f.type !== 'local'), fileObject];
                renderFileList();
                closeCropperModal();
                alert('Image cropped and added successfully!');
            }

        }, croppingExistingImage ? currentFiles[existingImageIndex].fileType || 'image/jpeg' : pendingImageFile.type, 0.9);

    } catch (error) {
        console.error('Error cropping image:', error);
        alert('Error cropping image: ' + error.message);
    }
}