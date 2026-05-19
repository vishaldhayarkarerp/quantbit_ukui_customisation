document.addEventListener('DOMContentLoaded', function () {
    // --- Global Variables ---
    window.globalRecordName = 'Unknown Document';
    window.hasUnsavedChanges = false;
    window.isLoadingDocument = false;

    // --- Test API Credentials Access ---
    debugCredentials(); // Debug credentials on page load

    // --- Element Selectors ---
    const medicalForm = document.getElementById('medicalForm');
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.section');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const resetBtn = document.getElementById('resetBtn');
    const allModalOkBtns = document.querySelectorAll('.modal-ok-btn');
    const yesNoGroups = document.querySelectorAll('.yes-no-group');

    // --- Selectors for reusable text modal ---
    const specifyTextModal = document.getElementById('specifyTextModal');
    const specifyModalTitle = document.getElementById('specifyModalTitle');
    const modalTextInput = document.getElementById('modalTextInput');
    const modalResetBtn = document.getElementById('modalResetBtn');

    // --- Specific Modal Element Selectors ---
    const multipleTypeSelect = document.getElementById('multiple_type_modal');
    const chorionicityDiv = document.getElementById('chorionicityDiv');
    const chorionicitySelect = document.getElementById('chorionicity_select_modal');
    const zygosityDiv = document.getElementById('zygosityDiv');

    const raceCategorySelect = document.getElementById('raceCategory');
    const raceSubOptionsDiv = document.getElementById('raceSubOptions');
    const raceSubCategorySelect = document.getElementById('raceSubCategory');
    const raceLookupBtn = document.getElementById('raceLookupBtn');

    const numPreviousPregnanciesInput = document.querySelector('input[name="previous_pregnancies"]');
    const previousPregnanciesTableBody = document.getElementById("previousPregnanciesTableBody");

    // LMP
    const lmpInput = document.getElementById('lmpInput');
    const lmpOptionsBtn = document.getElementById('lmpOptionsBtn');
    const lmpOptionHidden = document.getElementById('lmpOptionHidden');
    const lmpModal = document.getElementById('lmpModal');
    const modalOpeners = document.querySelectorAll('[data-modal-id]');

    // Hospital related elements
    const hospitalInput = document.getElementById('hospitalInput');
    const hospitalLookupBtn = document.getElementById('hospitalLookupBtn');
    const hospitalModal = document.getElementById('hospitalModal');
    const hospitalSearchInput = document.getElementById('hospitalSearchInput');
    const hospitalOptions = document.getElementById('hospitalOptions');
    const hospitalSelectBtn = document.getElementById('hospitalSelectBtn');
    const hospitalHidden = document.getElementById('hospital_hidden');


    // Add Hospital related elements
    const toggleAddHospital = document.getElementById('toggleAddHospital');
    const addHospitalForm = document.getElementById('addHospitalForm');
    const newHospitalId = document.getElementById('newHospitalId');
    const newHospitalName = document.getElementById('newHospitalName');
    const cancelAddHospital = document.getElementById('cancelAddHospital');
    const saveNewHospital = document.getElementById('saveNewHospital');

    // --- Modal Open/Close Handlers with SCROLL LOCK ---
    function openModal(modal) {
        if (!modal) return;
        if (modal.id !== 'specifyTextModal' && modal.id !== 'previousPregnanciesModal' && modal.id !== 'hospitalModal') {
            loadCheckboxModalState(modal);
        }
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        if (modal.id === 'specifyTextModal') {
            modal.removeAttribute('data-target-id');
            modal.removeAttribute('data-trigger-id');
        }
    }

    // --- Logic for the "Specify Text" Modal ---
    function openSpecifyTextModal(triggerBtn) {
        const targetId = triggerBtn.dataset.targetId;
        const title = triggerBtn.dataset.title;
        const targetTextarea = document.getElementById(targetId);

        if (!targetTextarea || !specifyTextModal) return;

        specifyModalTitle.textContent = title;
        modalTextInput.value = targetTextarea.value;

        specifyTextModal.dataset.targetId = targetId;
        specifyTextModal.dataset.triggerId = triggerBtn.id;

        openModal(specifyTextModal);
    }

    function saveSpecifyTextState() {
        const targetId = specifyTextModal.dataset.targetId;
        const triggerId = specifyTextModal.dataset.triggerId;
        const targetTextarea = document.getElementById(targetId);
        const triggerBtn = document.getElementById(triggerId);

        if (!targetTextarea || !triggerBtn) return;

        targetTextarea.value = modalTextInput.value;

        if (targetTextarea.value.trim() !== '') {
            triggerBtn.textContent = 'View/Edit...'; // UPDATED TEXT
            triggerBtn.classList.add('active');
        } else {
            triggerBtn.textContent = 'Specify...'; // UPDATED TEXT
            triggerBtn.classList.remove('active');
        }
    }

    // LMP field and modal logic
    function setupLmpLogic() {
        const lmpCheckboxes = lmpModal ? lmpModal.querySelectorAll('.form-checkbox') : [];

        lmpCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function () {
                if (this.checked) {
                    lmpInput.disabled = true;
                    // Clear the flatpickr instance if a checkbox is selected
                    if (lmpInput._flatpickr) {
                        lmpInput._flatpickr.clear();
                    }
                    lmpCheckboxes.forEach(otherCheckbox => {
                        if (otherCheckbox !== this) {
                            otherCheckbox.checked = false;
                        }
                    });
                    lmpOptionHidden.value = this.value;
                } else {
                    lmpInput.disabled = false;
                    lmpOptionHidden.value = '';
                }
            });
        });
    }


    function setupDatePickers() {

        flatpickr("#lmpInput", {
            altInput: true,
            altFormat: "F j, Y",
            dateFormat: "Y-m-d",
            maxDate: "today",
            onChange: function (selectedDates, dateStr, instance) {
                if (dateStr) {
                    lmpOptionsBtn.classList.remove('active');
                    const lmpCheckboxes = lmpModal ? lmpModal.querySelectorAll('.form-checkbox') : [];
                    lmpCheckboxes.forEach(cb => cb.checked = false);
                    lmpOptionHidden.value = '';
                }
            },
        });

        // Setup for the DATETIME pickers
        flatpickr(".datetime-picker", {
            enableTime: true,
            altInput: true,
            altFormat: "F j, Y at h:i K",
            dateFormat: "Y-m-d H:i",
            maxDate: new Date()
        });
    }


    function setupInputValidation() {
        const numberInputs = document.querySelectorAll('input[type="number"]');
        const exceptions = ['arterial_base_excess', 'venous_base_excess'];

        numberInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                if (exceptions.includes(e.target.name)) return;
                if (parseFloat(e.target.value) < 0) e.target.value = '';
            });
        });
    }

    function loadCheckboxModalState(modal) {
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length === 0) return;
        const checkboxListName = checkboxes[0].name;
        const hiddenInput = medicalForm.querySelector(`input[name="${checkboxListName}"]`);
        if (!hiddenInput) return;
        const selectedValues = hiddenInput.value ? hiddenInput.value.split(',') : [];
        checkboxes.forEach(cb => cb.checked = selectedValues.includes(cb.value));
    }

    function saveStateAndClose(modal) {
        if (modal.id === 'specifyTextModal') saveSpecifyTextState();
        else if (modal.id === 'raceModal') saveRaceModalState();
        else if (modal.id === 'multiplePregnancyModal') saveMultiplePregnancyModalState();
        else if (modal.id === 'hospitalModal') saveHospitalModalState();
        else if (modal.id !== 'previousPregnanciesModal') saveCheckboxModalState(modal);
        closeModal(modal);
    }

    function saveCheckboxModalState(modal) {
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length === 0) return;
        const checkboxListName = checkboxes[0].name;
        const hiddenInput = medicalForm.querySelector(`input[name="${checkboxListName}"]`);
        if (!hiddenInput) return;
        hiddenInput.value = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value).join(',');
        const triggerBtn = document.querySelector(`.yes-btn[data-modal-id="${modal.id}"]`);
        if (triggerBtn) {
            const yesBtnInGroup = triggerBtn.closest('.yes-no-group')?.querySelector('.yes-btn');
            if (yesBtnInGroup) yesBtnInGroup.innerHTML = hiddenInput.value ? 'Show' : 'YES';
        }
    }

    function saveRaceModalState() {
        const categoryText = raceCategorySelect.options[raceCategorySelect.selectedIndex].text;
        const subCategoryText = raceSubCategorySelect.options[raceSubCategorySelect.selectedIndex].text;
        document.getElementById('race_category_hidden').value = raceCategorySelect.value;
        document.getElementById('race_subcategory_hidden').value = raceSubCategorySelect.value;
        if (raceLookupBtn) {
            const hasSelection = raceCategorySelect.value !== '';
            if (hasSelection) {
                raceLookupBtn.textContent = `${categoryText}${raceSubCategorySelect.value ? ` / ${subCategoryText}` : ''}`;
                raceLookupBtn.classList.add('active');
            } else {
                raceLookupBtn.textContent = 'Select Race...';
                raceLookupBtn.classList.remove('active');
            }
        }
    }

    function saveMultiplePregnancyModalState() {
        document.getElementById('multiple_pregnancy_type_hidden').value = multipleTypeSelect.value;
        document.getElementById('multiple_pregnancy_chorionicity_hidden').value = chorionicitySelect.value;
        document.getElementById('multiple_pregnancy_zygosity_hidden').value = document.getElementById('zygosity_select_modal').value;
        const triggerBtn = document.querySelector('.yes-btn[data-modal-id="multiplePregnancyModal"]');
        if (triggerBtn) triggerBtn.innerHTML = multipleTypeSelect.value ? 'Show' : 'YES';
    }

    function saveHospitalModalState() {
        const selectedOption = hospitalOptions.querySelector('.hospital-option.selected');
        if (selectedOption) {
            const hospitalValue = selectedOption.dataset.value;
            const hospitalName = selectedOption.textContent.trim();

            hospitalInput.value = hospitalName; // Show hospital name in the main field
            hospitalHidden.value = hospitalValue; // Save hospital ID to hidden field for reference

            if (hospitalLookupBtn) {
                hospitalLookupBtn.textContent = hospitalName;
                hospitalLookupBtn.classList.add('active');
            }
        }
    }

    async function handleAddNewHospital() {
        const hospitalId = newHospitalId.value.trim();
        const hospitalName = newHospitalName.value.trim();

        if (!hospitalId || !hospitalName) {
            alert('Please enter both Hospital ID and Hospital Name');
            return;
        }

        try {
            // Create new hospital document
            const response = await fetch('/api/method/quantbit_ukui_customisation.api.create_hospital', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    hospital_id: hospitalId,
                    hospital_name: hospitalName,
                    doctype: 'Hospital'
                })
            });

            if (response.ok) {
                const result = await response.json();

                // Add the new hospital to the options list
                const newOption = document.createElement('div');
                newOption.className = 'hospital-option p-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600';
                newOption.dataset.value = hospitalId;
                newOption.textContent = `${hospitalName} (${hospitalId})`;
                newOption.addEventListener('click', () => {
                    document.querySelectorAll('.hospital-option').forEach(opt => opt.classList.remove('selected'));
                    newOption.classList.add('selected');
                });

                hospitalOptions.appendChild(newOption);

                // Clear form and hide
                newHospitalId.value = '';
                newHospitalName.value = '';
                addHospitalForm.classList.add('hidden');

                // Auto-select the new hospital
                document.querySelectorAll('.hospital-option').forEach(opt => opt.classList.remove('selected'));
                newOption.classList.add('selected');

                alert('Hospital added successfully!');

                // Auto-select and close modal
                saveHospitalModalState();
                closeModal(hospitalModal);
            } else {
                throw new Error('Failed to create hospital');
            }
        } catch (error) {
            console.error('Error adding hospital:', error);
            alert('Failed to add hospital. Please try again.');
        }
    }

    function handleYesNoClick(button) {
        const group = button.closest('.yes-no-group');
        const targetName = button.dataset.target;
        const hiddenStatusInput = medicalForm.querySelector(`input[name="${targetName}"]`) || medicalForm.querySelector(`input[name="${targetName}_toggle"]`);
        if (hiddenStatusInput) hiddenStatusInput.value = button.dataset.value;
        group.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        if (button.dataset.value === 'no') {
            const yesBtn = group.querySelector('.yes-btn[data-modal-id]');
            if (yesBtn) {
                yesBtn.innerHTML = 'YES';
                const modal = document.getElementById(yesBtn.dataset.modalId);
                if (modal.id === 'multiplePregnancyModal') {
                    multipleTypeSelect.value = '';
                    saveMultiplePregnancyModalState();
                    handleMultipleTypeChange();
                } else {
                    const checkboxes = modal?.querySelectorAll('input[type="checkbox"]');
                    if (checkboxes?.length > 0) {
                        const hiddenListInput = medicalForm.querySelector(`input[name="${checkboxes[0].name}"]`);
                        if (hiddenListInput) hiddenListInput.value = '';
                    }
                }
            }
        }
    }

    function handleMultipleTypeChange() {
        if (!multipleTypeSelect) return;
        const type = multipleTypeSelect.value;
        chorionicityDiv.classList.toggle('hidden', !type);
        zygosityDiv.classList.toggle('hidden', !type);
        if (type) {
            const trichorionicOption = chorionicitySelect.querySelector('option[value="Trichorionic"]');
            if (trichorionicOption) {
                trichorionicOption.disabled = type === 'twins';
                if (type === 'twins' && chorionicitySelect.value === 'Trichorionic') chorionicitySelect.value = '';
            }
        }
    }

    function handleRaceCategoryChange() {
        if (!raceCategorySelect) return;
        const options = {
            "White": ["English, Welsh, Scottish, Northern Irish or British", "Irish", "Gypsy or Irish Traveller", "Other White"],
            "Mixed or Multiple ethnic groups": ["White and Black Caribbean", "White and Black African", "White and Asian", "Other Mixed or Multiple ethnic background"],
            "Asian or Asian British": ["Indian", "Pakistani", "Bangladeshi", "Chinese", "Other Asian"],
            "Black, African, Caribbean or Black British": ["African", "Caribbean", "Other Black, African or Caribbean background"],
            "Other ethnic group": ["Arab", "Other ethnic group"]
        };
        const category = raceCategorySelect.value;
        const subOptions = options[category] || [];
        raceSubCategorySelect.innerHTML = '<option value="" hidden>Please select...</option>';
        subOptions.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt;
            optionEl.textContent = opt;
            raceSubCategorySelect.appendChild(optionEl);
        });
        raceSubOptionsDiv.classList.toggle('hidden', subOptions.length === 0);
    }

    function setupPreviousPregnancies() {
        if (!numPreviousPregnanciesInput) return;
        const btn = document.getElementById('previousPregnanciesBtn');
        if (!btn) return;
        btn.addEventListener("click", () => {
            const numPreg = parseInt(numPreviousPregnanciesInput.value) || 0;
            previousPregnanciesTableBody.innerHTML = '';
            if (numPreg === 0) {
                previousPregnanciesTableBody.innerHTML = '<tr><td colspan="6" class="p-2 text-center text-gray-400">No previous pregnancies entered.</td></tr>';
            } else {
                for (let i = 1; i <= numPreg; i++) {
                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td class="p-2 border border-gray-600">${i}</td>
                        <td class="p-2 border border-gray-600">
                            <input type="text" name="prev_preg_${i}_problems" class="form-input" placeholder="Specify problems">
                        </td>
                        <td class="p-2 border border-gray-600">
                            <select name="prev_preg_${i}_outcome" class="form-select">
                                <option value="">Select</option>
                                <option value="Live Birth">Live Birth</option>
                                <option value="Stillbirth">Stillbirth</option>
                                <option value="Miscarriage">Miscarriage</option>
                                <option value="IUD">IUD</option>
                                <option value="Other">Other</option>
                            </select>
                        </td>
                        <td class="p-2 border border-gray-600">
                            <select name="prev_preg_${i}_mode" class="form-select">
                                <option value="">Select</option>
                                <option value="Vaginal">Vaginal</option>
                                <option value="C-Section">C-Section</option>
                                <option value="Instrumental">Instrumental</option>
                                <option value="Other">Other</option>
                            </select>
                        </td>
                        <td class="p-2 border border-gray-600">
                            <input type="number" name="prev_preg_${i}_weight" class="form-input" placeholder="grams">
                        </td>
                        <td class="p-2 border border-gray-600">
                            <input type="number" name="prev_preg_${i}_ga" class="form-input" placeholder="weeks">
                        </td>
                    `;

                    previousPregnanciesTableBody.appendChild(row);
                }
            }
        });
    }

    // Hospital API functions
    async function searchHospitals(query = '') {
        try {
            const response = await fetch('/api/method/frappe.desk.search.search_link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doctype: 'Hospital',
                    txt: query
                })
            });

            if (!response.ok) {
                throw new Error('Failed to search hospitals');
            }

            const data = await response.json();
            return data.message || [];
        } catch (error) {
            console.error('Error searching hospitals:', error);
            return [];
        }
    }

    async function validateHospital(hospitalName) {
        try {
            const response = await fetch('/api/method/frappe.client.validate_link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doctype: 'Hospital',
                    docname: hospitalName,
                    value: hospitalName
                })
            });

            if (!response.ok) {
                throw new Error('Failed to validate hospital');
            }

            const data = await response.json();
            return data.message;
        } catch (error) {
            console.error('Error validating hospital:', error);
            return null;
        }
    }

    function displayHospitalOptions(hospitals) {
        if (!hospitalOptions) return;

        if (hospitals.length === 0) {
            hospitalOptions.innerHTML = '<div class="text-gray-500 p-4">No hospitals found</div>';
            return;
        }

        hospitalOptions.innerHTML = hospitals.map(hospital => `
            <div class="hospital-option p-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600" 
                 data-value="${hospital.value}">
                <div class="font-medium">${hospital.value}</div>
                ${hospital.description ? `<div class="text-sm text-gray-400">${hospital.description}</div>` : ''}
            </div>
        `).join('');

        // Add click handlers to options
        hospitalOptions.querySelectorAll('.hospital-option').forEach(option => {
            option.addEventListener('click', async () => {
                // Remove previous selection
                hospitalOptions.querySelectorAll('.hospital-option').forEach(opt => {
                    opt.classList.remove('selected', 'bg-gray-600');
                });

                // Add selection to clicked option
                option.classList.add('selected', 'bg-gray-600');

                // Get hospital name and validate immediately
                const hospitalName = option.dataset.value;

                // Validate the selected hospital
                const validation = await validateHospital(hospitalName);
                if (validation && validation.name) {
                    // Save the selection and close modal
                    saveHospitalModalState();
                    closeModal(hospitalModal);
                } else {
                    alert('Invalid hospital selection. Please try again.');
                }
            });
        });
    }

    async function setupHospitalModal() {
        if (!hospitalModal || !hospitalSearchInput) return;

        // Setup search functionality
        let searchTimeout;
        hospitalSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const query = e.target.value.trim();
                const hospitals = await searchHospitals(query);
                displayHospitalOptions(hospitals);
            }, 300);
        });

        // Setup modal open handler to load hospitals
        hospitalLookupBtn?.addEventListener('click', async () => {
            // Clear search and load initial hospitals
            hospitalSearchInput.value = '';
            const hospitals = await searchHospitals();
            displayHospitalOptions(hospitals);
            openModal(hospitalModal);
        });

        // Also make hospital input field clickable to open modal
        hospitalInput?.addEventListener('click', async () => {
            // Clear search and load initial hospitals
            hospitalSearchInput.value = '';
            const hospitals = await searchHospitals();
            displayHospitalOptions(hospitals);
            openModal(hospitalModal);
        });

        // Setup Add Hospital functionality
        toggleAddHospital?.addEventListener('click', () => {
            addHospitalForm.classList.toggle('hidden');
            if (!addHospitalForm.classList.contains('hidden')) {
                newHospitalId.focus();
            }
        });

        cancelAddHospital?.addEventListener('click', () => {
            addHospitalForm.classList.add('hidden');
            newHospitalId.value = '';
            newHospitalName.value = '';
        });

        saveNewHospital?.addEventListener('click', async () => {
            await handleAddNewHospital();
        });

        // Focus search input
        hospitalSearchInput.focus();
    }

    function setupEventListeners() {
        tabs.forEach(tab => tab.addEventListener('click', () => handleTabClick(tab)));
        yesNoGroups.forEach(group => group.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button) handleYesNoClick(button);
        }));

        document.querySelectorAll('[data-modal-id]').forEach(opener => {
            opener.addEventListener('click', (e) => {
                e.preventDefault();
                if (opener.classList.contains('btn-specify')) {
                    openSpecifyTextModal(opener);
                } else {
                    const modal = document.getElementById(opener.dataset.modalId);
                    openModal(modal);
                }
            });
        });

        if (modalResetBtn) {
            modalResetBtn.addEventListener('click', () => {
                modalTextInput.value = '';
                modalTextInput.focus();
                saveSpecifyTextState();
            });
        }

        allModalOkBtns.forEach(btn => btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            saveStateAndClose(modal);
        }));

        const allCloseTriggers = document.querySelectorAll('.modal-close-btn');
        allCloseTriggers.forEach(btn => btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        }));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal:not(.hidden)');
                closeModal(activeModal);
            }

            // Ctrl+S shortcut to save form
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault(); // Prevent browser's default save behavior
                const saveBtn = document.getElementById('saveBtn');
                if (saveBtn) {
                    saveBtn.click();
                }
            }
        });

        prevBtn?.addEventListener('click', () => navigateTabs(false));
        nextBtn?.addEventListener('click', () => navigateTabs(true));
        resetBtn?.addEventListener('click', handleFormReset);

        medicalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(medicalForm);
            const data = Object.fromEntries(formData.entries());
        });

        if (multipleTypeSelect) multipleTypeSelect.addEventListener('change', handleMultipleTypeChange);
        if (raceCategorySelect) raceCategorySelect.addEventListener('change', handleRaceCategoryChange);
    }

    function handleTabClick(tab) {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(tab.id.replace('Tab', 'Section')).classList.add('active');

        // Fetch final CTG data when the Final CTG tab is clicked
        if (tab.id === 'finalCtgTab') {
            fetchFinalCtgData();
        }

        // Fetch attachments when the Attachment tab is clicked
        if (tab.id === 'webplotTab') {
            fetchAttachments();
        }

        updateNavigationButtons();
    }

    function navigateTabs(isNext) {
        const currentIndex = Array.from(tabs).indexOf(document.querySelector('.tab-btn.active'));
        const newIndex = isNext ? currentIndex + 1 : currentIndex - 1;
        if (newIndex >= 0 && newIndex < tabs.length) {
            tabs[newIndex].click();
        }
    }

    function handleFormReset() {
        medicalForm.reset();
        document.querySelectorAll('.yes-btn[data-modal-id]').forEach(btn => btn.innerHTML = 'YES');
        yesNoGroups.forEach(group => {
            group.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        });
        handleTabClick(document.getElementById('maternalTab'));

        if (raceLookupBtn) {
            raceLookupBtn.textContent = 'Select Race...';
            raceLookupBtn.classList.remove('active');
        }
        if (hospitalLookupBtn) {
            hospitalLookupBtn.textContent = 'Select';
            hospitalLookupBtn.classList.remove('active');
        }
        document.querySelectorAll('.btn-specify').forEach(btn => {
            btn.textContent = 'Specify...'; // UPDATED TEXT
            btn.classList.remove('active');
        });
        handleMultipleTypeChange();
        handleRaceCategoryChange();
    }

    function updateNavigationButtons() {
        const activeTab = document.querySelector('.tab-btn.active');
        const currentIndex = Array.from(tabs).indexOf(activeTab);
        prevBtn.style.visibility = currentIndex === 0 ? 'hidden' : 'visible';
        nextBtn.style.visibility = currentIndex === tabs.length - 1 ? 'hidden' : 'visible';
    }
    // --- Initialize Application ---
    async function initializeMedicalAssessment() {
        const urlParams = new URLSearchParams(window.location.search);
        let assessmentId = urlParams.get('name');
        const displayElement = document.getElementById('assessmentIdDisplay');

        if (assessmentId) {
            // Existing assessment from URL
            window.globalRecordName = assessmentId;
            if (displayElement) displayElement.textContent = assessmentId;
            console.log('Loaded assessment from URL:', assessmentId);
        } else {
            // Create new assessment
            try {
                if (displayElement) displayElement.textContent = 'Creating...';
                const response = await fetch('/api/method/quantbit_ukui_customisation.api.create_new_medical_assessment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                if (result.message && result.message.status === 'success') {
                    assessmentId = result.message.name;
                    window.globalRecordName = assessmentId;
                    if (displayElement) displayElement.textContent = assessmentId;

                    // Update URL without reload
                    const newUrl = window.location.pathname + '?name=' + assessmentId;
                    window.history.pushState({ path: newUrl }, '', newUrl);
                    console.log('Created new assessment:', assessmentId);
                } else {
                    throw new Error(result.message || 'Failed to create assessment');
                }
            } catch (error) {
                console.error('Error creating assessment:', error);
                if (displayElement) displayElement.textContent = 'Error';
            }
        }
    }

    setupEventListeners();
    updateNavigationButtons();
    setupInputValidation();
    handleMultipleTypeChange();
    handleRaceCategoryChange();
    setupPreviousPregnancies();
    setupLmpLogic();
    setupDatePickers();
    setupHospitalModal();
    initializeMedicalAssessment();



    const getDataPointsBtn = document.getElementById('get-data-points-btn');
    const wpdIframe = document.getElementById('wpd-iframe');
    const reopenWpdBtn = document.getElementById('reopen-wpd-btn');
    const wpdOverlay = document.getElementById('wpd-overlay');

    // Function to close iframe and show reopen button
    function closeWpdIframe() {
        wpdIframe.style.display = 'none';
        wpdOverlay.style.display = 'none';
        reopenWpdBtn.style.display = 'block';
        console.log('WPD iframe closed, reopen button shown');
    }

    // Function to open iframe and hide reopen button
    function openWpdIframe() {
        wpdIframe.style.display = 'block';
        wpdOverlay.style.display = 'block';
        reopenWpdBtn.style.display = 'none';
        console.log('WPD iframe opened, reopen button hidden');
    }

    // Click on overlay to close iframe
    wpdOverlay.addEventListener('click', function () {
        closeWpdIframe();
    });

    // Reopen button click handler
    reopenWpdBtn.addEventListener('click', function () {
        openWpdIframe();
    });

    // Add hover effect to reopen button
    reopenWpdBtn.addEventListener('mouseenter', function () {
        this.style.transform = 'scale(1.05)';
        this.style.transition = 'transform 0.2s ease';
    });

    reopenWpdBtn.addEventListener('mouseleave', function () {
        this.style.transform = 'scale(1)';
    });

    // Keyboard support - close iframe on Escape key
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && wpdIframe.style.display === 'block') {
            closeWpdIframe();
        }
    });

    // Helper function to process file with WebPlotDigitizer
    function processFileWithWPD(file, wpdIframe) {
        openWpdIframe();
        console.log('Showing iframe, loading file:', file.name);
        console.log('Iframe src:', wpdIframe.src);

        // Wait for iframe to load before sending message
        wpdIframe.onload = function () {
            console.log('Iframe loaded successfully');
            console.log('Iframe contentWindow:', wpdIframe.contentWindow);
            console.log('Iframe readyState:', wpdIframe.contentWindow?.document?.readyState);

            // Wait for WebPlotDigitizer to be fully initialized
            const waitForWPD = setInterval(() => {
                if (wpdIframe.contentWindow && wpdIframe.contentWindow.wpd &&
                    (wpdIframe.contentWindow.wpd.popup || wpdIframe.contentWindow.wpd.dataTable)) {
                    console.log('WebPlotDigitizer is fully initialized');
                    clearInterval(waitForWPD);

                    // Inject automation script into iframe
                    const script = document.createElement('script');
                    script.src = '/wpd_automation.js';
                    script.onload = function () {
                        console.log('Automation script injected successfully');

                        // Get the current record name from Frappe context
                        let recordName = 'Unknown Document';
                        if (typeof cur_frm !== 'undefined' && cur_frm && cur_frm.doc && cur_frm.doc.name) {
                            recordName = cur_frm.doc.name;
                        }

                        console.log('Current record name:', recordName);

                        // Send record name to iframe immediately after script loads
                        setTimeout(() => {
                            wpdIframe.contentWindow.postMessage({
                                action: 'setRecordName',
                                recordName: recordName
                            }, '*');
                            console.log('Record name sent to iframe:', recordName);

                            // Now send the image data
                            setTimeout(() => {
                                const reader = new FileReader();
                                reader.onload = function (e) {
                                    console.log('File read complete, sending message with data');
                                    console.log('Message data size:', e.target.result.byteLength);

                                    const messageData = {
                                        action: 'loadImage',
                                        name: file.name,
                                        type: file.type,
                                        arrayBuffer: e.target.result
                                    };

                                    console.log('Message data structure:', {
                                        action: messageData.action,
                                        name: messageData.name,
                                        type: messageData.type,
                                        hasArrayBuffer: !!messageData.arrayBuffer,
                                        arrayBufferSize: messageData.arrayBuffer.byteLength
                                    });

                                    // Send message to iframe
                                    wpdIframe.contentWindow.postMessage(messageData, '*');
                                    console.log('Message sent to iframe');

                                    // Also try to verify the message was received
                                    setTimeout(() => {
                                        console.log('Checking if iframe received message...');
                                    }, 1000);
                                };
                                reader.readAsArrayBuffer(file);
                            }, 500);
                        }, 100);
                    };
                    script.onerror = function () {
                        console.error('Failed to inject automation script');
                    };
                    wpdIframe.contentWindow.document.head.appendChild(script);
                } else {
                    console.log('Waiting for WebPlotDigitizer to initialize...');
                }
            }, 500);

            // Timeout after 30 seconds
            setTimeout(() => {
                clearInterval(waitForWPD);
                console.error('WebPlotDigitizer failed to initialize within timeout');
            }, 30000);
        };

        wpdIframe.onerror = function () {
            console.error('Iframe failed to load');
        };

        // If iframe is already loaded, send message immediately
        if (wpdIframe.contentWindow && wpdIframe.contentWindow.document.readyState === 'complete') {
            console.log('Iframe already loaded, sending message immediately');
            wpdIframe.onload();
        } else {
            console.log('Waiting for iframe to load...');
        }
    }

    if (getDataPointsBtn && wpdIframe) {
        getDataPointsBtn.addEventListener('click', function () {
            console.log('WebPlotDigitizer button clicked');

            selectedFiles.forEach((file, index) => {
                console.log(`  ${index + 1}. ${file.name} (type: ${file.type})`);
            });
            console.log('Current files:', currentFiles);

            if (selectedFiles.length === 0) {
                alert('Please select at least one file to send to WebPlotDigitizer');
                return;
            }

            // Start processing the first file
            processNextFile(0);
        });

        // Function to process files sequentially
        window.processNextFile = async function (index) {
            if (index >= selectedFiles.length) {
                alert(`All ${selectedFiles.length} selected files have been processed!`);
                return;
            }

            const fileToProcess = selectedFiles[index];
            console.log(`Processing file ${index + 1} of ${selectedFiles.length}:`, fileToProcess.name, '(Index:', index, ')');

            openWpdIframe();

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

        // Listen for CSV data from WebPlotDigitizer iframe - DISABLED to avoid conflicts with uk.html handler
        // window.addEventListener('message', function (event) {
        //     if (event.data && event.data.action === 'csvDownload') {
        //         handleCSVDownload(event.data.csvData, event.data.filename);
        //     }
        // });

        async function handleCSVDownload(csvData, filename) {
            const wpdIframe = document.getElementById('wpd-iframe');
            const currentIndex = parseInt(wpdIframe.getAttribute('data-current-index') || '0');

            // Use the name of the file currently being processed
            const currentFile = selectedFiles[currentIndex];
            const baseName = currentFile ? currentFile.name : globalRecordName;

            // Just show success message and move to next file
            showStatus(`Data for ${baseName} processed successfully!`, 'success');

            // Move to next file
            processNextFile(currentIndex + 1);
        }
    }

    // --- Load Document from URL Parameter ---
    async function loadDocumentData(docname) {
        if (!docname) return;

        try {
            console.log(`Attempting to load document: ${docname}`);
            // Set flag to prevent patient ID validation during document load
            window.isLoadingDocument = true;

            const response = await fetch(`${FRAPPE_API_BASE}/${DOCTYPE_NAME}/${docname}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `token ${API_KEY}:${API_SECRET}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load document: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.data) {
                console.log('Document data received:', result.data);
                fillFormFields(result.data);
                showStatus(`Document ${docname} loaded`, 'success');
            }
        } catch (error) {
            console.error('Error loading document:', error);
            showStatus('Failed to load document data', 'error');
        } finally {
            // Reset flag after loading is complete
            setTimeout(() => {
                window.isLoadingDocument = false;
            }, 100); // Small delay to ensure all field updates are complete
        }
    }

    function fillFormFields(data) {
        if (!data) return;
        const directMapping = {
            // Maternal – basic
            maternal_age: "maternal_age",
            maternal_parity: "maternal_parity",
            previous_pregnancies: "previous_pregnancies",
            gestation_weeks: "gestation_weeks",
            papp_a_level: "papp_a_level",
            bmi: "bmi",
            wom_blod_pres: "bp_at_booking",
            antenatal_problems: "antenatal_problems",
            gyn_his: "gynaecological_history",
            mat_cond: "maternal_condition",
            mat_lb: "maternal_medication",

            // Yes/No selects 
            prev_iud_stillbirth: "prev_iud_stillbirth",
            prev_iugr_sga: "prev_iugr_sga",
            pregnancy_loss: "pregnancy_loss",
            hypertension: "hypertension",
            diabetes: "diabetes",
            autoimmune: "autoimmune",
            smoking_in_pregnancy: "smoking_in_pregnancy",
            respiratory_problems: "respiratory",
            inherited_disorders: "inherited_disorder",
            cardiac_prob: "cardiac_problems",
            hypertension_ever: "hypertension_history",
            anaemia_prb: "haematological_problems",
            ther_disord: "thromboembolic_disorder",
            liver_prd: "hepatic_problems",
            foetal_movements: "foetal_movements",
            gas_prb: "gastrointestinal_problems",
            endo: "endocrine_problems",
            neuro_prd: "neurological_problems",
            auto_dis: "autoimmune_disease",
            infection: "infections",
            fert_tre: "fertility_treatment",
            smoked: "ever_smoked",
            hou_smok: "smoker_in_household",
            sub_preg: "substance_use_before",
            sep: "maternal_sepsis",
            slw_prw: "slow_progress",
            epid: "epidural",
            ivf: "ivf_details",
            fev_lab: "maternal_fever",
            plac_path: "apla_syndrome",
            pre_ecla: "preeclampsia",
            iugr: "current_iugr",
            abnor_drop: "abnormal_dopplers",
            oligohydra: "oligohydramnios",
            card_neck: "cord_around_neck",
            plactal_abrupt: "placental_abruption",
            babycried: "baby_cried",
            gr_res_prb: "fgr_risks",
            pre_tr_birth: "preterm_birth_risks",
            abnor_scn: "anomaly_scan_result",

            // Race / ethnicity
            ethnic_category: "race_category",
            ethnic_subcategory: "race_subcategory",

            // LMP option (checkbox list value)
            lmpopt: "lmp_option",

            // Measurements
            wom_hg: "height_m",
            wom_wg: "weight_at_booking",

            // Selects
            plac_abnor: "placental_abnormality",
            fdr: "fgr_risk_status",
            asssris: "aspirin_risk_assessment",
            dvit: "vitamin_d_assessment",
            liq_col: "liquor_color",
            sme_liq: "liquor_smell",
            "4_presentation": "presentation",
            type: "multiple_pregnancy_type",
            chorionicity: "multiple_pregnancy_chorionicity",
            zygosity: "multiple_pregnancy_zygosity",

            // Numeric / data fields
            alco_wek: "alcohol_at_booking",
            co_ppm: "co_reading_ppm",
            oxytocin_hr: "oxytocin_duration",
            donar_age: "donor_age",
            episodes: "episodes",

            // Induction
            method: "induction_method",
            medication: "induction_medication",
            total_dose: "induction_dose",

            // Birth / fetal
            birthweight: "birth_weight",
            babys: "baby_sex",
            please_select: "current_mode_of_delivery",
            indication: "delivery_indication",
            birth_related: "birth_related",
            neon_resus: "resuscitation_reason",
            neonatal_malfun: "congenital_malformations_details",
            neonatal_icu: "nicu_reason",

            // Cord blood – arterial
            ph: "arterial_ph",
            base_excess: "arterial_base_excess",
            lactate: "arterial_lactate",
            foetal_hb: "arterial_hb",
            po2: "arterial_po2",
            pco2: "arterial_pco2",
            hco3: "arterial_hco3",

            // Cord blood – venous
            phv: "venous_ph",
            basev: "venous_base_excess",
            lactatev: "venous_lactate",
            foetalv: "venous_hb",
            po2v: "venous_po2",
            pco2v: "venous_pco2",
            hco3v: "venous_hco3",

            // APGAR
            min1: "apgar_1min",
            min5: "apgar_5min",
            min10: "apgar_10min",

            // Hospital
            hospital: "hospital",


            // Pregnancy-loss details
            select_trimester: "trimester",
            number_of_loss: "loss_count",
        };

        function setFlatpickrValue(inputName, value) {
            if (!value) return;
            const el = document.querySelector(`input[name="${inputName}"]`);
            if (!el) return;
            if (el._flatpickr) {
                el._flatpickr.setDate(value, true);
            } else {
                el.value = value;
            }
        }

        function setField(htmlName, value) {
            if (value === null || value === undefined || value === "") return;
            const inputs = document.querySelectorAll(
                `input[name="${htmlName}"], select[name="${htmlName}"], textarea[name="${htmlName}"]`
            );
            inputs.forEach(el => {
                if (el.type === "checkbox") {
                    el.checked = (value === 1 || value === true || value === "Yes");
                } else {
                    el.value = value;
                }
                el.dispatchEvent(new Event("change", { bubbles: true }));
                el.dispatchEvent(new Event("input", { bubbles: true }));
            });
        }

        function clickYesNo(targetName, yesOrNo) {
            const btn = document.querySelector(
                `.yes-no-group button[data-target="${targetName}"][data-value="${yesOrNo}"]`
            );
            if (btn) {
                // Use the existing handler so modals / sub-sections stay in sync
                if (typeof handleYesNoClick === "function") {
                    handleYesNoClick(btn);
                } else {
                    btn.click();
                }
            }
        }

        Object.keys(directMapping).forEach(dbKey => {
            const value = data[dbKey];
            if (value === null || value === undefined || value === "") return;
            const htmlName = directMapping[dbKey];
            setField(htmlName, value);
        });

        const yesNoMappings = {
            // DB key              : HTML data-target
            prev_iud_stillbirth: "prev_iud_stillbirth",
            prev_iugr_sga: "prev_iugr_sga",
            pregnancy_loss: "pregnancy_loss",
            hypertension: "hypertension",
            diabetes: "diabetes",
            autoimmune: "autoimmune",
            smoking_in_pregnancy: "smoking_in_pregnancy",
            respiratory_problems: "respiratory",
            inherited_disorders: "inherited_disorder",
            cardiac_prob: "cardiac_problems",
            hypertension_ever: "hypertension_history",
            anaemia_prb: "haematological_problems",
            ther_disord: "thromboembolic_disorder",
            liver_prd: "hepatic_problems",
            foetal_movements: "foetal_movements",
            gas_prb: "gastrointestinal_problems",
            endo: "endocrine_problems",
            neuro_prd: "neurological_problems",
            auto_dis: "autoimmune_disease",
            infection: "infections",
            fert_tre: "fertility_treatment",
            smoked: "ever_smoked",
            hou_smok: "smoker_in_household",
            sub_preg: "substance_use_before",
            sep: "maternal_sepsis",
            slw_prw: "slow_progress",
            epid: "epidural",
            ivf: "ivf_details",
            fev_lab: "maternal_fever",
            plac_path: "apla_syndrome",
            pre_ecla: "preeclampsia",
            iugr: "current_iugr",
            abnor_drop: "abnormal_dopplers",
            oligohydra: "oligohydramnios",
            card_neck: "cord_around_neck",
            plactal_abrupt: "placental_abruption",
            babycried: "baby_cried",
            gr_res_prb: "fgr_risks",
            pre_tr_birth: "preterm_birth_risks",
            abnor_scn: "anomaly_scan_result",

        };

        Object.keys(yesNoMappings).forEach(dbKey => {
            const value = data[dbKey];
            if (!value) return;
            const normalised = (value === 1 || value === true || value === "Yes") ? "Yes" : "No";
            clickYesNo(yesNoMappings[dbKey], normalised);
        });
        if (data.lmp) {
            setFlatpickrValue("lmp_date", data.lmp);
        }
        if (data.alco_wek !== undefined && data.alco_wek !== null && data.alco_wek !== "") {
            const noneChk = document.getElementById("alcoholNone");
            if (noneChk) noneChk.checked = false;
            const alcoholInput = document.querySelector('input[name="alcohol_at_booking"]');
            if (alcoholInput) {
                alcoholInput.disabled = false;
                alcoholInput.value = data.alco_wek;
            }
        }

        if (data.rupt_mem) {
            setFlatpickrValue("rom_datetime", data.rupt_mem);
        }
        const hasInduction = data.method || data.medication || data.total_dose;
        if (hasInduction) {
            clickYesNo("induction_of_labor", "Yes");
            // Give the modal a tick to appear, then set its fields
            setTimeout(() => {
                setField("induction_method", data.method || "");
                setField("induction_medication", data.medication || "");
                setField("induction_dose", data.total_dose || "");
            }, 100);
        }

        if (data.timendate) {
            setFlatpickrValue("birth_datetime", data.timendate);
        }

        if (data.type) {
            // Activate YES button
            clickYesNo("multiple_pregnancy", "Yes");

            setTimeout(() => {
                // Set hidden inputs
                const typeHidden = document.getElementById("multiple_pregnancy_type_hidden");
                const chorHidden = document.getElementById("multiple_pregnancy_chorionicity_hidden");
                const zygoHidden = document.getElementById("multiple_pregnancy_zygosity_hidden");
                if (typeHidden) typeHidden.value = data.type || "";
                if (chorHidden) chorHidden.value = data.chorionicity || "";
                if (zygoHidden) zygoHidden.value = data.zygosity || "";

                // Set modal selects (they drive the hidden inputs)
                const typeSelect = document.getElementById("multiple_type_modal");
                const chorSelect = document.getElementById("chorionicity_select_modal");
                const zygoSelect = document.getElementById("zygosity_select_modal");
                if (typeSelect) typeSelect.value = data.type || "";
                if (chorSelect) chorSelect.value = data.chorionicity || "";
                if (zygoSelect) zygoSelect.value = data.zygosity || "";

                // Show/hide the chorionicity + zygosity sub-divs
                const chorDiv = document.getElementById("chorionicityDiv");
                const zygoDiv = document.getElementById("zygosityDiv");
                if (chorDiv) chorDiv.classList.toggle("hidden", !data.type);
                if (zygoDiv) zygoDiv.classList.toggle("hidden", !data.type);
            }, 150);
        }
        function fillModalTextarea(formName, value, yesBtnTarget) {
            if (!value) return;
            const ta = document.querySelector(`textarea[name="${formName}"]`);
            if (ta) ta.value = value;
            // Activate the YES button so the modal state is consistent
            clickYesNo(yesBtnTarget, "Yes");
        }
        fillModalTextarea("resuscitation_reason", data.neon_resus, "neonatal_resuscitation");
        fillModalTextarea("congenital_malformations_details", data.neonatal_malfun, "congenital_malformations");
        fillModalTextarea("nicu_reason", data.neonatal_icu, "nicu_admission");

        if (data.ethnic_category || data.ethnic_subcategory) {
            const catHidden = document.getElementById("race_category_hidden");
            const subHidden = document.getElementById("race_subcategory_hidden");
            if (catHidden) catHidden.value = data.ethnic_category || "";
            if (subHidden) subHidden.value = data.ethnic_subcategory || "";

            const raceCategorySelect = document.getElementById("raceCategory");
            const raceSubCategorySelect = document.getElementById("raceSubCategory");
            const raceLookupBtn = document.getElementById("raceLookupBtn");

            if (raceCategorySelect) {
                raceCategorySelect.value = data.ethnic_category || "";
                // Rebuild sub-options
                if (typeof handleRaceCategoryChange === "function") handleRaceCategoryChange();
                if (raceSubCategorySelect) raceSubCategorySelect.value = data.ethnic_subcategory || "";
            }
            if (typeof saveRaceModalState === "function") saveRaceModalState();
        }

        document.querySelectorAll(".btn-specify").forEach(btn => {
            const targetId = btn.dataset.targetId;
            const targetTextarea = targetId ? document.getElementById(targetId) : null;
            if (targetTextarea && targetTextarea.value.trim() !== "") {
                btn.textContent = "View/Edit...";
                btn.classList.add("active");
            } else {
                btn.textContent = "Specify...";
                btn.classList.remove("active");
            }
        });

        const checkboxMappings = {
            asthma: ["respiratory_problems", "Asthma"],
            asthma_spe: ["respiratory_problems", "Asthma-Specialist-Consultant-Care"],
            asthma_pre: ["respiratory_problems", "Asthma-Previous-Admission-In-Last-12-Months"],
            chronic_bronchitis: ["respiratory_problems", "Chronic-Bronchitis"],
            chronic_obstr: ["respiratory_problems", "Chronic-Obstructive-Airway-Disease"],
            pulmonary_fibrosis: ["respiratory_problems", "Pulmonary-Fibrosis"],
            sarcoidosis: ["respiratory_problems", "Sarcoidosis"],
            tuber_current_treat: ["respiratory_problems", "Tuberculosis-Current-Treatment"],
            tuber_past: ["respiratory_problems", "Tuberculosis-Past-Treatment"],

            aperts_syndrome: ["inherited_disorders", "Aperts-Syndrome"],
            cong_adren_hyper: ["inherited_disorders", "Congenital-Adrenal-Hyperplasia"],
            conge_hip_dys: ["inherited_disorders", "Congenital-Hip-Dysplasia"],
            cystic_fibrosis: ["inherited_disorders", "Cystic-Fibrosis"],
            down_synd: ["inherited_disorders", "Downs-Syndrome"],
            haemochromatosis: ["inherited_disorders", "Haemochromatosis"],
            marf_synd: ["inherited_disorders", "Marfans-Syndrome"],
            mcadd: ["inherited_disorders", "MCADD"],
            muscul_dyst: ["inherited_disorders", "Muscular-Dystrophy"],
            neurofibromatosis: ["inherited_disorders", "Neurofibromatosis"],
            phenylk: ["inherited_disorders", "Phenylketonuria"],
            inher_other: ["inherited_disorders", "Other"],

            arrhythmia: ["cardiac_problems_list", "Arrhythmia"],
            car_care: ["cardiac_problems_list", "Cardiac-disease"],
            cardiac_mur: ["cardiac_problems_list", "Cardiac-Murmur"],
            cardiac_surgery: ["cardiac_problems_list", "Cardiac-Surgery"],
            cardiac_transplante: ["cardiac_problems_list", "Cardiac-Transplant"],
            card_anom: ["cardiac_problems_list", "Congenital-Cardiac-Anomaly"],
            isc_heart: ["cardiac_problems_list", "Ischemic-Heart-Disease"],
            peri_card: ["cardiac_problems_list", "Peripartum-Cardiomyopathy"],
            rheumatic_fever: ["cardiac_problems_list", "Rheumatic-Fever"],
            valve_lesion: ["cardiac_problems_list", "Valve-Lesion"],
            card_other: ["cardiac_problems_list", "Other"],

            pul_hyper: ["hypertension_history_list", "Pulmonary-Hypertension"],
            curr_med: ["hypertension_history_list", "Currently-Medicated"],
            no_medica: ["hypertension_history_list", "Currently-No-Medication"],
            dur_pre_med: ["hypertension_history_list", "During-Pregnancy-Medicated"],
            preg_not_med: ["hypertension_history_list", "During-Pregnancy-Not-Medicated"],
            no_pre_med: ["hypertension_history_list", "Non-Pregnant-Medicated"],
            no_preg_med: ["hypertension_history_list", "Non-Pregnant-No-Medication"],

            anaemia: ["haematological_problems_list", "Anaemia"],
            rh_isoim: ["haematological_problems_list", "Rhesus-isoimmunisation"],
            antibody_sensitivity: ["haematological_problems_list", "Antibody-sensitivity"],
            seckel_dis: ["haematological_problems_list", "Sickle-cell-disease"],
            alpha_thalassaemia: ["haematological_problems_list", "Alpha-Thalassaemia"],
            cell_trait: ["haematological_problems_list", "Sickle-cell-trait"],
            beta_thalassaemia: ["haematological_problems_list", "Beta-Thalassaemia"],
            hae_other: ["haematological_problems_list", "Other"],
            thal_trait: ["haematological_problems_list", "Beta-Thalassaemia-Trait"],
            bon_mar: ["haematological_problems_list", "Bone-marrow-transplant"],

            antipho: ["thromboembolic_disorder_list", "Antiphospholipid-syndrome"],
            pcd: ["thromboembolic_disorder_list", "Protein-C-deficiency"],
            antithrombin_deficiency: ["thromboembolic_disorder_list", "Antithrombin-deficiency"],
            psd: ["thromboembolic_disorder_list", "Protein-S-deficiency"],
            haema_care: ["thromboembolic_disorder_list", "Compound-heterozygosity-under-haematological-care"],
            pmfh: ["thromboembolic_disorder_list", "Prothrombin-mutation"],
            dvt: ["thromboembolic_disorder_list", "DVT-anticoagulated"],
            pe: ["thromboembolic_disorder_list", "Pulmonary-embolus"],
            dvt_not: ["thromboembolic_disorder_list", "DVT-not-anticoagulated"],
            thrombocytopenia: ["thromboembolic_disorder_list", "Thrombocytopenia"],
            v_leid: ["thromboembolic_disorder_list", "Factor-V-Leiden-(homozygous)"],
            thrombophilia: ["thromboembolic_disorder_list", "Thrombophilia"],
            haemophilia: ["thromboembolic_disorder_list", "Haemophilia"],
            vvwp: ["thromboembolic_disorder_list", "Varicose-veins-with-phlebits"],
            itp: ["thromboembolic_disorder_list", "Idiopathic-Thrombocytopenic-Purpura-(ITP)"],
            vvnp: ["thromboembolic_disorder_list", "Varicose-veins-no-phlebits"],
            pat: ["thromboembolic_disorder_list", "Previous-arterial-thrombosis"],
            vwd: ["thromboembolic_disorder_list", "Von-Willebrand-disease"],
            pdvt: ["thromboembolic_disorder_list", "Previous-DVT"],
            tharm_other: ["thromboembolic_disorder_list", "Other"],

            afl: ["hepatic_problems_list", "Acute-Fatty-Liver"],
            hep_unk: ["hepatic_problems_list", "Hepatitis-type-unknown"],
            aut_he: ["hepatic_problems_list", "Autoimmune-hepatitis"],
            jnhs: ["hepatic_problems_list", "Jaundice-not-hepatitis-specific"],
            help_synd: ["hepatic_problems_list", "HELP-syndrome"],
            liver_trans: ["hepatic_problems_list", "Liver-transplant"],
            hepa: ["hepatic_problems_list", "Hepatitis-A"],
            obs_chl: ["hepatic_problems_list", "Obstetric-cholestasis"],
            hepb: ["hepatic_problems_list", "Hepatitis-B"],
            oth_hep_prd: ["hepatic_problems_list", "Other-hepatic-problem"],
            hepc: ["hepatic_problems_list", "Hepatitis-C"],

            achalasia: ["gastrointestinal_problems_list", "Achalasia"],
            haemorrhoids_not_treated: ["gastrointestinal_problems_list", "Haemorrhoids-not-treated"],
            cholecystitis: ["gastrointestinal_problems_list", "Cholecystitis"],
            hiatus_hernia: ["gastrointestinal_problems_list", "Hiatus-hernia"],
            coeliac_disease: ["gastrointestinal_problems_list", "Coeliac-disease"],
            irritable_bowel_syndrome: ["gastrointestinal_problems_list", "Irritable-bowel-syndrome"],
            crohns_disease: ["gastrointestinal_problems_list", "Crohns-disease"],
            malabsorption_syndrome: ["gastrointestinal_problems_list", "Malabsorption-syndrome"],
            faecal_incontinence: ["gastrointestinal_problems_list", "Faecal-incontinence"],
            pancreatitis: ["gastrointestinal_problems_list", "Pancreatitis"],
            gastric_band: ["gastrointestinal_problems_list", "Gastric-band"],
            ulcerative_colitis: ["gastrointestinal_problems_list", "Ulcerative-colitis"],
            gastric_ulcer: ["gastrointestinal_problems_list", "Gastric-ulcer"],
            garothr: ["gastrointestinal_problems_list", "Other"],
            haemorrhoids_treated: ["gastrointestinal_problems_list", "Haemorrhoids-treated"],

            addison_disease: ["endocrine_problems_list", "Addisons-disease"],
            hyperthyroidism_current: ["endocrine_problems_list", "Hyperthyroidism-current"],
            autoimmune_hypothyroidism: ["endocrine_problems_list", "Autoimmune-hypothyroidism"],
            hyperthyroidism: ["endocrine_problems_list", "Hyperthyroidism-past"],
            cushings_syndrome: ["endocrine_problems_list", "Cushings-syndrome"],
            hypothyroidism: ["endocrine_problems_list", "Hypothyroidism"],
            diabetes_type_1: ["endocrine_problems_list", "Diabetes-type-1"],
            pituitary_disorder: ["endocrine_problems_list", "Pituitary-disorder"],
            diabetes_type_2: ["endocrine_problems_list", "Diabetes-type-2"],
            posysn: ["endocrine_problems_list", "Polycystic-ovarian-syndrome"],
            endocrine_disease: ["endocrine_problems_list", "Endocrine-disease"],
            endocothr: ["endocrine_problems_list", "Other"],
            gestational_diabetes: ["endocrine_problems_list", "Gestational-diabetes"],

            adhd__add: ["neurological_problems_list", "ADHD/ADD"],
            psh: ["neurological_problems_list", "Previous-subarachnoid-haemorrhage"],
            asd: ["neurological_problems_list", "Autism-Spectrum-Disorder"],
            stroke: ["neurological_problems_list", "Stroke"],
            cerebral_palsy: ["neurological_problems_list", "Cerebral-palsy"],
            fne: ["neurological_problems_list", "Fits-not-epilepsy"],
            cfs: ["neurological_problems_list", "Chronic-fatigue-syndrome"],
            migraine: ["neurological_problems_list", "Migraine"],
            enm: ["neurological_problems_list", "Epilepsy-no-medication"],
            migrain_severe: ["neurological_problems_list", "Migraine-severe"],
            erm: ["neurological_problems_list", "Epilepsy-requires-medication"],
            neuromuscular_disorder: ["neurological_problems_list", "Neuromuscular-disorder"],
            multiple_sclerosis: ["neurological_problems_list", "Multiple-sclerosis"],
            spina_bifida: ["neurological_problems_list", "Spina-bifida"],
            myotonic_dystrophy: ["neurological_problems_list", "Myotonic-dystrophy"],
            nuero_prb_othr: ["neurological_problems_list", "Other"],
            neuropathy: ["neurological_problems_list", "Neuropathy"],

            gestational_pemphigoid: ["autoimmune_disease_list", "Gestational-pemphigoid"],
            sclerosis: ["autoimmune_disease_list", "Multiple-sclerosis"],
            myasthenia_gravis: ["autoimmune_disease_list", "Myasthenia-Gravis"],
            pernicious_anaemia: ["autoimmune_disease_list", "Pernicious-anaemia"],
            psoriasis: ["autoimmune_disease_list", "Psoriasis"],
            psoriatic_arthropathy: ["autoimmune_disease_list", "Psoriatic-arthropathy"],
            rheumatoid_arthritis: ["autoimmune_disease_list", "Rheumatoid-arthritis"],
            syst_lup_eryth: ["autoimmune_disease_list", "Systemic-lupus-erythematosus"],
            systemic_sclerosis: ["autoimmune_disease_list", "Systemic-sclerosis"],
            vitiligo: ["autoimmune_disease_list", "Vitiligo"],
            autodis_othe: ["autoimmune_disease_list", "Other"],

            groupb: ["infections_list", "Group-B-streptococcus"],
            confidential_information: ["infections_list", "Confidential-information"],
            hiv: ["infections_list", "Human-immunodeficiency-virus"],
            candida: ["infections_list", "Candida"],
            habite: ["infections_list", "Habite"],
            c_difficile: ["infections_list", "C-Difficile"],
            meningitis: ["infections_list", "Meningitis"],
            chlamydia: ["infections_list", "Chlamydia"],
            mrsa: ["infections_list", "MRSA"],
            cytomegalovirus: ["infections_list", "Cytomegalovirus"],
            parvovirus: ["infections_list", "Parvovirus"],
            genital_herpes: ["infections_list", "Genital-herpes"],
            polio: ["infections_list", "Polio"],
            genital_warts: ["infections_list", "Genital-warts"],
            rubella: ["infections_list", "Rubella"],
            glandular_fever: ["infections_list", "Glandular-fever"],
            syphilis: ["infections_list", "Syphilis"],
            gonorrhoea: ["infections_list", "Gonorrhea"],
            toxoplasmosis: ["infections_list", "Toxoplasmosis"],
            covid19m6: ["infections_list", "Covid-19-in-the-last-6-months"],
            tropical_disease: ["infections_list", "Tropical-disease"],
            covid196m: ["infections_list", "Covid-19-more-than-6-months-ago"],
            infectothr: ["infections_list", "Other"],

            aibd: ["fertility_treatment_list", "Artificial-insemination-by-donor"],
            artif_insemin: ["fertility_treatment_list", "Artificial-insemination-by-partner"],
            bpdi: ["fertility_treatment_list", "Became-pregnant-during-investigations"],
            clomiphene: ["fertility_treatment_list", "Clomiphene"],
            gift: ["fertility_treatment_list", "GIFT"],
            icsi_own_egg: ["fertility_treatment_list", "ICSI-(own-egg)"],
            icsi_donor_egg: ["fertility_treatment_list", "ICSI-(donor-egg)"],
            iui: ["fertility_treatment_list", "Intrauterine-insemination-(IUI)"],
            ivf_own_egg: ["fertility_treatment_list", "In-vitro-fertilization-(IVF)-(own-egg)"],
            ivf_donar_egg: ["fertility_treatment_list", "In-vitro-fertilization-(IVF)-(donor-egg)"],
            hgc: ["fertility_treatment_list", "Human-chorionic-gonadotrophin-(HCG)"],
            pergonal_or_metrodin: ["fertility_treatment_list", "Pergonal-or-Metrodin"],
            reversal_of_sterilisation: ["fertility_treatment_list", "Reversal-of-sterilisation"],
            surrogate_pregnancy: ["fertility_treatment_list", "Surrogate-pregnancy"],
            tubal_surgery: ["fertility_treatment_list", "Tubal-surgery"],
            yes_not_wish: ["fertility_treatment_list", "Yes,-but-does-not-wish-to-discuss"],
            fertiother: ["fertility_treatment_list", "Other"],

            medinone: ["medication_in_pregnancy_list", "None"],
            asthma_drugs: ["medication_in_pregnancy_list", "Asthma-drugs"],
            analgesics: ["medication_in_pregnancy_list", "Analgesics"],
            aspirin: ["medication_in_pregnancy_list", "Aspirin"],
            antacids: ["medication_in_pregnancy_list", "Antacids"],
            insulin: ["medication_in_pregnancy_list", "Insulin"],
            antibiotics: ["medication_in_pregnancy_list", "Antibiotics"],
            levothyroxine: ["medication_in_pregnancy_list", "Levothyroxine"],
            antid: ["medication_in_pregnancy_list", "Anti-D"],
            lithium: ["medication_in_pregnancy_list", "Lithium"],
            antidepressants: ["medication_in_pregnancy_list", "Antidepressants"],
            multivitamins: ["medication_in_pregnancy_list", "Multivitamins"],
            antihypertensives: ["medication_in_pregnancy_list", "Antihypertensives"],
            oral_hypoglycemics: ["medication_in_pregnancy_list", "Oral-hypoglycemics"],
            oncology_drugs: ["medication_in_pregnancy_list", "Oncology-drugs"],
            roaccutane: ["medication_in_pregnancy_list", "Roaccutane"],
            vitamind: ["medication_in_pregnancy_list", "Vitamin-D"],
            med_opthrt: ["medication_in_pregnancy_list", "Other"],

            crystal_meth: ["substance_use_before_list", "Crystal-meth"],
            declined_to_answer: ["substance_use_before_list", "Declined-to-answer"],
            diazepam: ["substance_use_before_list", "Diazepam"],
            acid: ["substance_use_before_list", "Acid"],
            ecstasy: ["substance_use_before_list", "Ecstasy"],
            amphetamines: ["substance_use_before_list", "Amphetamines"],
            glue: ["substance_use_before_list", "Glue"],
            cannabis: ["substance_use_before_list", "Cannabis"],
            heroin: ["substance_use_before_list", "Heroin"],
            cocaine: ["substance_use_before_list", "Cocaine"],
            ketamine: ["substance_use_before_list", "Ketamine"],
            crack: ["substance_use_before_list", "Crack"],
            khat: ["substance_use_before_list", "Khat"],
            lighter_fuel: ["substance_use_before_list", "Lighter-fuel"],
            lsd: ["substance_use_before_list", "LSD"],
            methadone: ["substance_use_before_list", "Methadone"],
            speed: ["substance_use_before_list", "Speed"],
            subutex: ["substance_use_before_list", "Subutex"],
            temazepam: ["substance_use_before_list", "Temazepam"],
            subothr: ["substance_use_before_list", "Other"],

            no_abnor: ["anomaly_scan_result_list", "No-abnormality-detected"],
            anencephaly: ["anomaly_scan_result_list", "Anencephaly"],
            bra: ["anomaly_scan_result_list", "Bilateral-renal-agenesis"],
            cleft_lip: ["anomaly_scan_result_list", "Cleft-lip"],
            diaphragmatic_hernia: ["anomaly_scan_result_list", "Diaphragmatic-hernia"],
            exomphalos: ["anomaly_scan_result_list", "Exomphalos"],
            gastroschisis: ["anomaly_scan_result_list", "Gastroschisis"],
            lethal_sket_dys: ["anomaly_scan_result_list", "Lethal-skeletal-dysplasia"],
            osb: ["anomaly_scan_result_list", "Open-spina-bifida"],
            sca: ["anomaly_scan_result_list", "Serious-cardiac-abnormality"],
            trisomy_13: ["anomaly_scan_result_list", "Trisomy-13"],
            trisomy_18: ["anomaly_scan_result_list", "Trisomy-18"],
            admonr_other: ["anomaly_scan_result_list", "Other"],

            no_risk: ["fgr_risks_list", "No-risk-factors-identified"],
            antiphospholipid: ["fgr_risks_list", "Antiphospholipid"],
            chronic_hypertension: ["fgr_risks_list", "Chronic-Hypertension"],
            chronic_rental: ["fgr_risks_list", "Chronic-renal-failure"],
            drug_misuse: ["fgr_risks_list", "Drug-misuse"],
            suasb: ["fgr_risks_list", "Significant-Uterine-Anomalies"],
            smoking_at_booking: ["fgr_risks_list", "Smoking-at-booking"],
            ufsfim: ["fgr_risks_list", "Unsuitable-for-SFI-monitoring"],
            pappa: ["fgr_risks_list", "Low-PAPP-A"],
            frg_othr: ["fgr_risks_list", "Other"],

            no_risk_pre: ["preterm_birth_risks_list", "No-risks-identified"],
            lletz_prev: ["preterm_birth_risks_list", "LLETZ-unknown-depth"],
            cbir: ["preterm_birth_risks_list", "Cone-Biopsy"],
            hosceehr: ["preterm_birth_risks_list", "HO-significant-cervical-excisional-event"],
            hotfcc: ["preterm_birth_risks_list", "HO-trachelectomy-for-cervical-cancer"],
            intr_adhe_syndro: ["preterm_birth_risks_list", "Intrauterine-adhesions"],
            lletz: ["preterm_birth_risks_list", "LLETZ-gt-10mm-depth-removed"],
            lletz_ir: ["preterm_birth_risks_list", "LLETZ-2-or-more-procedures"],
            mul_preg: ["preterm_birth_risks_list", "Multiple-Pregnancy"],
            prev_cerv_cercl: ["preterm_birth_risks_list", "Prev-cervical-cerclage"],
            prev_aila: ["preterm_birth_risks_list", "Previous-c/s-at-full-dilatation"],
            prev_pre_birth: ["preterm_birth_risks_list", "Prev-preterm-birth-16-34wks"],
            prev_preterm: ["preterm_birth_risks_list", "Prev-preterm-prelabour-SROM"],
            uterine_variant: ["preterm_birth_risks_list", "Uterine-variant"],

            own_fresh: ["ivf_details_list", "Own-fresh-embryos"],
            own_frozen: ["ivf_details_list", "Own-frozen-embryos"],
            donor_oocyte: ["ivf_details_list", "Donor-oocyte"],
            male_fact_indi: ["ivf_details_list", "Male-factor"],
            icsiimsi: ["ivf_details_list", "ICSI/IMSI"],
        };

        Object.keys(checkboxMappings).forEach(dbKey => {
            if (data[dbKey] === 1 || data[dbKey] === true) {
                const [inputName, value] = checkboxMappings[dbKey];
                const checkbox = document.querySelector(
                    `input[name="${inputName}"][value="${value}"]`
                );
                if (checkbox) {
                    checkbox.checked = true;
                    // Update the hidden comma-list input for that modal
                    const modal = checkbox.closest(".modal");
                    if (modal && typeof saveCheckboxModalState === "function") {
                        saveCheckboxModalState(modal);
                    }
                }
            }
        });

        if (data.previous_pregnancies) {
            const numVal = parseInt(data.previous_pregnancies) || 0;
            const numInput = document.querySelector('input[name="previous_pregnancies"]');
            if (numInput) numInput.value = numVal;

            const btn = document.getElementById("previousPregnanciesBtn");
            if (btn) {
                btn.click(); // regenerate table rows

                if (data.table_vtci && Array.isArray(data.table_vtci)) {
                    data.table_vtci.forEach((row, i) => {
                        const idx = i + 1;
                        const map = {
                            problems: row.antenatal_problems,
                            outcome: row.outcome,
                            mode: row.mode_of_delivery,
                            weight: row.birth_weight,
                            ga: row.gestational_age,
                        };
                        Object.keys(map).forEach(fKey => {
                            const el = document.querySelector(
                                `[name="prev_preg_${idx}_${fKey}"]`
                            );
                            if (el) el.value = map[fKey] || "";
                        });
                    });
                }
            }
        }

        // Update button visibility based on document status and user role
        if (window.canEditSubmitted !== undefined) {
            // Role check already completed
            updateButtonVisibility(data.docstatus || 0);
        } else {
            // Role check not completed yet, wait for it
            setTimeout(() => {
                updateButtonVisibility(data.docstatus || 0);
            }, 500);
        }
    }

    // Check for 'name' parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const docName = urlParams.get('name');
    if (docName) {
        // Set global record name immediately
        window.globalRecordName = docName;
        console.log('Set globalRecordName from URL:', docName);

        // Wait a small bit to ensure all setup is complete
        setTimeout(() => loadDocumentData(docName), 500);
    }
});

// Utility: Sets max date/time and adds real-time validation
document.addEventListener("DOMContentLoaded", () => {
    const dateTimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    const dateInputs = document.querySelectorAll('input[type="date"]');

    const getLocalISOString = (date) => {
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
        return adjustedDate.toISOString().slice(0, 16);
    };

    const now = new Date();
    const maxDateTime = getLocalISOString(now);
    const maxDate = maxDateTime.split("T")[0];

    dateTimeInputs.forEach(input => input.setAttribute("max", maxDateTime));
    dateInputs.forEach(input => input.setAttribute("max", maxDate));

    dateTimeInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const selectedDate = new Date(e.target.value);
            const currentDate = new Date();
            if (selectedDate > currentDate) {
                alert("Future dates or times are not allowed. The value will be reset to the current time.");
                e.target.value = getLocalISOString(currentDate);
            }
        });
    });
});
const shortcuts = {
    n: () => nextBtn.click(),
    p: () => prevBtn.click()
};
document.addEventListener('keydown', (event) => {
    if (event.altKey && shortcuts[event.key]) {
        shortcuts[event.key]();
    }
});


document.getElementById('myCheckbox').addEventListener('change', function () {
    const checkbox = document.getElementById('myCheckbox');
    const textbox = document.getElementById('myTextbox');

    // If the checkbox is checked, disable and clear the textbox.
    // Otherwise, just enable it.
    if (checkbox.checked) {
        textbox.disabled = true;
        textbox.value = ''; // ✨ This is the new line that clears the input
    } else {
        textbox.disabled = false;
    }
});

// API Configuration
const FRAPPE_API_BASE = window.location.origin + '/api/resource';  // Use current server
const DOCTYPE_NAME = 'Medical Assessment';

// API Credentials from template context
const API_KEY = "{{ api_key }}";
const API_SECRET = "{{ api_secret }}";

// Debug function to check credentials
function debugCredentials() {
    // console.log('API_KEY:', API_KEY);
    // console.log('API_SECRET:', API_SECRET);
    // console.log('FRAPPE_API_BASE:', FRAPPE_API_BASE);
    // console.log('Current origin:', window.location.origin);

    // Check if credentials are properly set
    if (!API_KEY || API_KEY === "" || API_KEY.length < 10) {
        console.error('API Key is not properly set or too short');
        return false;
    }
    if (!API_SECRET || API_SECRET === "" || API_SECRET.length < 10) {
        console.error('API Secret is not properly set or too short');
        return false;
    }
    console.log('API credentials appear to be properly set');
    return true;
}

// Test API credentials before using them
async function testApiCredentials() {
    try {
        console.log('Testing API credentials...');
        const testResponse = await fetch(`${FRAPPE_API_BASE.replace('/api/resource', '')}/api/method/test_api_credentials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${API_KEY}:${API_SECRET}`
            },
            body: JSON.stringify({
                api_key: API_KEY,
                api_secret: API_SECRET
            })
        });

        if (testResponse.ok) {
            const result = await testResponse.json();
            console.log('API credentials test result:', result);
            return result.valid === true;
        } else {
            console.error('API credentials test failed:', testResponse.status);
            return false;
        }
    } catch (error) {
        console.error('API credentials test error:', error);
        return false;
    }
}

// Function to collect form data
function collectFormData() {
    const formData = {
        // Maternal Variables
        maternal_age: document.querySelector('input[name="maternal_age"]')?.value || '',
        maternal_parity: document.querySelector('select[name="maternal_parity"]')?.value || '',
        previous_pregnancies: document.querySelector('input[name="previous_pregnancies"]')?.value || '',
        gestation_weeks: document.querySelector('input[name="gestation_weeks"]')?.value || '',
        prev_iud_stillbirth: document.querySelector('input[name="prev_iud_stillbirth"]')?.value || '',
        prev_iugr_sga: document.querySelector('input[name="prev_iugr_sga"]')?.value || '',
        pregnancy_loss: document.querySelector('input[name="pregnancy_loss"]')?.value || '',
        select_trimester: document.querySelector('select[name="trimester"]')?.value || '',
        number_of_loss: document.querySelector('input[name="loss_count"]')?.value || '',
        hypertension: document.querySelector('input[name="hypertension"]')?.value || '',
        diabetes: document.querySelector('input[name="diabetes"]')?.value || '',
        autoimmune: document.querySelector('input[name="autoimmune"]')?.value || '',
        papp_a_level: document.querySelector('input[name="papp_a_level"]')?.value || '',
        bmi: document.querySelector('input[name="bmi"]')?.value || '',

        // Race/Ethnicity
        ethnic_category: document.querySelector('input[name="race_category"]')?.value || '',
        ethnic_subcategory: document.querySelector('input[name="race_subcategory"]')?.value || '',

        antenatal_problems: document.querySelector('textarea[name="antenatal_problems"]')?.value || '',
        smoking_in_pregnancy: document.querySelector('input[name="smoking_in_pregnancy"]')?.value || '',

        // Respiratory Problems
        respiratory_problems: document.querySelector('input[name="respiratory"]')?.value || '',
        asthma: document.querySelector('input[name="respiratory_problems"][value="Asthma"]')?.checked ? 1 : 0,
        asthma_spe: document.querySelector('input[name="respiratory_problems"][value="Asthma-Specialist-Consultant-Care"]')?.checked ? 1 : 0,
        asthma_pre: document.querySelector('input[name="respiratory_problems"][value="Asthma-Previous-Admission-In-Last-12-Months"]')?.checked ? 1 : 0,
        chronic_bronchitis: document.querySelector('input[name="respiratory_problems"][value="Chronic-Bronchitis"]')?.checked ? 1 : 0,
        chronic_obstr: document.querySelector('input[name="respiratory_problems"][value="Chronic-Obstructive-Airway-Disease"]')?.checked ? 1 : 0,
        pulmonary_fibrosis: document.querySelector('input[name="respiratory_problems"][value="Pulmonary-Fibrosis"]')?.checked ? 1 : 0,
        sarcoidosis: document.querySelector('input[name="respiratory_problems"][value="Sarcoidosis"]')?.checked ? 1 : 0,
        tuber_current_treat: document.querySelector('input[name="respiratory_problems"][value="Tuberculosis-Current-Treatment"]')?.checked ? 1 : 0,
        tuber_past: document.querySelector('input[name="respiratory_problems"][value="Tuberculosis-Past-Treatment"]')?.checked ? 1 : 0,
        other: document.querySelector('input[name="respiratory_problems"][value="Other"]')?.checked ? 1 : 0,

        // Inherited Disorders
        inherited_disorders: document.querySelector('input[name="inherited_disorder"]')?.value || '',
        aperts_syndrome: document.querySelector('input[name="inherited_disorders"][value="Aperts-Syndrome"]')?.checked ? 1 : 0,
        cong_adren_hyper: document.querySelector('input[name="inherited_disorders"][value="Congenital-Adrenal-Hyperplasia"]')?.checked ? 1 : 0,
        conge_hip_dys: document.querySelector('input[name="inherited_disorders"][value="Congenital-Hip-Dysplasia"]')?.checked ? 1 : 0,
        cystic_fibrosis: document.querySelector('input[name="inherited_disorders"][value="Cystic-Fibrosis"]')?.checked ? 1 : 0,
        down_synd: document.querySelector('input[name="inherited_disorders"][value="DownsSyndrome"]')?.checked ? 1 : 0,
        haemochromatosis: document.querySelector('input[name="inherited_disorders"][value="Haemochromatosi"]')?.checked ? 1 : 0,
        marf_synd: document.querySelector('input[name="inherited_disorders"][value="Marfans-Syndromea"]')?.checked ? 1 : 0,
        mcadd: document.querySelector('input[name="inherited_disorders"][value="MCADD"]')?.checked ? 1 : 0,
        muscul_dyst: document.querySelector('input[name="inherited_disorders"][value="Muscular-Dystrophy"]')?.checked ? 1 : 0,
        neurofibromatosis: document.querySelector('input[name="inherited_disorders"][value="Neurofibromatosis"]')?.checked ? 1 : 0,
        phenylk: document.querySelector('input[name="inherited_disorders"][value="Phenylketonuria"]')?.checked ? 1 : 0,
        inher_other: document.querySelector('input[name="inherited_disorders"][value="Other"]')?.checked ? 1 : 0,


        // Cardiac Problems
        cardiac_prob: document.querySelector('input[name="cardiac_problems"]')?.value || '',
        arrhythmia: document.querySelector('input[name="cardiac_problems_list"][value="Arrhythmia"]')?.checked ? 1 : 0,
        car_care: document.querySelector('input[name="cardiac_problems_list"][value="Cardiac-disease"]')?.checked ? 1 : 0,
        cardiac_mur: document.querySelector('input[name="cardiac_problems_list"][value="Cardiac-Murmur"]')?.checked ? 1 : 0,
        cardiac_surgery: document.querySelector('input[name="cardiac_problems_list"][value="Cardiac-Surgery"]')?.checked ? 1 : 0,
        cardiac_transplante: document.querySelector('input[name="cardiac_problems_list"][value="Cardiac-Transplant"]')?.checked ? 1 : 0,
        card_anom: document.querySelector('input[name="cardiac_problems_list"][value="Congenital-Cardiac-Anomaly"]')?.checked ? 1 : 0,
        isc_heart: document.querySelector('input[name="cardiac_problems_list"][value="Ischemic-Heart-Disease"]')?.checked ? 1 : 0,
        peri_card: document.querySelector('input[name="cardiac_problems_list"][value="Peripartum-Cardiomyopathy"]')?.checked ? 1 : 0,
        rheumatic_fever: document.querySelector('input[name="cardiac_problems_list"][value="Rheumatic-Fever"]')?.checked ? 1 : 0,
        valve_lesion: document.querySelector('input[name="cardiac_problems_list"][value="Valve-Lesion"]')?.checked ? 1 : 0,
        card_other: document.querySelector('input[name="cardiac_problems_list"][value="Other"]')?.checked ? 1 : 0,

        // Hypertension History
        hypertension_ever: document.querySelector('input[name="hypertension_history"]')?.value || '',
        pul_hyper: document.querySelector('input[name="hypertension_history_list"][value="Pulmonary-Hypertension"]')?.checked ? 1 : 0,
        curr_med: document.querySelector('input[name="hypertension_history_list"][value="Currently-Medicated"]')?.checked ? 1 : 0,
        no_medica: document.querySelector('input[name="hypertension_history_list"][value="Currently-No-Medication"]')?.checked ? 1 : 0,
        dur_pre_med: document.querySelector('input[name="hypertension_history_list"][value="During-Pregnancy-Medicated"]')?.checked ? 1 : 0,
        preg_not_med: document.querySelector('input[name="hypertension_history_list"][value="During-Pregnancy-Not-Medicated"]')?.checked ? 1 : 0,
        no_pre_med: document.querySelector('input[name="hypertension_history_list"][value="Non-Pregnant-Medicated"]')?.checked ? 1 : 0,
        no_preg_med: document.querySelector('input[name="hypertension_history_list"][value="Non-Pregnant-No-Medication"]')?.checked ? 1 : 0,

        // Haematological Problems
        anaemia_prb: document.querySelector('input[name="haematological_problems"]')?.value || '',
        anaemia: document.querySelector('input[name="haematological_problems_list"][value="Anaemia"]')?.checked ? 1 : 0,
        rh_isoim: document.querySelector('input[name="haematological_problems_list"][value="Rhesus-isoimmunisation"]')?.checked ? 1 : 0,
        antibody_sensitivity: document.querySelector('input[name="haematological_problems_list"][value="Antibody-sensitivity"]')?.checked ? 1 : 0,
        seckel_dis: document.querySelector('input[name="haematological_problems_list"][value="Sickle-cell-disease"]')?.checked ? 1 : 0,
        alpha_thalassaemia: document.querySelector('input[name="haematological_problems_list"][value="Alpha-Thalassaemia"]')?.checked ? 1 : 0,
        cell_trait: document.querySelector('input[name="haematological_problems_list"][value="Sickle-cell-trait"]')?.checked ? 1 : 0,
        beta_thalassaemia: document.querySelector('input[name="haematological_problems_list"][value="Beta-Thalassaemia"]')?.checked ? 1 : 0,
        hae_other: document.querySelector('input[name="haematological_problems_list"][value="Other"]')?.checked ? 1 : 0,
        thal_trait: document.querySelector('input[name="haematological_problems_list"][value="Beta-Thalassaemia-Trait"]')?.checked ? 1 : 0,
        bon_mar: document.querySelector('input[name="haematological_problems_list"][value="Bone-marrow-transplant"]')?.checked ? 1 : 0,



        // Thromboembolic Disorders
        ther_disord: document.querySelector('input[name="thromboembolic_disorder"]')?.value || '',
        antipho: document.querySelector('input[name="thromboembolic_disorder_list"][value="Antiphospholipid-syndrome"]')?.checked ? 1 : 0,
        pcd: document.querySelector('input[name="thromboembolic_disorder_list"][value="Protein-C-deficiency"]')?.checked ? 1 : 0,
        antithrombin_deficiency: document.querySelector('input[name="thromboembolic_disorder_list"][value="Antithrombin-deficiency"]')?.checked ? 1 : 0,
        psd: document.querySelector('input[name="thromboembolic_disorder_list"][value="Protein-S-deficiency"]')?.checked ? 1 : 0,
        haema_care: document.querySelector('input[name="thromboembolic_disorder_list"][value="Compound-heterozygosity-under-haematological-care"]')?.checked ? 1 : 0,
        pmfh: document.querySelector('input[name="thromboembolic_disorder_list"][value="Prothrombin-mutation"]')?.checked ? 1 : 0,
        dvt: document.querySelector('input[name="thromboembolic_disorder_list"][value="DVT-anticoagulated"]')?.checked ? 1 : 0,
        pe: document.querySelector('input[name="thromboembolic_disorder_list"][value="Pulmonary-embolus"]')?.checked ? 1 : 0,
        dvt_not: document.querySelector('input[name="thromboembolic_disorder_list"][value="DVT-not-anticoagulated"]')?.checked ? 1 : 0,
        thrombocytopenia: document.querySelector('input[name="thromboembolic_disorder_list"][value="Thrombocytopenia"]')?.checked ? 1 : 0,
        v_leid: document.querySelector('input[name="thromboembolic_disorder_list"][value="Factor-V-Leiden-(homozygous)"]')?.checked ? 1 : 0,
        thrombophilia: document.querySelector('input[name="thromboembolic_disorder_list"][value="Thrombophilia"]')?.checked ? 1 : 0,
        haemophilia: document.querySelector('input[name="thromboembolic_disorder_list"][value="Haemophilia"]')?.checked ? 1 : 0,
        vvwp: document.querySelector('input[name="thromboembolic_disorder_list"][value="Varicose-veins-with-phlebits"]')?.checked ? 1 : 0,
        itp: document.querySelector('input[name="thromboembolic_disorder_list"][value="Idiopathic-Thrombocytopenic-Purpura-(ITP)"]')?.checked ? 1 : 0,
        vvnp: document.querySelector('input[name="thromboembolic_disorder_list"][value="Varicose-veins-no-phlebits"]')?.checked ? 1 : 0,
        pat: document.querySelector('input[name="thromboembolic_disorder_list"][value="Previous-arterial-thrombosis"]')?.checked ? 1 : 0,
        vwd: document.querySelector('input[name="thromboembolic_disorder_list"][value="Von-Willebrand-disease"]')?.checked ? 1 : 0,
        pdvt: document.querySelector('input[name="thromboembolic_disorder_list"][value="Previous-DVT"]')?.checked ? 1 : 0,
        tharm_other: document.querySelector('input[name="thromboembolic_disorder_list"][value="Other"]')?.checked ? 1 : 0,

        // Hepatic Problems
        liver_prd: document.querySelector('input[name="hepatic_problems"]')?.value || '',
        afl: document.querySelector('input[name="hepatic_problems_list"][value="Acute-Fatty-Liver"]')?.checked ? 1 : 0,
        hep_unk: document.querySelector('input[name="hepatic_problems_list"][value="Hepatitis-type-unknown"]')?.checked ? 1 : 0,
        aut_he: document.querySelector('input[name="hepatic_problems_list"][value="Autoimmune-hepatitis"]')?.checked ? 1 : 0,
        jnhs: document.querySelector('input[name="hepatic_problems_list"][value="Jaundice-not-hepatitis-specific"]')?.checked ? 1 : 0,
        help_synd: document.querySelector('input[name="hepatic_problems_list"][value="HELP-syndrome"]')?.checked ? 1 : 0,
        liver_trans: document.querySelector('input[name="hepatic_problems_list"][value="Liver-transplant"]')?.checked ? 1 : 0,
        hepa: document.querySelector('input[name="hepatic_problems_list"][value="Hepatitis-A"]')?.checked ? 1 : 0,
        obs_chl: document.querySelector('input[name="hepatic_problems_list"][value="Obstetric-cholestasis"]')?.checked ? 1 : 0,
        hepb: document.querySelector('input[name="hepatic_problems_list"][value="Hepatitis-B"]')?.checked ? 1 : 0,
        oth_hep_prd: document.querySelector('input[name="hepatic_problems_list"][value="Other-hepatic-problem"]')?.checked ? 1 : 0,
        hepc: document.querySelector('input[name="hepatic_problems_list"][value="Hepatitis-C"]')?.checked ? 1 : 0,

        // Fetal  Movements
        foetal_movements: document.querySelector('input[name="foetal_movements"]')?.value || '',
        episodes: document.querySelector('input[name="episodes"]')?.value || '',

        // Gastrointestinal Problems
        gas_prb: document.querySelector('input[name="gastrointestinal_problems"]')?.value || '',
        achalasia: document.querySelector('input[name="gastrointestinal_problems_list"][value="Achalasia"]')?.checked ? 1 : 0,
        haemorrhoids_not_treated: document.querySelector('input[name="gastrointestinal_problems_list"][value="Haemorrhoids-not-treated"]')?.checked ? 1 : 0,
        cholecystitis: document.querySelector('input[name="gastrointestinal_problems_list"][value="Cholecystitis"]')?.checked ? 1 : 0,
        hiatus_hernia: document.querySelector('input[name="gastrointestinal_problems_list"][value="Hiatus-hernia"]')?.checked ? 1 : 0,
        coeliac_disease: document.querySelector('input[name="gastrointestinal_problems_list"][value="Coeliac-disease"]')?.checked ? 1 : 0,
        irritable_bowel_syndrome: document.querySelector('input[name="gastrointestinal_problems_list"][value="Irritable-bowel-syndrome"]')?.checked ? 1 : 0,
        crohns_disease: document.querySelector('input[name="gastrointestinal_problems_list"][value="Crohns-disease"]')?.checked ? 1 : 0,
        malabsorption_syndrome: document.querySelector('input[name="gastrointestinal_problems_list"][value="Malabsorption-syndrome"]')?.checked ? 1 : 0,
        faecal_incontinence: document.querySelector('input[name="gastrointestinal_problems_list"][value="Faecal-incontinence"]')?.checked ? 1 : 0,
        pancreatitis: document.querySelector('input[name="gastrointestinal_problems_list"][value="Pancreatitis"]')?.checked ? 1 : 0,
        gastric_band: document.querySelector('input[name="gastrointestinal_problems_list"][value="Gastric-band"]')?.checked ? 1 : 0,
        ulcerative_colitis: document.querySelector('input[name="gastrointestinal_problems_list"][value="Ulcerative-colitis"]')?.checked ? 1 : 0,
        gastric_ulcer: document.querySelector('input[name="gastrointestinal_problems_list"][value="Gastric-ulcer"]')?.checked ? 1 : 0,
        garothr: document.querySelector('input[name="gastrointestinal_problems_list"][value="Other"]')?.checked ? 1 : 0,
        haemorrhoids_treated: document.querySelector('input[name="gastrointestinal_problems_list"][value="Haemorrhoids-treated"]')?.checked ? 1 : 0,

        // Endocrine Problems
        endo: document.querySelector('input[name="endocrine_problems"]')?.value || '',
        addison_disease: document.querySelector('input[name="endocrine_problems_list"][value="Addisons-disease"]')?.checked ? 1 : 0,
        hyperthyroidism_current: document.querySelector('input[name="endocrine_problems_list"][value="Hyperthyroidism-current"]')?.checked ? 1 : 0,
        autoimmune_hypothyroidism: document.querySelector('input[name="endocrine_problems_list"][value="Autoimmune-hypothyroidism"]')?.checked ? 1 : 0,
        hyperthyroidism: document.querySelector('input[name="endocrine_problems_list"][value="Hyperthyroidism-past"]')?.checked ? 1 : 0,
        cushings_syndrome: document.querySelector('input[name="endocrine_problems_list"][value="Cushings-syndrome"]')?.checked ? 1 : 0,
        hypothyroidism: document.querySelector('input[name="endocrine_problems_list"][value="Hypothyroidism"]')?.checked ? 1 : 0,
        diabetes_type_1: document.querySelector('input[name="endocrine_problems_list"][value="Diabetes-type-1"]')?.checked ? 1 : 0,
        pituitary_disorder: document.querySelector('input[name="endocrine_problems_list"][value="Pituitary-disorder"]')?.checked ? 1 : 0,
        diabetes_type_2: document.querySelector('input[name="endocrine_problems_list"][value="Diabetes-type-2"]')?.checked ? 1 : 0,
        posysn: document.querySelector('input[name="endocrine_problems_list"][value="Polycystic-ovarian-syndrome"]')?.checked ? 1 : 0,
        endocrine_disease: document.querySelector('input[name="endocrine_problems_list"][value="Endocrine-disease"]')?.checked ? 1 : 0,
        endocothr: document.querySelector('input[name="endocrine_problems_list"][value="Other"]')?.checked ? 1 : 0,
        gestational_diabetes: document.querySelector('input[name="endocrine_problems_list"][value="Gestational-diabetes"]')?.checked ? 1 : 0,

        // Neurological Problems
        neuro_prd: document.querySelector('input[name="neurological_problems"]')?.value || '',
        adhd__add: document.querySelector('input[name="neurological_problems_list"][value="ADHD/ADD"]')?.checked ? 1 : 0,
        psh: document.querySelector('input[name="neurological_problems_list"][value="Previous-subarachnoid-haemorrhage"]')?.checked ? 1 : 0,
        asd: document.querySelector('input[name="neurological_problems_list"][value="Autism-Spectrum-Disorder"]')?.checked ? 1 : 0,
        stroke: document.querySelector('input[name="neurological_problems_list"][value="Stroke"]')?.checked ? 1 : 0,
        cerebral_palsy: document.querySelector('input[name="neurological_problems_list"][value="Cerebral-palsy"]')?.checked ? 1 : 0,
        fne: document.querySelector('input[name="neurological_problems_list"][value="Fits-not-epilepsy"]')?.checked ? 1 : 0,
        cfs: document.querySelector('input[name="neurological_problems_list"][value="Chronic-fatigue-syndrome"]')?.checked ? 1 : 0,
        migraine: document.querySelector('input[name="neurological_problems_list"][value="Migraine"]')?.checked ? 1 : 0,
        enm: document.querySelector('input[name="neurological_problems_list"][value="Epilepsy-no-medication"]')?.checked ? 1 : 0,
        migrain_severe: document.querySelector('input[name="neurological_problems_list"][value="Migraine-severe"]')?.checked ? 1 : 0,
        erm: document.querySelector('input[name="neurological_problems_list"][value="Epilepsy-requires-medication"]')?.checked ? 1 : 0,
        neuromuscular_disorder: document.querySelector('input[name="neurological_problems_list"][value="Neuromuscular-disorder"]')?.checked ? 1 : 0,
        multiple_sclerosis: document.querySelector('input[name="neurological_problems_list"][value="Multiple-sclerosis"]')?.checked ? 1 : 0,
        spina_bifida: document.querySelector('input[name="neurological_problems_list"][value="Spina-bifida"]')?.checked ? 1 : 0,
        myotonic_dystrophy: document.querySelector('input[name="neurological_problems_list"][value="Myotonic-dystrophy"]')?.checked ? 1 : 0,
        nuero_prb_othr: document.querySelector('input[name="neurological_problems_list"][value="Other"]')?.checked ? 1 : 0,
        neuropathy: document.querySelector('input[name="neurological_problems_list"][value="Neuropathy"]')?.checked ? 1 : 0,

        // Autoimmune Disease
        auto_dis: document.querySelector('input[name="autoimmune_disease"]')?.value || '',
        gestational_pemphigoid: document.querySelector('input[name="autoimmune_disease_list"][value="Gestational-pemphigoid"]')?.checked ? 1 : 0,
        sclerosis: document.querySelector('input[name="autoimmune_disease_list"][value="Multiple-sclerosis"]')?.checked ? 1 : 0,
        myasthenia_gravis: document.querySelector('input[name="autoimmune_disease_list"][value="Myasthenia-Gravis"]')?.checked ? 1 : 0,
        pernicious_anaemia: document.querySelector('input[name="autoimmune_disease_list"][value="Pernicious-anaemia"]')?.checked ? 1 : 0,
        psoriasis: document.querySelector('input[name="autoimmune_disease_list"][value="Psoriasis"]')?.checked ? 1 : 0,
        psoriatic_arthropathy: document.querySelector('input[name="autoimmune_disease_list"][value="Psoriatic-arthropathy"]')?.checked ? 1 : 0,
        rheumatoid_arthritis: document.querySelector('input[name="autoimmune_disease_list"][value="Rheumatoid-arthritis"]')?.checked ? 1 : 0,
        syst_lup_eryth: document.querySelector('input[name="autoimmune_disease_list"][value="Systemic-lupus-erythematosus"]')?.checked ? 1 : 0,
        systemic_sclerosis: document.querySelector('input[name="autoimmune_disease_list"][value="Systemic-sclerosis"]')?.checked ? 1 : 0,
        vitiligo: document.querySelector('input[name="autoimmune_disease_list"][value="Vitiligo"]')?.checked ? 1 : 0,
        autodis_othe: document.querySelector('input[name="autoimmune_disease_list"][value="Other"]')?.checked ? 1 : 0,

        // Infections
        infection: document.querySelector('input[name="infections"]')?.value || '',
        no: document.querySelector('input[name="infections_list"][value="No"]')?.checked ? 1 : 0,
        groupb: document.querySelector('input[name="infections_list"][value="Group-B-streptococcus"]')?.checked ? 1 : 0,
        confidential_information: document.querySelector('input[name="infections_list"][value="Confidential-information"]')?.checked ? 1 : 0,
        hiv: document.querySelector('input[name="infections_list"][value="Human-immunodeficiency-virus"]')?.checked ? 1 : 0,
        candida: document.querySelector('input[name="infections_list"][value="Candida"]')?.checked ? 1 : 0,
        habite: document.querySelector('input[name="infections_list"][value="Habite"]')?.checked ? 1 : 0,
        c_difficile: document.querySelector('input[name="infections_list"][value="C-Difficile"]')?.checked ? 1 : 0,
        meningitis: document.querySelector('input[name="infections_list"][value="Meningitis"]')?.checked ? 1 : 0,
        chlamydia: document.querySelector('input[name="infections_list"][value="Chlamydia"]')?.checked ? 1 : 0,
        mrsa: document.querySelector('input[name="infections_list"][value="MRSA"]')?.checked ? 1 : 0,
        cytomegalovirus: document.querySelector('input[name="infections_list"][value="Cytomegalovirus"]')?.checked ? 1 : 0,
        parvovirus: document.querySelector('input[name="infections_list"][value="Parvovirus"]')?.checked ? 1 : 0,
        genital_herpes: document.querySelector('input[name="infections_list"][value="Genital-herpes"]')?.checked ? 1 : 0,
        polio: document.querySelector('input[name="infections_list"][value="Polio"]')?.checked ? 1 : 0,
        genital_warts: document.querySelector('input[name="infections_list"][value="Genital-warts"]')?.checked ? 1 : 0,
        rubella: document.querySelector('input[name="infections_list"][value="Rubella"]')?.checked ? 1 : 0,
        glandular_fever: document.querySelector('input[name="infections_list"][value="Glandular-fever"]')?.checked ? 1 : 0,
        syphilis: document.querySelector('input[name="infections_list"][value="Syphilis"]')?.checked ? 1 : 0,
        gonorrhoea: document.querySelector('input[name="infections_list"][value="Gonorrhea"]')?.checked ? 1 : 0,
        toxoplasmosis: document.querySelector('input[name="infections_list"][value="Toxoplasmosis"]')?.checked ? 1 : 0,
        covid19m6: document.querySelector('input[name="infections_list"][value="Covid-19-in-the-last-6-months"]')?.checked ? 1 : 0,
        tropical_disease: document.querySelector('input[name="infections_list"][value="Tropical-disease"]')?.checked ? 1 : 0,
        covid196m: document.querySelector('input[name="infections_list"][value="Covid-19-more-than-6-months-ago"]')?.checked ? 1 : 0,
        infectothr: document.querySelector('input[name="infections_list"][value="Other"]')?.checked ? 1 : 0,

        // Fertility Treatment
        fert_tre: document.querySelector('input[name="fertility_treatment"]')?.value || '',
        fert_no: document.querySelector('input[name="fertility_treatment_list"][value="No"]')?.checked ? 1 : 0,
        aibd: document.querySelector('input[name="fertility_treatment_list"][value="Artificial-insemination-by-donor"]')?.checked ? 1 : 0,
        artif_insemin: document.querySelector('input[name="fertility_treatment_list"][value="Artificial-insemination-by-partner"]')?.checked ? 1 : 0,
        bpdi: document.querySelector('input[name="fertility_treatment_list"][value="Became-pregnant-during-investigations"]')?.checked ? 1 : 0,
        clomiphene: document.querySelector('input[name="fertility_treatment_list"][value="Clomiphene"]')?.checked ? 1 : 0,
        gift: document.querySelector('input[name="fertility_treatment_list"][value="GIFT"]')?.checked ? 1 : 0,
        icsi_own_egg: document.querySelector('input[name="fertility_treatment_list"][value="ICSI-(own-egg)"]')?.checked ? 1 : 0,
        icsi_donor_egg: document.querySelector('input[name="fertility_treatment_list"][value="ICSI-(donor-egg)"]')?.checked ? 1 : 0,
        iui: document.querySelector('input[name="fertility_treatment_list"][value="Intrauterine-insemination-(IUI)"]')?.checked ? 1 : 0,
        ivf_own_egg: document.querySelector('input[name="fertility_treatment_list"][value="In-vitro-fertilization-(IVF)-(own-egg)"]')?.checked ? 1 : 0,
        ivf_donar_egg: document.querySelector('input[name="fertility_treatment_list"][value="In-vitro-fertilization-(IVF)-(donor-egg)"]')?.checked ? 1 : 0,
        hgc: document.querySelector('input[name="fertility_treatment_list"][value="Human-chorionic-gonadotrophin-(HCG)"]')?.checked ? 1 : 0,
        pergonal_or_metrodin: document.querySelector('input[name="fertility_treatment_list"][value="Pergonal-or-Metrodin"]')?.checked ? 1 : 0,
        reversal_of_sterilisation: document.querySelector('input[name="fertility_treatment_list"][value="Reversal-of-sterilisation"]')?.checked ? 1 : 0,
        surrogate_pregnancy: document.querySelector('input[name="fertility_treatment_list"][value="Surrogate-pregnancy"]')?.checked ? 1 : 0,
        tubal_surgery: document.querySelector('input[name="fertility_treatment_list"][value="Tubal-surgery"]')?.checked ? 1 : 0,
        yes_not_wish: document.querySelector('input[name="fertility_treatment_list"][value="Yes,-but-does-not-wish-to-discuss"]')?.checked ? 1 : 0,
        fertiother: document.querySelector('input[name="fertility_treatment_list"][value="Other"]')?.checked ? 1 : 0,

        // LMP
        lmp: document.querySelector('input[name="lmp_date"]')?.value || '',
        lmpopt: document.querySelector('input[name="lmp_option"]')?.value || '',

        // Bleeding in Pregnancy
        preg: document.querySelector('input[name="bleeding_in_pregnancy"]')?.value || '',

        // Medication in Pregnancy
        med_dur_preg: document.querySelector('input[name="medication_in_pregnancy"]')?.value || '',
        medinone: document.querySelector('input[name="medication_in_pregnancy_list"][value="None"]')?.checked ? 1 : 0,
        asthma_drugs: document.querySelector('input[name="medication_in_pregnancy_list"][value="Asthma-drugs"]')?.checked ? 1 : 0,
        analgesics: document.querySelector('input[name="medication_in_pregnancy_list"][value="Analgesics"]')?.checked ? 1 : 0,
        aspirin: document.querySelector('input[name="medication_in_pregnancy_list"][value="Aspirin"]')?.checked ? 1 : 0,
        antacids: document.querySelector('input[name="medication_in_pregnancy_list"][value="Antacids"]')?.checked ? 1 : 0,
        insulin: document.querySelector('input[name="medication_in_pregnancy_list"][value="Insulin"]')?.checked ? 1 : 0,
        antibiotics: document.querySelector('input[name="medication_in_pregnancy_list"][value="Antibiotics"]')?.checked ? 1 : 0,
        levothyroxine: document.querySelector('input[name="medication_in_pregnancy_list"][value="Levothyroxine"]')?.checked ? 1 : 0,
        antid: document.querySelector('input[name="medication_in_pregnancy_list"][value="Anti-D"]')?.checked ? 1 : 0,
        lithium: document.querySelector('input[name="medication_in_pregnancy_list"][value="Lithium"]')?.checked ? 1 : 0,
        antidepressants: document.querySelector('input[name="medication_in_pregnancy_list"][value="Antidepressants"]')?.checked ? 1 : 0,
        multivitamins: document.querySelector('input[name="medication_in_pregnancy_list"][value="Multivitamins"]')?.checked ? 1 : 0,
        antihypertensives: document.querySelector('input[name="medication_in_pregnancy_list"][value="Antihypertensives"]')?.checked ? 1 : 0,
        oral_hypoglycemics: document.querySelector('input[name="medication_in_pregnancy_list"][value="Oral-hypoglycemics"]')?.checked ? 1 : 0,
        oncology_drugs: document.querySelector('input[name="medication_in_pregnancy_list"][value="Oncology-drugs"]')?.checked ? 1 : 0,
        roaccutane: document.querySelector('input[name="medication_in_pregnancy_list"][value="Roaccutane"]')?.checked ? 1 : 0,
        vitamind: document.querySelector('input[name="medication_in_pregnancy_list"][value="Vitamin-D"]')?.checked ? 1 : 0,
        med_opthrt: document.querySelector('input[name="medication_in_pregnancy_list"][value="Other"]')?.checked ? 1 : 0,
        specify_other_medication: document.querySelector('input[name="other_medication"]')?.value || '',

        // Smoking & Alcohol
        smoked: document.querySelector('input[name="ever_smoked"]')?.value || '',
        co_ppm: document.querySelector('input[name="co_reading_ppm"]')?.value || '',
        not_taken: document.querySelector('input[name="co_reading_not_taken"]')?.checked ? 1 : 0,
        hou_smok: document.querySelector('input[name="smoker_in_household"]')?.value || '',
        alco_wek: document.querySelector('input[name="alcohol_at_booking"]')?.value || '',
        none: document.querySelector('input[name="alcohol_none"]')?.checked ? 1 : 0,

        // Substance Use
        sub_preg: document.querySelector('input[name="substance_use_before"]')?.value || '',
        never_used: document.querySelector('input[name="substance_use_before_list"][value="Never-used"]')?.checked ? 1 : 0,
        crystal_meth: document.querySelector('input[name="substance_use_before_list"][value="Crystal-meth"]')?.checked ? 1 : 0,
        declined_to_answer: document.querySelector('input[name="substance_use_before_list"][value="Declined-to-answer"]')?.checked ? 1 : 0,
        diazepam: document.querySelector('input[name="substance_use_before_list"][value="Diazepam"]')?.checked ? 1 : 0,
        acid: document.querySelector('input[name="substance_use_before_list"][value="Acid"]')?.checked ? 1 : 0,
        ecstasy: document.querySelector('input[name="substance_use_before_list"][value="Ecstasy"]')?.checked ? 1 : 0,
        amphetamines: document.querySelector('input[name="substance_use_before_list"][value="Amphetamines"]')?.checked ? 1 : 0,
        glue: document.querySelector('input[name="substance_use_before_list"][value="Glue"]')?.checked ? 1 : 0,
        cannabis: document.querySelector('input[name="substance_use_before_list"][value="Cannabis"]')?.checked ? 1 : 0,
        heroin: document.querySelector('input[name="substance_use_before_list"][value="Heroin"]')?.checked ? 1 : 0,
        cocaine: document.querySelector('input[name="substance_use_before_list"][value="Cocaine"]')?.checked ? 1 : 0,
        ketamine: document.querySelector('input[name="substance_use_before_list"][value="Ketamine"]')?.checked ? 1 : 0,
        crack: document.querySelector('input[name="substance_use_before_list"][value="Crack"]')?.checked ? 1 : 0,
        khat: document.querySelector('input[name="substance_use_before_list"][value="Khat"]')?.checked ? 1 : 0,
        lighter_fuel: document.querySelector('input[name="substance_use_before_list"][value="Lighter-fuel"]')?.checked ? 1 : 0,
        lsd: document.querySelector('input[name="substance_use_before_list"][value="LSD"]')?.checked ? 1 : 0,
        methadone: document.querySelector('input[name="substance_use_before_list"][value="Methadone"]')?.checked ? 1 : 0,
        speed: document.querySelector('input[name="substance_use_before_list"][value="Speed"]')?.checked ? 1 : 0,
        subutex: document.querySelector('input[name="substance_use_before_list"][value="Subutex"]')?.checked ? 1 : 0,
        temazepam: document.querySelector('input[name="substance_use_before_list"][value="Temazepam"]')?.checked ? 1 : 0,
        subothr: document.querySelector('input[name="substance_use_before_list"][value="Other"]')?.checked ? 1 : 0,

        // Physical Measurements
        wom_hg: document.querySelector('input[name="height_m"]')?.value || '',
        not_performed: document.querySelector('input[name="height_not_performed"]')?.checked ? 1 : 0,
        height_unit: document.querySelector('#heightUnit')?.value || 'Meters',
        wom_wg: document.querySelector('input[name="weight_at_booking"]')?.value || '',
        not_weighed: document.querySelector('input[name="weight_not_weighed"]')?.checked ? 1 : 0,
        weight_unit: document.querySelector('#weightUnit')?.value || 'Kilograms',
        wom_blod_pres: document.querySelector('input[name="bp_at_booking"]')?.value || '',
        no_perf: document.querySelector('input[name="bp_not_performed"]')?.checked ? 1 : 0,

        // Anomaly Scan
        abnor_scn: document.querySelector('input[name="anomaly_scan_result"]')?.value || '',
        no_abnor: document.querySelector('input[name="anomaly_scan_result_list"][value="No-abnormality-detected"]')?.checked ? 1 : 0,
        anencephaly: document.querySelector('input[name="anomaly_scan_result_list"][value="Anencephaly"]')?.checked ? 1 : 0,
        bra: document.querySelector('input[name="anomaly_scan_result_list"][value="Bilateral-renal-agenesis"]')?.checked ? 1 : 0,
        cleft_lip: document.querySelector('input[name="anomaly_scan_result_list"][value="Cleft-lip"]')?.checked ? 1 : 0,
        diaphragmatic_hernia: document.querySelector('input[name="anomaly_scan_result_list"][value="Diaphragmatic-hernia"]')?.checked ? 1 : 0,
        exomphalos: document.querySelector('input[name="anomaly_scan_result_list"][value="Exomphalos"]')?.checked ? 1 : 0,
        gastroschisis: document.querySelector('input[name="anomaly_scan_result_list"][value="Gastroschisis"]')?.checked ? 1 : 0,
        lethal_sket_dys: document.querySelector('input[name="anomaly_scan_result_list"][value="Lethal-skeletal-dysplasia"]')?.checked ? 1 : 0,
        osb: document.querySelector('input[name="anomaly_scan_result_list"][value="Open-spina-bifida"]')?.checked ? 1 : 0,
        sca: document.querySelector('input[name="anomaly_scan_result_list"][value="Serious-cardiac-abnormality"]')?.checked ? 1 : 0,
        trisomy_13: document.querySelector('input[name="anomaly_scan_result_list"][value="Trisomy-13"]')?.checked ? 1 : 0,
        trisomy_18: document.querySelector('input[name="anomaly_scan_result_list"][value="Trisomy-18"]')?.checked ? 1 : 0,
        admonr_other: document.querySelector('input[name="anomaly_scan_result_list"][value="Other"]')?.checked ? 1 : 0,

        // FGR Risks
        gr_res_prb: document.querySelector('input[name="fgr_risks"]')?.value || '',
        no_risk: document.querySelector('input[name="fgr_risks_list"][value="No-risk-factors-identified"]')?.checked ? 1 : 0,
        mat_age: document.querySelector('input[name="fgr_risks_list"][value="Maternal-Age->40yrs-at-booking"]')?.checked ? 1 : 0,
        antiphospholipid: document.querySelector('input[name="fgr_risks_list"][value="Antiphospholipid"]')?.checked ? 1 : 0,
        med_condi: document.querySelector('input[name="fgr_risks_list"][value="Medical-conditions-high-FGR-risk"]')?.checked ? 1 : 0,
        afa: document.querySelector('input[name="fgr_risks_list"][value="AFH-Significant"]')?.checked ? 1 : 0,
        stillbirth_sga: document.querySelector('input[name="fgr_risks_list"][value="Prev-stillbirth-SGA"]')?.checked ? 1 : 0,
        chronic_hypertension: document.querySelector('input[name="fgr_risks_list"][value="Chronic-Hypertension"]')?.checked ? 1 : 0,
        psab: document.querySelector('input[name="fgr_risks_list"][value="Prev-stillbirth-appropriate-gest-birthweight"]')?.checked ? 1 : 0,
        chronic_rental: document.querySelector('input[name="fgr_risks_list"][value="Chronic-renal-failure"]')?.checked ? 1 : 0,
        pre_sga: document.querySelector('input[name="fgr_risks_list"][value="Prev-stillbirth-SGA"]')?.checked ? 1 : 0,
        drug_misuse: document.querySelector('input[name="fgr_risks_list"][value="Drug-misuse"]')?.checked ? 1 : 0,
        red_preg: document.querySelector('input[name="fgr_risks_list"][value="Reduced-f(ri)-this-pregnancy"]')?.checked ? 1 : 0,
        bpn: document.querySelector('input[name="fgr_risks_list"][value="BPN-<10th-centile-this-pregnancy"]')?.checked ? 1 : 0,
        suasb: document.querySelector('input[name="fgr_risks_list"][value="Significant-Uterine-Anomalies"]')?.checked ? 1 : 0,
        feb: document.querySelector('input[name="fgr_risks_list"][value="Fetal-echogenic-bowel"]')?.checked ? 1 : 0,
        smoking_at_booking: document.querySelector('input[name="fgr_risks_list"][value="Smoking-at-booking"]')?.checked ? 1 : 0,
        fgrtp: document.querySelector('input[name="fgr_risks_list"][value="Fetal-growth-restriction-this-pregnancy"]')?.checked ? 1 : 0,
        ufsfim: document.querySelector('input[name="fgr_risks_list"][value="Unsuitable-for-SFI-monitoring"]')?.checked ? 1 : 0,
        hdtp: document.querySelector('input[name="fgr_risks_list"][value="Hypertensive-disease-this-pregnancy"]')?.checked ? 1 : 0,
        frg_othr: document.querySelector('input[name="fgr_risks_list"][value="Other"]')?.checked ? 1 : 0,
        hdpp: document.querySelector('input[name="fgr_risks_list"][value="Hypertensive-disease-prev-pregnancy"]')?.checked ? 1 : 0,
        pappa: document.querySelector('input[name="fgr_risks_list"][value="Low-PAPP-A"]')?.checked ? 1 : 0,

        fdr: document.querySelector('select[name="fgr_risk_status"]')?.value || '',

        // Pre-term Birth Risks
        pre_tr_birth: document.querySelector('input[name="preterm_birth_risks"]')?.value || '',
        no_risk_pre: document.querySelector('input[name="preterm_birth_risks_list"][value="No-risks-identified"]')?.checked ? 1 : 0,
        lletz_prev: document.querySelector('input[name="preterm_birth_risks_list"][value="LLETZ-unknown-depth"]')?.checked ? 1 : 0,
        cbir: document.querySelector('input[name="preterm_birth_risks_list"][value="Cone-Biopsy"]')?.checked ? 1 : 0,
        hosceehr: document.querySelector('input[name="preterm_birth_risks_list"][value="HO-significant-cervical-excisional-event"]')?.checked ? 1 : 0,
        hotfcc: document.querySelector('input[name="preterm_birth_risks_list"][value="HO-trachelectomy-for-cervical-cancer"]')?.checked ? 1 : 0,
        intr_adhe_syndro: document.querySelector('input[name="preterm_birth_risks_list"][value="Intrauterine-adhesions"]')?.checked ? 1 : 0,
        lletz: document.querySelector('input[name="preterm_birth_risks_list"][value="LLETZ-gt-10mm-depth-removed"]')?.checked ? 1 : 0,
        lletz_ir: document.querySelector('input[name="preterm_birth_risks_list"][value="LLETZ-2-or-more-procedures"]')?.checked ? 1 : 0,
        mul_preg: document.querySelector('input[name="preterm_birth_risks_list"][value="Multiple-Pregnancy"]')?.checked ? 1 : 0,
        prev_cerv_cercl: document.querySelector('input[name="preterm_birth_risks_list"][value="Prev-cervical-cerclage"]')?.checked ? 1 : 0,
        prev_aila: document.querySelector('input[name="preterm_birth_risks_list"][value="Previous-c/s-at-full-dilatation"]')?.checked ? 1 : 0,
        prev_pre_birth: document.querySelector('input[name="preterm_birth_risks_list"][value="Prev-preterm-birth-16-34wks"]')?.checked ? 1 : 0,
        prev_preterm: document.querySelector('input[name="preterm_birth_risks_list"][value="Prev-preterm-prelabour-SROM"]')?.checked ? 1 : 0,
        uterine_variant: document.querySelector('input[name="preterm_birth_risks_list"][value="Uterine-variant"]')?.checked ? 1 : 0,

        // Aspirin & Vitamin D
        asssris: document.querySelector('select[name="aspirin_risk_assessment"]')?.value || '',
        dvit: document.querySelector('select[name="vitamin_d_assessment"]')?.value || '',

        // Labor Details
        sep: document.querySelector('input[name="maternal_sepsis"]')?.value || '',
        induction_of_labor: document.querySelector('input[name="induction_of_labor"]')?.value || '',
        method: document.querySelector('input[name="induction_method"]')?.value || '',
        medication: document.querySelector('input[name="induction_medication"]')?.value || '',
        total_dose: document.querySelector('input[name="induction_dose"]')?.value || '',
        rupt_mem: document.querySelector('input[name="rom_datetime"]')?.value || '',
        liq_col: document.querySelector('select[name="liquor_color"]')?.value || '',
        sme_liq: document.querySelector('select[name="liquor_smell"]')?.value || '',
        slw_prw: document.querySelector('input[name="slow_progress"]')?.value || '',
        epid: document.querySelector('input[name="epidural"]')?.value || '',
        oxytocin_hr: document.querySelector('input[name="oxytocin_duration"]')?.value || '',

        // IVF Details
        ivf: document.querySelector('input[name="ivf_details"]')?.value || '',
        own_fresh: document.querySelector('input[name="ivf_details_list"][value="Own-fresh-embryos"]')?.checked ? 1 : 0,
        own_frozen: document.querySelector('input[name="ivf_details_list"][value="Own-frozen-embryos"]')?.checked ? 1 : 0,
        donor_oocyte: document.querySelector('input[name="ivf_details_list"][value="Donor-oocyte"]')?.checked ? 1 : 0,
        male_fact_indi: document.querySelector('input[name="ivf_details_list"][value="Male-factor"]')?.checked ? 1 : 0,
        icsiimsi: document.querySelector('input[name="ivf_details_list"][value="ICSI/IMSI"]')?.checked ? 1 : 0,
        donar_age: document.querySelector('input[name="donor_age"]')?.value || '',

        fev_lab: document.querySelector('input[name="maternal_fever"]')?.value || '',
        gyn_his: document.querySelector('textarea[name="gynaecological_history"]')?.value || '',
        mat_cond: document.querySelector('textarea[name="maternal_condition"]')?.value || '',
        mat_lb: document.querySelector('textarea[name="maternal_medication"]')?.value || '',

        // Placental Variables
        plac_path: document.querySelector('input[name="apla_syndrome"]')?.value || '',
        pre_ecla: document.querySelector('input[name="preeclampsia"]')?.value || '',
        plac_abnor: document.querySelector('select[name="placental_abnormality"]')?.value || '',

        // Fetal  Variables
        iugr: document.querySelector('input[name="current_iugr"]')?.value || '',
        abnor_drop: document.querySelector('input[name="abnormal_dopplers"]')?.value || '',

        // Multiple Pregnancy
        type: document.querySelector('input[name="multiple_pregnancy_type"]')?.value || '',
        chorionicity: document.querySelector('input[name="multiple_pregnancy_chorionicity"]')?.value || '',
        zygosity: document.querySelector('input[name="multiple_pregnancy_zygosity"]')?.value || '',

        presentation: document.querySelector('select[name="presentation"]')?.value || '',
        birthweight: document.querySelector('input[name="birth_weight"]')?.value || '',
        babys: document.querySelector('select[name="baby_sex"]')?.value || '',

        // APGAR Scores
        min1: document.querySelector('input[name="apgar_1min"]')?.value || '',
        min5: document.querySelector('input[name="apgar_5min"]')?.value || '',
        min10: document.querySelector('input[name="apgar_10min"]')?.value || '',

        oligohydra: document.querySelector('input[name="oligohydramnios"]')?.value || '',
        "4_presentation": document.querySelector('select[name="presentation"]')?.value || '',
        please_select: document.querySelector('select[name="current_mode_of_delivery"]')?.value || '',
        indication: document.querySelector('input[name="delivery_indication"]')?.value || '',
        card_neck: document.querySelector('input[name="cord_around_neck"]')?.value || '',
        plactal_abrupt: document.querySelector('input[name="placental_abruption"]')?.value || '',
        timendate: document.querySelector('input[name="birth_datetime"]')?.value || '',
        babycried: document.querySelector('input[name="baby_cried"]')?.value || '',
        neon_resus: document.querySelector('textarea[name="resuscitation_reason"]')?.value || '',
        neonatal_malfun: document.querySelector('textarea[name="congenital_malformations_details"]')?.value || '',
        neonatal_icu: document.querySelector('textarea[name="nicu_reason"]')?.value || '',
        birth_related: document.querySelector('textarea[name="birth_related"]')?.value || '',

        // Cord Blood - Arterial
        ph: document.querySelector('input[name="arterial_ph"]')?.value || '',
        base_excess: document.querySelector('input[name="arterial_base_excess"]')?.value || '',
        lactate: document.querySelector('input[name="arterial_lactate"]')?.value || '',
        foetal_hb: document.querySelector('input[name="arterial_hb"]')?.value || '',
        po2: document.querySelector('input[name="arterial_po2"]')?.value || '',
        pco2: document.querySelector('input[name="arterial_pco2"]')?.value || '',
        hco3: document.querySelector('input[name="arterial_hco3"]')?.value || '',

        // Cord Blood - Venous
        phv: document.querySelector('input[name="venous_ph"]')?.value || '',
        basev: document.querySelector('input[name="venous_base_excess"]')?.value || '',
        lactatev: document.querySelector('input[name="venous_lactate"]')?.value || '',
        foetalv: document.querySelector('input[name="venous_hb"]')?.value || '',
        po2v: document.querySelector('input[name="venous_po2"]')?.value || '',
        pco2v: document.querySelector('input[name="venous_pco2"]')?.value || '',
        hco3v: document.querySelector('input[name="venous_hco3"]')?.value || '',

        // Hospital Information
        hospital: document.querySelector('input[name="hospital"]')?.value || ''
    };

    // Collect Previous Pregnancies Table Data
    const prevPregnanciesTable = [];
    const prevPregInputs = document.querySelectorAll('[name^="prev_preg_"]');
    const numPrevPreg = parseInt(document.querySelector('input[name="previous_pregnancies"]')?.value) || 0;

    for (let i = 1; i <= numPrevPreg; i++) {
        prevPregnanciesTable.push({
            antenatal_problems: document.querySelector(`input[name="prev_preg_${i}_problems"]`)?.value || '',
            outcome: document.querySelector(`select[name="prev_preg_${i}_outcome"]`)?.value || '',
            mode_of_delivery: document.querySelector(`select[name="prev_preg_${i}_mode"]`)?.value || '',
            birth_weight: document.querySelector(`input[name="prev_preg_${i}_weight"]`)?.value || '',
            gestational_age: document.querySelector(`input[name="prev_preg_${i}_ga"]`)?.value || ''
        });
    }

    if (prevPregnanciesTable.length > 0) {
        formData.table_vtci = prevPregnanciesTable;
    }

    return formData;
}

// Function to show status messages
function showStatus(message, type = 'info') {
    const statusEl = document.createElement('div');
    statusEl.className = `alert alert-${type}`;
    statusEl.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 15px 20px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);';

    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };

    statusEl.style.backgroundColor = colors[type] || colors.info;
    statusEl.style.color = '#fff';
    statusEl.textContent = message;

    document.body.appendChild(statusEl);

    setTimeout(() => {
        statusEl.remove();
    }, 5000);
}

/**
 * Uploads a single file to Frappe's 'upload_file' method
 * and returns the server URL.
 */
async function uploadFile(file, apiKey, apiSecret, methodUrl) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('is_private', '0'); // 0 = Public, 1 = Private

    try {
        // Note: The base URL for this MUST be root, not /api/resource
        const resp = await fetch(methodUrl + "/api/method/upload_file", {
            method: 'POST',
            headers: {
                'Authorization': 'token ' + apiKey + ':' + apiSecret,
            },
            credentials: 'include',
            body: formData
        });

        if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({}));
            throw new Error(errorData.message || 'File upload failed');
        }

        const result = await resp.json();
        if (result.message && result.message.file_url) {
            return result.message.file_url; // This is the files/filename.jpg URL
        } else {
            throw new Error('Invalid response from file upload');
        }
    } catch (err) {
        console.error('File upload failed', err);
        throw err;
    }
}



// Function to populate form with existing data
function populateFormWithData(data) {
    if (!data) return;

    // Clear form first
    medicalForm.reset();

    // Populate all form fields based on the data
    Object.keys(data).forEach(key => {
        const value = data[key];
        if (value === null || value === undefined) return;

        // Handle different input types
        const input = medicalForm.querySelector(`[name="${key}"]`);
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = value === 1 || value === true;
            } else if (input.type === 'radio') {
                const radio = medicalForm.querySelector(`[name="${key}"][value="${value}"]`);
                if (radio) radio.checked = true;
            } else {
                input.value = value;
            }
        }

        // Handle select elements
        const select = medicalForm.querySelector(`select[name="${key}"]`);
        if (select) {
            select.value = value;
        }

        // Handle textarea
        const textarea = medicalForm.querySelector(`textarea[name="${key}"]`);
        if (textarea) {
            textarea.value = value;
        }
    });

    // Update global record name
    window.globalRecordName = data.name;

    // Update button visibility based on document status and user role
    if (window.canEditSubmitted !== undefined) {
        // Role check already completed
        updateButtonVisibility(data.docstatus || 0);
    } else {
        // Role check not completed yet, wait for it
        setTimeout(() => {
            updateButtonVisibility(data.docstatus || 0);
        }, 500);
    }

    showStatus('Patient data loaded successfully!', 'success');
}

async function saveToFrappe(formData) {
    try {


        // Debug credentials first
        if (!debugCredentials()) {
            throw new Error('API credentials are not properly configured. Please contact your administrator.');
        }

        // First check if we're editing an existing document
        const urlParams = new URLSearchParams(window.location.search);
        let existingRecordName = urlParams.get('name');
        let isUpdate = existingRecordName && existingRecordName.trim() !== '';
        let existingRecord = null;



        // Extract attachments BEFORE JSON stringification (File objects can't be serialized)
        const attachments = formData.attachments || [];
        console.log('Extracted attachments before JSON conversion:', attachments.length, 'files');

        // Remove attachments from formData before JSON conversion
        const formDataCopy = JSON.parse(JSON.stringify(formData));
        delete formDataCopy.attachments;

        const payload = formDataCopy;

        // First, save the main record without attachments
        console.log('Authorization header:', `token ${API_KEY}:${API_SECRET}`);
        console.log(isUpdate ? `Updating existing record: ${existingRecordName}` : 'Creating new record');

        const apiUrl = isUpdate ? `${FRAPPE_API_BASE}/${DOCTYPE_NAME}/${existingRecordName}` : `${FRAPPE_API_BASE}/${DOCTYPE_NAME}`;
        const method = isUpdate ? 'PUT' : 'POST';

        const response = await fetch(apiUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `token ${API_KEY}:${API_SECRET}`
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        let result = null;
        if (response.ok) {
            result = await response.json();
            const recordName = isUpdate ? existingRecordName : (result.data ? result.data.name : null);
            

        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error response:', errorData);
            let errorMessage = 'Failed to save data';

            if (errorData._server_messages) {
                try {
                    const serverMessages = JSON.parse(errorData._server_messages);
                    errorMessage = serverMessages.map(m => JSON.parse(m).message).join(', ');
                } catch (e) {
                    errorMessage = errorData.message || errorMessage;
                }
            } else if (errorData.message) {
                errorMessage = errorData.message;
            } else if (response.status === 401) {
                errorMessage = 'Authentication failed. Please check your API credentials.';
            } else if (response.status === 403) {
                errorMessage = 'Permission denied. You may not have permission to create or update records.';
            } else if (response.status === 404) {
                errorMessage = 'Document type not found. Please check the DOCTYPE_NAME.';
            }

            // Strip HTML tags from error messages
            errorMessage = errorMessage.replace(/<[^>]*>/g, '');

            // Check for specific permission issues
            if (errorMessage.includes('does not have doctype access')) {
                errorMessage = 'Permission denied. Contact administrator.';
            }

            throw new Error(errorMessage);
        }

        const recordName = isUpdate ? existingRecordName : (result.data ? result.data.name : null);

        console.log('Main record saved:', recordName);

        // Store the record name globally for CSV attachment
        window.currentRecordName = recordName;
        console.log('Record name stored for CSV attachment:', window.currentRecordName);

        // Update global record name in HTML context
        if (typeof window.globalRecordName !== 'undefined') {
            window.globalRecordName = recordName;

            // Update URL with the new record name without reloading the page
            if (!isUpdate) {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('name', recordName);
                window.history.pushState({ path: newUrl.href }, '', newUrl.href);

            }

            // Clear cache when record changes
            cachedFinalCtgData = null;
            // Fetch attachments after record name is updated
            setTimeout(fetchAttachments, 500);
        }

        // Show appropriate success message
        if (isUpdate) {
            showStatus(`Record ${existingRecordName} updated successfully!`, 'success');
        } else {
            showStatus(`New record ${recordName} created successfully!`, 'success');
        }

        // Update button visibility based on new status
        if (result && result.data) {
            updateButtonVisibility(result.data.docstatus || 0);
        }

        // Now handle file attachments if any - only process local files (not yet uploaded)
        const localFiles = attachments ? attachments.filter(file =>
            file instanceof File || (file.type === 'local' && file.raw)
        ) : [];

        if (localFiles.length > 0) {
            showStatus('Uploading pending attachments...', 'info');


            // Upload each local file and create File documents linked to the main record
            await Promise.all(
                localFiles.map(async (file, index) => {
                    const fileToUpload = file.raw || file; // Handle both File objects and file objects with raw property
                    if (fileToUpload instanceof File) {
                        try {
                            console.log(`Processing local file ${index + 1}:`, fileToUpload.name, fileToUpload.size);

                            // First upload the file
                            const fileUrl = await uploadFile(fileToUpload, API_KEY, API_SECRET, FRAPPE_API_BASE.replace("/api/resource", ""));


                            // Then create a File document linked to the main record
                            const fileDocPayload = {
                                doctype: 'File',
                                file_name: fileToUpload.name,
                                file_url: fileUrl,
                                attached_to_doctype: DOCTYPE_NAME,
                                attached_to_name: recordName,
                                is_private: 0
                            };

                            console.log(`Creating File document with payload:`, JSON.stringify(fileDocPayload, null, 2));

                            const fileDocResponse = await fetch(`${FRAPPE_API_BASE}/File`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `token ${API_KEY}:${API_SECRET}`
                                },
                                credentials: 'include',
                                body: JSON.stringify(fileDocPayload)
                            });

                            const fileDocResult = await fileDocResponse.json();
                            console.log(`File document creation response for ${fileToUpload.name}:`, fileDocResponse.status, fileDocResult);
                            console.log(`File document creation body:`, JSON.stringify(fileDocResult, null, 2));

                            if (fileDocResponse.ok) {
                                console.log(`File ${fileToUpload.name} attached to record ${recordName} successfully`);
                            } else {
                                console.error(`Failed to attach file ${fileToUpload.name}:`, fileDocResponse.status, fileDocResult);
                                console.error(`Full error details:`, JSON.stringify(fileDocResult, null, 2));
                            }

                        } catch (err) {
                            console.error(`Failed to upload file: ${fileToUpload.name}`, err);
                            // Continue with other files even if one fails
                        }
                    } else {
                        console.log(`Skipping attachment ${index} - not a File object:`, typeof fileToUpload);
                    }
                })
            );
        } else {
            console.log('No local attachments to process (files already uploaded)');
        }

        // Refresh attachments list after upload
        setTimeout(fetchAttachments, 1000);

        // Reset unsaved changes flag after successful save
        if (window.resetUnsavedChanges) {
            window.resetUnsavedChanges();
        }

        return result;

    } catch (err) {
        console.error('Save failed:', err);
        showStatus(err.message || 'Failed to save data', 'error');
        throw err;
    }
}

// Add submit function to properly submit documents
async function submitDocument(recordName) {
    try {


        const response = await fetch(`${FRAPPE_API_BASE}/${DOCTYPE_NAME}/${recordName}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `token ${API_KEY}:${API_SECRET}`
            },
            credentials: 'include',
            body: JSON.stringify({
                docstatus: 1  // This submits the document
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = 'Failed to submit document';

            if (errorData._server_messages) {
                try {
                    const serverMessages = JSON.parse(errorData._server_messages);
                    errorMessage = serverMessages.map(m => JSON.parse(m).message).join(', ');
                } catch (e) {
                    errorMessage = errorData.message || errorMessage;
                }
            } else if (errorData.message) {
                errorMessage = errorData.message;
            }

            throw new Error(errorMessage);
        }

        const result = await response.json();
        showStatus('Document submitted successfully!', 'success');



        // Reset unsaved changes flag after successful submission
        if (window.resetUnsavedChanges) {
            window.resetUnsavedChanges();
        }

        return result;

    } catch (err) {
        console.error('Submit failed:', err);
        showStatus(err.message || 'Failed to submit document', 'error');
        throw err;
    }
}

// Add function to cancel (unsubmit) document for editing
async function cancelDocument(recordName) {
    try {
        const response = await fetch(`${FRAPPE_API_BASE}/${DOCTYPE_NAME}/${recordName}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `token ${API_KEY}:${API_SECRET}`
            },
            credentials: 'include',
            body: JSON.stringify({
                docstatus: 2  // This cancels the document (makes it editable)
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = 'Failed to cancel document';

            if (errorData._server_messages) {
                try {
                    const serverMessages = JSON.parse(errorData._server_messages);
                    errorMessage = serverMessages.map(m => JSON.parse(m).message).join(', ');
                } catch (e) {
                    errorMessage = errorData.message || errorMessage;
                }
            } else if (errorData.message) {
                errorMessage = errorData.message;
            }

            // Strip HTML tags from error messages
            errorMessage = errorMessage.replace(/<[^>]*>/g, '');

            // Check for permission issues specifically
            if (response.status === 403 || errorMessage.includes('does not have doctype access')) {
                errorMessage = 'Permission denied. Contact administrator.';
            }

            throw new Error(errorMessage);
        }

        const result = await response.json();

        return result;

    } catch (err) {
        console.error('Cancel failed:', err);
        showStatus(err.message || 'Failed to cancel document', 'error');
        throw err;
    }
}

// Function to make form read-only
function makeFormReadOnly(isReadOnly = true) {
    const form = document.getElementById('medicalForm');
    if (!form) return;

    // List of elements to disable/enable
    const elements = form.querySelectorAll('input, select, textarea, button:not(.tab-btn):not(.nav-btn):not(.modal-close-btn):not(.modal-ok-btn)');

    elements.forEach(el => {
        // Don't disable navigation buttons or list back button
        if (el.classList.contains('nav-btn') || el.id === 'backToListBtn') return;

        // Don't disable the Save/Submit buttons themselves as we handle them separately
        if (el.id === 'saveBtn' || el.id === 'submitBtn') return;

        if (el.tagName === 'BUTTON') {
            el.disabled = isReadOnly;
            if (isReadOnly) {
                el.style.pointerEvents = 'none';
                el.style.opacity = '0.7';
            } else {
                el.style.pointerEvents = 'auto';
                el.style.opacity = '1';
            }
        } else {
            el.readOnly = isReadOnly;
            if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio') {
                el.disabled = isReadOnly;
            }

            if (isReadOnly) {
                el.classList.add('bg-gray-800', 'cursor-not-allowed');
                el.style.opacity = '0.8';
            } else {
                el.classList.remove('bg-gray-800', 'cursor-not-allowed');
                el.style.opacity = '1';
            }
        }
    });

    // Handle yes-no groups specifically
    const yesNoBtns = form.querySelectorAll('.yes-no-group button');
    yesNoBtns.forEach(btn => {
        btn.disabled = isReadOnly;
        if (isReadOnly) {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.6';
        } else {
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        }
    });

    // Handle specific interactive elements like raceLookupBtn
    const lookupBtns = form.querySelectorAll('#raceLookupBtn, #hospitalLookupBtn, .btn-specify');
    lookupBtns.forEach(btn => {
        btn.disabled = isReadOnly;
        if (isReadOnly) {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.5';
        } else {
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        }
    });
}

// Function to update button visibility based on document status
function updateButtonVisibility(docstatus = 0) {
    window.currentDocStatus = docstatus;
    const saveBtn = document.getElementById('saveBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (!saveBtn || !submitBtn) {
        return;
    }

    // Hide all buttons first
    saveBtn.classList.add('hidden');
    submitBtn.classList.add('hidden');

    const isExisting = window.globalRecordName && window.globalRecordName !== 'Unknown Document';
    const hasUnsavedChanges = window.hasUnsavedChanges;

    if (docstatus === 0) {
        // Draft or New
        if (!isExisting || hasUnsavedChanges) {
            saveBtn.classList.remove('hidden');
            saveBtn.textContent = 'SAVE';
        } else if (isExisting) {
            submitBtn.classList.remove('hidden');
            submitBtn.textContent = 'SUBMIT';
            submitBtn.disabled = false;
            submitBtn.classList.remove('bg-gray-500', 'cursor-not-allowed');
            submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        }

        makeFormReadOnly(false);

    } else if (docstatus === 1) {
        // Submitted document - check if user can edit
        if (window.hasMedicalAssessmentEditor || window.hasSystemManager) {
            if (hasUnsavedChanges) {
                saveBtn.classList.remove('hidden');
                saveBtn.textContent = 'SAVE';
            } else {
                submitBtn.classList.remove('hidden');
                submitBtn.textContent = 'SUBMITTED';
                submitBtn.disabled = true;
                submitBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                submitBtn.classList.add('bg-gray-500', 'cursor-not-allowed');
            }

            makeFormReadOnly(false);
        } else {
            saveBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
            submitBtn.textContent = 'SUBMITTED';
            submitBtn.disabled = true;

            // Style as a status label rather than an active button
            submitBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            submitBtn.classList.add('bg-gray-500', 'cursor-not-allowed');

            makeFormReadOnly(true);
        }

    } else if (docstatus === 2) {
        // Cancelled document
        if (hasUnsavedChanges) {
            saveBtn.classList.remove('hidden');
            saveBtn.textContent = 'SAVE';
        } else {
            submitBtn.classList.remove('hidden');
            submitBtn.textContent = 'SUBMIT';
            submitBtn.disabled = false;
            submitBtn.classList.remove('bg-gray-500', 'cursor-not-allowed');
            submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        }
        makeFormReadOnly(false);
    }
}

// Update the save button handler
const saveBtn = document.getElementById('saveBtn');
if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const formData = collectFormData();

            // Get current document status to determine workflow
            const urlParams = new URLSearchParams(window.location.search);
            const docName = urlParams.get('name');

            if (!docName) {
                // New document save
                const result = await saveToFrappe(formData);
                if (result && result.data) {
                    updateButtonVisibility(result.data.docstatus || 0);
                }
                return;
            }

            // Existing document - fetch current status first
            let currentDoc = null;

            try {
                const statusResponse = await fetch(`${FRAPPE_API_BASE}/${DOCTYPE_NAME}/${docName}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `token ${API_KEY}:${API_SECRET}`
                    },
                    credentials: 'include'
                });

                if (statusResponse.ok) {
                    const result = await statusResponse.json();
                    currentDoc = result.data;
                }
            } catch (err) {
                // If we can't get the document status, try normal save
                const result = await saveToFrappe(formData);
                if (result && result.data) {
                    updateButtonVisibility(result.data.docstatus || 0);
                }
                return;
            }

            if (!currentDoc) {
                // If we can't get the document status, try normal save
                const result = await saveToFrappe(formData);
                if (result && result.data) {
                    updateButtonVisibility(result.data.docstatus || 0);
                }
                return;
            }

            // Handle based on document status
            if (currentDoc.docstatus === 1) {
                // Submitted document - check if user can edit
                if (window.hasMedicalAssessmentEditor || window.hasSystemManager) {
                    try {
                        await cancelDocument(docName);

                        // Wait for cancellation to complete
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Now use custom API to update the cancelled document and set to draft
                        const response = await fetch(`${window.location.origin}/api/method/quantbit_ukui_customisation.api.update_cancelled_medical_assessment`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({
                                document_name: docName,
                                form_data: formData
                            })
                        });

                        if (!response.ok) {
                            throw new Error('Failed to update after cancellation');
                        }

                        const result = await response.json();
                        showStatus('Document updated successfully!', 'success');

                        // Reset unsaved changes flag
                        if (window.resetUnsavedChanges) {
                            window.resetUnsavedChanges();
                        }

                        if (result && result.data) {
                            updateButtonVisibility(result.data.docstatus || 0);
                        } else {
                            updateButtonVisibility(0);
                        }

                    } catch (cancelError) {
                        showStatus('Failed to edit submitted document: ' + cancelError.message, 'error');
                    }

                } else {
                    // User does not have required role
                    showStatus('Access denied. Medical Assessment Editor role required.', 'error');
                    return; // Stop execution
                }

            } else if (currentDoc.docstatus === 0) {
                // Draft document - normal save
                const result = await saveToFrappe(formData);

                // Reset unsaved changes flag
                if (window.resetUnsavedChanges) {
                    window.resetUnsavedChanges();
                }

                if (result && result.data) {
                    updateButtonVisibility(result.data.docstatus || 0);
                }
            } else if (currentDoc.docstatus === 2) {
                // Cancelled document - use custom backend API
                try {
                    const response = await fetch(`${window.location.origin}/api/method/quantbit_ukui_customisation.api.update_cancelled_medical_assessment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            document_name: docName,
                            form_data: formData
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        let errorMessage = 'Failed to update cancelled document';

                        if (errorData._server_messages) {
                            try {
                                const serverMessages = JSON.parse(errorData._server_messages);
                                errorMessage = serverMessages.map(m => JSON.parse(m).message).join(', ');
                            } catch (e) {
                                errorMessage = errorData.message || errorMessage;
                            }
                        } else if (errorData.message) {
                            errorMessage = errorData.message;
                        }

                        // Strip HTML tags from error messages
                        errorMessage = errorMessage.replace(/<[^>]*>/g, '');

                        throw new Error(errorMessage);
                    }

                    const result = await response.json();
                    showStatus('Document updated successfully!', 'success');

                    // Reset unsaved changes flag
                    if (window.resetUnsavedChanges) {
                        window.resetUnsavedChanges();
                    }

                    if (result && result.data) {
                        updateButtonVisibility(result.data.docstatus || 0);
                    }

                } catch (updateError) {
                    showStatus('Failed to update cancelled document: ' + updateError.message, 'error');
                }
            } else {
                // Unknown document status
                showStatus('Unknown document status. Contact administrator.', 'error');
            }

        } catch (error) {
            showStatus('Save failed: ' + error.message, 'error');
        }
    });
}

// ... rest of the code remains the same ...
// Update the submit button handler
const submitBtn = document.getElementById('submitBtn');
if (submitBtn) {
    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const docName = urlParams.get('name');

            if (!docName) {
                // New document workflow - save then submit
                const formData = collectFormData();
                console.log('Saving before submit:', formData);
                const saveResult = await saveToFrappe(formData);

                if (saveResult && saveResult.data && saveResult.data.name) {
                    // Now submit the document
                    console.log('Submitting document:', saveResult.data.name);
                    await submitDocument(saveResult.data.name);

                    // Update button visibility after submission
                    updateButtonVisibility(1);
                }
            } else {
                // Existing document workflow - check current status
                const response = await fetch(`${FRAPPE_API_BASE}/${DOCTYPE_NAME}/${docName}`, {
                    headers: {
                        'Authorization': `token ${API_KEY}:${API_SECRET}`
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    const currentDoc = result.data;

                    if (currentDoc.docstatus === 1 && window.canEditSubmitted) {
                        // Cancel the submitted document
                        await cancelDocument(docName);

                        // Wait for cancellation to complete
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Collect latest form data
                        const formData = collectFormData();

                        // Update the cancelled document using custom API
                        const updateResponse = await fetch(`${window.location.origin}/api/method/quantbit_ukui_customisation.api.update_cancelled_medical_assessment`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({
                                document_name: docName,
                                form_data: formData
                            })
                        });

                        if (updateResponse.ok) {
                            // Now submit it again
                            await submitDocument(docName);
                            updateButtonVisibility(1);
                        } else {
                            throw new Error('Failed to update document before resubmission');
                        }
                    } else if (currentDoc.docstatus === 0 || currentDoc.docstatus === 2) {
                        // Submit or resubmit the document
                        await submitDocument(docName);
                        updateButtonVisibility(1);
                    }
                }
            }
        } catch (error) {
            console.error('Submit button error:', error);
        }
    });
}


// Add reset button handler
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
            medicalForm.reset();
            showStatus('Form reset successfully', 'info');
            // Reset any custom states
            handleTabClick(document.getElementById('maternalTab'));
        }
    });
}

// File Upload Functionality
class FileUploadManager {
    constructor() {
        this.files = [];
        this.fileInput = document.getElementById('file-upload');
        this.maxFiles = 10; // Maximum number of files
        this.maxFileSize = 5 * 1024 * 1024; // 5MB per file

        this.init();
    }

    init() {
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }

    async handleFileSelect(event) {
        const newFiles = Array.from(event.target.files);

        // Check total file limit
        if (this.files.length + newFiles.length > this.maxFiles) {
            showStatus(`Maximum ${this.maxFiles} files allowed. You selected ${newFiles.length} files but already have ${this.files.length} files.`, 'error');
            return;
        }

        // Validate and add files (accept all file types)
        let validFiles = [];
        let errors = [];

        newFiles.forEach(file => {
            // Check file size only (no file type restrictions)
            if (file.size > this.maxFileSize) {
                errors.push(`${file.name}: File size must be less than 5MB`);
                return;
            }

            // Check for duplicates
            if (this.files.some(existingFile => existingFile.name === file.name)) {
                errors.push(`${file.name}: File already selected`);
                return;
            }

            validFiles.push(file);
        });

        // Show errors if any
        if (errors.length > 0) {
            showStatus(errors.join(', '), 'error');
            return;
        }

        // Add valid files
        if (validFiles.length > 0) {
            this.files.push(...validFiles);

            // Check if a record already exists
            const hasExistingRecord = (typeof window.globalRecordName !== 'undefined' && window.globalRecordName && window.globalRecordName !== 'Unknown Document') ||
                (typeof window.currentRecordName !== 'undefined' && window.currentRecordName);

            if (hasExistingRecord) {
                // Upload files immediately if record exists
                showStatus(`Uploading ${validFiles.length} file(s) to existing record...`, 'info');

                // Upload each file immediately
                await Promise.all(
                    validFiles.map(async (file) => {
                        try {
                            // Upload the file
                            const fileUrl = await uploadFile(file, API_KEY, API_SECRET, FRAPPE_API_BASE.replace("/api/resource", ""));
                            // Create File document linked to the existing record
                            const recordName = globalRecordName || window.currentRecordName;
                            const fileDocPayload = {
                                doctype: 'File',
                                file_name: file.name,
                                file_url: fileUrl,
                                attached_to_doctype: DOCTYPE_NAME,
                                attached_to_name: recordName,
                                is_private: 0
                            };

                            const fileDocResponse = await fetch(`${FRAPPE_API_BASE}/File`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `token ${API_KEY}:${API_SECRET}`
                                },
                                credentials: 'include',
                                body: JSON.stringify(fileDocPayload)
                            });

                            if (fileDocResponse.ok) {
                                console.log(`File ${file.name} attached to existing record ${recordName} immediately`);

                                // Add to attachment system as uploaded file
                                const fileObject = {
                                    type: 'uploaded',
                                    name: file.name,
                                    fileType: file.type,
                                    url: fileUrl,
                                    raw: file
                                };
                                currentFiles.push(fileObject);
                            } else {
                                throw new Error('Failed to create File document');
                            }
                        } catch (err) {
                            console.error(`Failed to upload file immediately: ${file.name}`, err);
                            // Add as local file for retry during submit
                            const fileObject = {
                                type: 'local',
                                name: file.name,
                                fileType: file.type,
                                raw: file
                            };
                            currentFiles.push(fileObject);
                        }
                    })
                );

                // Refresh attachments display
                updateAttachmentsDisplay(currentFiles);
                fetchAttachments(); // Refresh from server
                showStatus(`${validFiles.length} file(s) uploaded successfully`, 'success');

            } else {
                // No record exists, add files for later upload during submit
                validFiles.forEach(file => {
                    const fileObject = {
                        type: 'local',
                        name: file.name,
                        fileType: file.type,
                        raw: file
                    };
                    currentFiles.push(fileObject);
                });

                // Update the attachment display
                updateAttachmentsDisplay(currentFiles);
                showStatus(`${validFiles.length} file(s) added. Will be uploaded when record is saved.`, 'success');
            }
        }

        // Clear the input
        this.fileInput.value = '';
    }

    removeFile(index) {
        const removedFile = this.files[index];
        this.files.splice(index, 1);

        // Also remove from the attachment system
        const attachmentIndex = currentFiles.findIndex(f =>
            f.type === 'local' && f.name === removedFile.name
        );
        if (attachmentIndex > -1) {
            currentFiles.splice(attachmentIndex, 1);

            // Also remove from selected files if it was selected
            const selectedIndex = selectedFiles.findIndex(f =>
                f.type === 'local' && f.name === removedFile.name
            );
            if (selectedIndex > -1) {
                selectedFiles.splice(selectedIndex, 1);
            }

            // Update the attachment display
            updateAttachmentsDisplay(currentFiles);
        }

        showStatus(`${removedFile.name} removed`, 'info');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileIcon(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        if (extension === 'pdf') {
            return '📄';
        } else if (extension === 'jpg' || extension === 'jpeg' || extension === 'png') {
            return '🖼️';
        }
        return '📎';
    }

    getFiles() {
        return this.files;
    }

    clearFiles() {
        this.files = [];
        if (this.fileInput) {
            this.fileInput.value = '';
        }
    }
}


// Initialize the file upload manager
const fileUploadManager = new FileUploadManager();
window._fileUploadManager = fileUploadManager;

// Update the form data collection to include files
const originalCollectFormData = window.collectFormData;
if (typeof originalCollectFormData === 'function') {
    window.collectFormData = function () {
        const formData = originalCollectFormData();
        // Add files to the form data (they will be processed separately in saveToFrappe)
        formData.attachments = fileUploadManager.getFiles();
        return formData;
    };
} else {
    // If collectFormData doesn't exist, create it
    window.collectFormData = function () {
        const formData = {};
        // Add files to the form data (they will be processed separately in saveToFrappe)
        formData.attachments = fileUploadManager.getFiles();
        return formData;
    };
}

// Update reset button to also clear files
const resetBtnUpdated = document.getElementById('resetBtn');
if (resetBtnUpdated) {
    resetBtnUpdated.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
            medicalForm.reset();
            fileUploadManager.clearFiles();
            showStatus('Form reset successfully', 'info');
            // Reset any custom states
            handleTabClick(document.getElementById('maternalTab'));
        }
    });
}



// Attachment Management Functions
let currentAttachments = [];
let currentFiles = []; // Stores both local and server files
let selectedFiles = []; // Array of selected file objects
let currentCropper = null;
let pendingImageFile = null;
let croppingExistingImage = false;
let existingImageIndex = null;
let cachedFinalCtgData = null;

async function fetchAttachments() {
    console.log('fetchAttachments() called - globalRecordName:', window.globalRecordName);
    try {
        if (!window.globalRecordName || window.globalRecordName === 'Unknown Document') {
            console.log('No valid record name available for fetching attachments');
            updateAttachmentsDisplay([]);
            return;
        }

        const filters = JSON.stringify([
            ["attached_to_doctype", "=", DOCTYPE_NAME],
            ["attached_to_name", "=", window.globalRecordName]
        ]);
        const fields = JSON.stringify(["name", "file_name", "file_url", "is_private", "creation"]);
        const url = `${FRAPPE_API_BASE}/File?filters=${filters}&fields=${fields}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `token ${API_KEY}:${API_SECRET}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('API Response:', result);
        console.log('Result data:', result.data);
        console.log('Result data length:', result.data ? result.data.length : 'undefined');

        if (result.data && result.data.length > 0) {
            console.log('Processing attachments...');
            const serverFiles = result.data.map(f => {
                console.log('Processing file:', f);
                // Properly detect file type based on file extension
                const extension = f.file_name.split('.').pop().toLowerCase();
                let fileType = 'application/octet-stream'; // default

                if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
                    fileType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
                } else if (extension === 'csv') {
                    fileType = 'text/csv';
                } else if (extension === 'txt') {
                    fileType = 'text/plain';
                } else if (extension === 'pdf') {
                    fileType = 'application/pdf';
                }

                return {
                    type: 'server',
                    fid: f.name,
                    name: f.file_name,
                    url: f.file_url,
                    creation: f.creation,
                    fileType: fileType
                };
            });
            currentFiles = [...serverFiles, ...currentFiles.filter(f => f.type === 'local')];
            console.log('Updated currentFiles:', currentFiles);
        } else {
            console.log('No attachments found, keeping local files');
            // No attachments found, but keep local files
            currentFiles = [...currentFiles.filter(f => f.type === 'local')];
        }

        updateAttachmentsDisplay(currentFiles);
        console.log('Final attachments to display:', currentFiles);

    } catch (error) {
        console.error('Error fetching attachments:', error);
        updateAttachmentsDisplay([]);
        document.getElementById('attachmentsList').innerHTML = '<div class="text-red-500 italic">Error loading attachments.</div>';
    }
}

// Fetch Final CTG Data from the final_ctg_data field
async function fetchFinalCtgData() {
    const display = document.getElementById('finalCtgDataDisplay');

    try {
        if (!window.globalRecordName || window.globalRecordName === 'Unknown Document') {
            console.log('No valid record name available for fetching final CTG data');
            updateFinalCtgDataDisplay(null);
            return;
        }

        // Return cached data if available
        if (cachedFinalCtgData !== null) {
            updateFinalCtgDataDisplay(cachedFinalCtgData);
            return;
        }

        // Show loading state
        display.innerHTML = '<div class="text-gray-400 italic">Loading final CTG data...</div>';

        const fields = JSON.stringify(["name", "final_ctg_data"]);
        const url = `${FRAPPE_API_BASE}/Medical Assessment/${window.globalRecordName}?fields=${fields}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `token ${API_KEY}:${API_SECRET}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Final CTG data result:', result);

        const finalCtgFile = result.data?.final_ctg_data || null;
        cachedFinalCtgData = finalCtgFile; // Cache the result
        updateFinalCtgDataDisplay(finalCtgFile);

    } catch (error) {
        console.error('Error fetching final CTG data:', error);
        cachedFinalCtgData = null; // Clear cache on error
        display.innerHTML = `
            <div class="text-red-400 italic">
                ⚠️ Error loading final CTG data: ${error.message}
            </div>
        `;
    }
}

// Update Final CTG Data Display
function updateFinalCtgDataDisplay(finalCtgFileUrl) {
    const display = document.getElementById('finalCtgDataDisplay');

    if (!finalCtgFileUrl || finalCtgFileUrl === '') {
        display.innerHTML = '<div class="text-gray-500 italic">No final CTG data file available.</div>';
        return;
    }

    // Extract filename from URL and clean it up
    const filename = finalCtgFileUrl.split('/').pop() || 'final_ctg_data.csv';
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Check if it's a CSV file for special handling
    const isCsv = filename.toLowerCase().endsWith('.csv');

    display.innerHTML = `
        <div class="flex justify-between items-center p-3 border border-gray-700 bg-gray-800 rounded hover:bg-gray-750 transition-colors">
            <div class="flex items-center gap-3">
                <span class="text-lg">${isCsv ? '📊' : '📄'}</span>
                <div>
                    <span class="text-sm font-medium">${cleanFilename}</span>
                    ${isCsv ? '<span class="text-xs text-gray-400 ml-2">(CSV Data)</span>' : ''}
                </div>
            </div>
            <div class="flex gap-2">
                <a href="${finalCtgFileUrl}" target="_blank" 
                   class="px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors">
                    🔍 View
                </a>
                <a href="${finalCtgFileUrl}" download="${cleanFilename}" 
                   class="px-2 py-1 text-xs text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded transition-colors">
                    ⬇️ Download
                </a>
            </div>
        </div>
    `;
}

function updateAttachmentsDisplay(attachments) {
    const list = document.getElementById('attachmentsList');
    const btn = document.getElementById('get-data-points-btn');
    list.innerHTML = '';

    // Always filter to show only image files
    const filteredAttachments = attachments.filter(f => isImageFile(f));

    if (filteredAttachments.length === 0) {
        list.innerHTML = '<div class="text-gray-500 italic">No image files currently attached.</div>';
        btn.textContent = 'Get Data Points';
        return;
    }

    // Update button text
    btn.textContent = selectedFiles.length > 0
        ? `Get Data Points (${selectedFiles.length})`
        : 'Get Data Points';

    list.innerHTML = filteredAttachments.map((f, filteredIndex) => {
        // Find the original index in the full attachments array
        const originalIndex = attachments.findIndex(att =>
            (f.type === 'server' && f.url === att.url) ||
            (f.type === 'local' && f.name === att.name)
        );

        const isSelected = selectedFiles.some(sf =>
            (f.type === 'server' && f.url === sf.url) ||
            (f.type === 'local' && f.name === sf.name)
        );

        const cardClass = isSelected
            ? "border-pink-500 bg-pink-900/40"
            : "border-gray-700 bg-gray-800 hover:bg-gray-700";

        return `
            <div onclick="selectFile(${originalIndex})" class="flex justify-between items-center p-3 border rounded mt-2 cursor-pointer transition ${cardClass}">
                <div class="flex items-center gap-3">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} class="w-4 h-4 accent-pink-600" onclick="event.stopPropagation(); selectFile(${originalIndex})">
                    <span class="text-sm">${f.type === 'server' ? '✅' : '⏳'} ${f.name}</span>
                </div>
                <div class="flex gap-4">
                    ${isImageFile(f) ? `<button onclick="event.stopPropagation(); cropExistingImage(${originalIndex})" class="text-xs text-green-400 hover:text-green-300 hover:underline">Crop</button>` : ''}
                    ${f.url ? `<a href="${f.url}" target="_blank" class="text-xs text-blue-400 hover:underline" onclick="event.stopPropagation()">View</a>` : ''}
                    ${f.type === 'server' ? `<button onclick="event.stopPropagation(); deleteServerFile(${originalIndex})" class="text-xs text-red-500 hover:text-red-400 hover:underline">Delete</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// 1. Handles the UI and triggers the API
async function deleteServerFile(index) {
    const file = currentFiles[index];

    // Safety check: Make sure we have the fid
    if (!file || file.type !== 'server' || !file.fid) {
        alert("Cannot delete this file: Missing File ID.");
        return;
    }

    // Confirm with the user
    if (!confirm(`Are you sure you want to permanently delete "${file.name}"?`)) {
        return;
    }

    try {
        // Call the API (using the globalRecordName variable you already use)
        await removeAttachmentFromFrappe(file.fid, DOCTYPE_NAME, globalRecordName);

        // If successful, remove it from the frontend arrays
        currentFiles.splice(index, 1);

        // Also remove from selectedFiles if it was checked
        const selectedIdx = selectedFiles.findIndex(sf => sf.fid === file.fid);
        if (selectedIdx > -1) selectedFiles.splice(selectedIdx, 1);

        // Refresh the UI
        updateAttachmentsDisplay(currentFiles);

    } catch (error) {
        console.error("Deletion failed:", error);
    }
}

// 2. The API Call
async function removeAttachmentFromFrappe(fileId, docType, docName) {
    const url = `${FRAPPE_API_BASE.replace('/api/resource', '')}/api/method/frappe.desk.form.utils.remove_attach`;

    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `token ${API_KEY}:${API_SECRET}`
        },
        body: JSON.stringify({
            fid: fileId,
            dt: docType,
            dn: docName
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete attachment from server');
    }

    showStatus('Attachment removed successfully', 'success');
    return await response.json();
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
    updateAttachmentsDisplay(currentFiles);
}

// Helper function to check if file is an image
function isImageFile(file) {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    return imageTypes.includes(file.fileType) ||
        (file.name && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name));
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        return 'Invalid date';
    }
}

function cropExistingImage(index) {
    const file = currentFiles[index];
    if (!isImageFile(file)) {
        alert('This file is not an image and cannot be cropped.');
        return;
    }

    // Create cropper modal if it doesn't exist
    if (!document.getElementById('cropperModal')) {
        createCropperModal();
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

function createCropperModal() {
    const modalHTML = `
        <div id="cropperModal" class="fixed inset-0 bg-black bg-opacity-75 z-50 hidden flex items-center justify-center">
            <div class="bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-white">Crop Image</h3>
                    <button onclick="closeCropperModal()" class="text-gray-400 hover:text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="mb-4">
                    <img id="cropperImage" style="max-width: 100%; display: block;">
                </div>
                <div class="mb-4">
                    <label for="croppedFileName" class="block text-sm font-medium text-gray-300 mb-2">
                        Filename (optional):
                    </label>
                    <input type="text" id="croppedFileName" placeholder="Leave empty to use original filename"
                        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent">
                    <p class="text-xs text-gray-400 mt-1">Leave empty to keep original filename, or enter a custom name</p>
                </div>
                <div class="flex justify-end gap-3">
                    <button onclick="closeCropperModal()"
                        class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition">
                        Cancel
                    </button>
                    <button onclick="cropAndSaveImage()"
                        class="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition">
                        Crop & Save
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeCropperModal() {
    const modal = document.getElementById('cropperModal');
    const filenameInput = document.getElementById('croppedFileName');

    if (currentCropper) {
        currentCropper.destroy();
        currentCropper = null;
    }

    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    if (filenameInput) {
        filenameInput.value = '';
    }

    pendingImageFile = null;
    croppingExistingImage = false;
    existingImageIndex = null;
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

    // Since we are uploading immediately, the main record MUST be saved first
    // so we have a valid ID (globalRecordName) to attach the file to.
    const isRecordSaved = window.globalRecordName && window.globalRecordName !== 'Unknown Document';

    showStatus('Cropping image...', 'info');

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

            try {
                // 1. Get custom filename from input field
                const filenameInput = document.getElementById('croppedFileName');
                const customFilename = filenameInput.value.trim();

                // 2. Figure out the original file details
                let originalFile = croppingExistingImage ? currentFiles[existingImageIndex] : pendingImageFile;
                let originalName = originalFile.name;
                let fileType = originalFile.fileType || originalFile.type || 'image/jpeg';

                // Extract extension properly
                let fileExtension = originalName.split('.').pop();
                if (!fileExtension || fileExtension === originalName) {
                    fileExtension = fileType.includes('png') ? 'png' : 'jpg';
                }

                // 3. Determine the final filename
                // If custom name provided, use it. Otherwise, append "_cropped" to original name.
                let finalFilename;
                if (customFilename) {
                    // Ensure the user's custom name ends with the correct extension
                    finalFilename = customFilename.toLowerCase().endsWith(`.${fileExtension.toLowerCase()}`)
                        ? customFilename
                        : `${customFilename}.${fileExtension}`;
                } else {
                    finalFilename = originalName.replace(`.${fileExtension}`, `_cropped.${fileExtension}`);
                }

                // 4. Create the new cropped File object
                const croppedFile = new File([blob], finalFilename, { type: fileType });

                // 5. Upload Strategy
                if (isRecordSaved) {
                    // IF THE RECORD EXISTS: Upload immediately to the backend
                    showStatus('Uploading cropped image to server...', 'info');

                    const methodUrl = FRAPPE_API_BASE.replace("/api/resource", "");

                    // Upload the physical file
                    const fileUrl = await uploadFile(croppedFile, API_KEY, API_SECRET, methodUrl);

                    // Create the File document link in Frappe
                    const fileDocPayload = {
                        doctype: 'File',
                        file_name: finalFilename,
                        file_url: fileUrl,
                        attached_to_doctype: DOCTYPE_NAME,
                        attached_to_name: globalRecordName,
                        is_private: 0
                    };

                    const fileDocResponse = await fetch(`${FRAPPE_API_BASE}/File`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `token ${API_KEY}:${API_SECRET}`
                        },
                        body: JSON.stringify(fileDocPayload)
                    });

                    if (!fileDocResponse.ok) {
                        throw new Error('Failed to attach the cropped file to the record.');
                    }

                    showStatus('Cropped image uploaded successfully!', 'success');

                    // Refresh the attachment list from the server so the new file shows up
                    fetchAttachments();

                } else {
                    // IF THE RECORD IS NOT SAVED YET: We can't upload to the server because we have no Record ID.
                    // Instead, we safely append it to the local queue so it uploads when they click Submit.
                    showStatus('Record not saved yet. Cropped image added to local upload queue.', 'info');

                    const fileObject = {
                        type: 'local',
                        name: finalFilename,
                        fileType: croppedFile.type,
                        raw: croppedFile
                    };

                    // Append the new file without removing the old one
                    currentFiles.push(fileObject);
                    updateAttachmentsDisplay(currentFiles);
                }

                // Finally, close the modal
                closeCropperModal();

            } catch (processError) {
                console.error('Error processing/uploading cropped image:', processError);
                showStatus('Error: ' + processError.message, 'error');
            }

        }, croppingExistingImage ? (currentFiles[existingImageIndex].fileType || 'image/jpeg') : pendingImageFile.type, 0.9);

    } catch (error) {
        console.error('Error cropping image:', error);
        alert('Error cropping image: ' + error.message);
    }
}

// User role check function
async function checkUserRole() {
    try {
        const response = await fetch(`${window.location.origin}/api/method/quantbit_ukui_customisation.api.get_user_role_profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const data = await response.json();
            const userData = data.message || {};

            if (userData.role_profile === "Doctor" || userData.role_profile === "Medical Assessment Editor") {
                document.getElementById('get-data-points-btn').style.display = 'block';
            }

            // Store user roles and permissions globally
            window.userRoles = userData.roles || [];
            window.userRole = userData.role_profile || null;
            window.hasMedicalAssessmentEditor = userData.has_medical_assessment_editor || false;
            window.hasSystemManager = userData.has_system_manager || false;
            window.canEditSubmitted = userData.can_edit_submitted || false;

            return {
                userRole: window.userRole,
                userRoles: window.userRoles,
                canEditSubmitted: window.canEditSubmitted,
                hasMedicalAssessmentEditor: window.hasMedicalAssessmentEditor,
                hasSystemManager: window.hasSystemManager
            };
        } else {
            window.userRoles = [];
            window.userRole = null;
            window.hasMedicalAssessmentEditor = false;
            window.hasSystemManager = false;
            window.canEditSubmitted = false;
            return { userRole: null, userRoles: [], canEditSubmitted: false };
        }
    } catch (error) {
        window.userRoles = [];
        window.userRole = null;
        window.hasMedicalAssessmentEditor = false;
        window.hasSystemManager = false;
        window.canEditSubmitted = false;
        return { userRole: null, userRoles: [], canEditSubmitted: false };
    }
}

// Initialize attachments when page loads
document.addEventListener('DOMContentLoaded', function () {
    // Check user role when page loads and then initialize buttons
    checkUserRole().then(() => {
        // Initialize button visibility after role check completes
        updateButtonVisibility(0);
    }).catch(err => {
        // Initialize with default permissions
        window.userRole = null;
        window.canEditSubmitted = false;
        updateButtonVisibility(0);
    });

    // Track unsaved changes
    window.hasUnsavedChanges = false;

    // Monitor form changes
    const form = document.querySelector('form');
    if (form) {
        const handleFormChange = () => {
            if (!window.isLoadingDocument) {
                window.hasUnsavedChanges = true;
                // Update button visibility when changes occur
                const urlParams = new URLSearchParams(window.location.search);
                const docName = urlParams.get('name');

                // If it's a draft, we need to show the save button
                updateButtonVisibility(window.currentDocStatus || 0);
            }
        };

        form.addEventListener('change', handleFormChange);
        form.addEventListener('input', handleFormChange);
    }

    // Warn before leaving page with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (window.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });

    // Reset unsaved changes flag after successful save
    window.resetUnsavedChanges = () => {
        window.hasUnsavedChanges = false;
        // Update button visibility after reset
        updateButtonVisibility(window.currentDocStatus || 0);
    };

    // Wait a bit for globalRecordName to be set
    setTimeout(() => {
        fetchAttachments();
    }, 1000);

    // Also fetch attachments when record name changes
    const originalSetGlobalRecordName = window.setGlobalRecordName;
    if (originalSetGlobalRecordName) {
        window.setGlobalRecordName = function (name) {
            originalSetGlobalRecordName(name);
            // Clear cache when record name changes
            cachedFinalCtgData = null;
            setTimeout(fetchAttachments, 500);
        };
    }
});

// BMI Calculation Function with Unit Conversion
function calculateBMI() {
    const heightInput = document.getElementById('myTextbox'); // Question 39 - height input
    const weightInput = document.getElementById('weightInput'); // Question 40 - weight input
    const heightUnit = document.getElementById('heightUnit'); // Height unit selector
    const weightUnit = document.getElementById('weightUnit'); // Weight unit selector
    const bmiInput = document.querySelector('input[name="bmi"]'); // Question 41 - BMI

    if (heightInput && weightInput && heightUnit && weightUnit && bmiInput) {
        const heightValue = parseFloat(heightInput.value);
        const weightValue = parseFloat(weightInput.value);

        if (!isNaN(heightValue) && heightValue > 0 && !isNaN(weightValue) && weightValue > 0) {
            // Convert height to meters if needed
            let heightInMeters = heightValue;
            if (heightUnit.value === 'Inches') {
                heightInMeters = heightValue * 0.0254; // 1 inch = 0.0254 meters
            }

            // Convert weight to kilograms if needed
            let weightInKg = weightValue;
            if (weightUnit.value === 'pounds') {
                weightInKg = weightValue * 0.453592; // 1 pound = 0.453592 kilograms
            }

            // BMI = weight (kg) / height (m)^2
            const bmi = weightInKg / (heightInMeters * heightInMeters);
            bmiInput.value = bmi.toFixed(1); // Round to 1 decimal place
        } else {
            bmiInput.value = ''; // Clear BMI if inputs are invalid
        }
    }
}

// Update placeholder text based on selected units
function updatePlaceholders() {
    const heightInput = document.getElementById('myTextbox');
    const weightInput = document.getElementById('weightInput');
    const heightUnit = document.getElementById('heightUnit');
    const weightUnit = document.getElementById('weightUnit');

    if (heightInput && heightUnit) {
        if (heightUnit.value === 'Inches') {
            heightInput.placeholder = 'Enter height in inches';
        } else {
            heightInput.placeholder = 'Enter height in meters';
        }
    }

    if (weightInput && weightUnit) {
        if (weightUnit.value === 'pounds') {
            weightInput.placeholder = 'Enter weight in pounds';
        } else {
            weightInput.placeholder = 'Enter weight in kilograms';
        }
    }
}

// Add event listeners for height and weight inputs and unit selectors
document.addEventListener('DOMContentLoaded', function () {
    const heightInput = document.getElementById('myTextbox');
    const weightInput = document.getElementById('weightInput');
    const heightUnit = document.getElementById('heightUnit');
    const weightUnit = document.getElementById('weightUnit');

    if (heightInput) {
        heightInput.addEventListener('input', calculateBMI);
        heightInput.addEventListener('change', calculateBMI);
    }

    if (weightInput) {
        weightInput.addEventListener('input', calculateBMI);
        weightInput.addEventListener('change', calculateBMI);
    }

    if (heightUnit) {
        heightUnit.addEventListener('change', function () {
            updatePlaceholders();
            calculateBMI(); // Recalculate BMI when unit changes
        });
    }

    if (weightUnit) {
        weightUnit.addEventListener('change', function () {
            updatePlaceholders();
            calculateBMI(); // Recalculate BMI when unit changes
        });
    }

    // Initialize placeholders on page load
    updatePlaceholders();
});