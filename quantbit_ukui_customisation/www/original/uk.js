document.addEventListener('DOMContentLoaded', function () {
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

    // --- Modal Open/Close Handlers with SCROLL LOCK ---
    function openModal(modal) {
        if (!modal) return;
        if (modal.id !== 'specifyTextModal' && modal.id !== 'previousPregnanciesModal') {
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
                    row.innerHTML = `<td class="p-2 border border-gray-600">${i}</td><td class="p-2 border border-gray-600"><input type="text" name="prev_preg_${i}_problems" class="form-input" placeholder="Specify problems"></td><td class="p-2 border border-gray-600"><select name="prev_preg_${i}_outcome" class="form-select"><option value="">Select</option><option value="Live Birth">Live Birth</option><option value="Stillbirth">Stillbirth</option><option value="Miscarriage">Miscarriage</option><option value="IUD">IUD</option><option value="Other">Other</option></select></td><td class="p-2 border border-gray-600"><select name="prev_preg_${i}_mode" class="form-select"><option value="">Select</option><option value="Vaginal">Vaginal</option><option value="C-Section">C-Section</option><option value="Instrumental">Instrumental</option><option value="Other">Other</option></select></td><td class="p-2 border border-gray-600"><input type="number" name="prev_preg_${i}_weight" class="form-input" placeholder="grams"></td><td class="p-2 border border-gray-600"><input type="number" name="prev_preg_${i}_ga" class="form-input" placeholder="weeks"></td>`;
                    previousPregnanciesTableBody.appendChild(row);
                }
            }
        });
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
        });

        prevBtn?.addEventListener('click', () => navigateTabs(false));
        nextBtn?.addEventListener('click', () => navigateTabs(true));
        resetBtn?.addEventListener('click', handleFormReset);
        medicalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(medicalForm);
            const data = Object.fromEntries(formData.entries());
            console.log(JSON.stringify(data, null, 2));
            alert("Form data has been logged to the browser console (Press F12 to view).");
        });

        if (multipleTypeSelect) multipleTypeSelect.addEventListener('change', handleMultipleTypeChange);
        if (raceCategorySelect) raceCategorySelect.addEventListener('change', handleRaceCategoryChange);
    }

    function handleTabClick(tab) {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(tab.id.replace('Tab', 'Section')).classList.add('active');
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
            group.querySelector('.no-btn').classList.add('active');
        });
        handleTabClick(document.getElementById('maternalTab'));

        if (raceLookupBtn) {
            raceLookupBtn.textContent = 'Select Race...';
            raceLookupBtn.classList.remove('active');
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
    setupEventListeners();
    updateNavigationButtons();
    setupInputValidation();
    handleMultipleTypeChange();
    handleRaceCategoryChange();
    setupPreviousPregnancies();
    setupLmpLogic();
    setupDatePickers();
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

//========================================

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
const FRAPPE_API_BASE = window.location.origin + '/api/resource';
const DOCTYPE_NAME = 'Medical Assessment';

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
        maternal_autoimmune_disorder: document.querySelector('input[name="maternal_autoimmune_disorder"]')?.value || '',

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

        // Foetal Movements
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
        wom_wg: document.querySelector('input[name="weight_at_booking"]')?.value || '',
        not_weighed: document.querySelector('input[name="weight_not_weighed"]')?.checked ? 1 : 0,
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

        // Foetal Variables
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
        hco3v: document.querySelector('input[name="venous_hco3"]')?.value || ''
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

// Function to save data to Frappe
async function saveToFrappe(formData) {
    try {
        showStatus('Saving data...', 'info');

        // Function to get CSRF token from cookies or meta tag
        async function getCSRFToken() {
            // Try to get from meta tag first
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            if (metaTag) {
                return metaTag.getAttribute('content');
            }

            // Try to get from cookie
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'sid') {
                    return decodeURIComponent(value);
                }
            }

            // Try to get from window object (Frappe sometimes stores it here)
            if (window.frappe && window.frappe.csrf_token) {
                return window.frappe.csrf_token;
            }

            // Fallback: fetch CSRF token from Frappe API
            try {
                const response = await fetch(`${window.location.origin}/api/method/frappe.auth.get_csrf_token`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.message && data.message.csrf_token) {
                        return data.message.csrf_token;
                    }
                }
            } catch (e) {
                console.warn('Failed to fetch CSRF token from API:', e);
            }

            return null;
        }

        const csrfToken = await getCSRFToken();
        if (!csrfToken) {
            throw new Error('CSRF token not found. Please make sure you are logged in to Frappe.');
        }

        // URL encode the doctype name
        const encodedDoctypeName = encodeURIComponent(DOCTYPE_NAME);
        const response = await fetch(`${FRAPPE_API_BASE}/${encodedDoctypeName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Frappe-CSRF-Token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = 'Failed to save data';

            // Log detailed error information for debugging
            console.error('API Error Details:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                errorData: errorData,
                csrfToken: csrfToken ? 'present' : 'missing',
                formDataKeys: Object.keys(formData)
            });

            if (errorData._server_messages) {
                try {
                    const serverMessages = JSON.parse(errorData._server_messages);
                    errorMessage = serverMessages.map(m => JSON.parse(m).message).join(', ');
                } catch (e) {
                    errorMessage = errorData.message || errorMessage;
                }
            } else if (errorData.message) {
                errorMessage = errorData.message;
            } else if (response.status === 400) {
                errorMessage = 'Bad Request - Check CSRF token and authentication';
            } else if (response.status === 403) {
                errorMessage = 'Forbidden - Insufficient permissions';
            }

            throw new Error(errorMessage);
        }

        const result = await response.json();
        showStatus('Medical Assessment saved successfully!', 'success');
        console.log('Save successful:', result);

        // Optionally redirect to the saved document
        if (result.data && result.data.name) {
            setTimeout(() => {
                window.location.href = `${window.location.origin}/app/medical-assessment/${result.data.name}`;
            }, 1500);
        }

        return result;
    } catch (error) {
        console.error('Save error:', error);
        showStatus(`Error: ${error.message}`, 'error');
        throw error;
    }
}

// Update the form submit handler
const submitBtn = document.getElementById('submitBtn');
if (submitBtn) {
    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault(); // prevents any default submit behavior (optional if not in <form>)
        try {
            const formData = collectFormData();
            console.log('Collected Form Data:', formData);
            await saveToFrappe(formData);
        } catch (error) {
            console.error('Button click error:', error);
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


