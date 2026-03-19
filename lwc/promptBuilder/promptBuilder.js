import { LightningElement, wire, track, api } from 'lwc';
import fetchChatGPTResponse from '@salesforce/apex/ChatGptController.fetchChatGPTResponse';
import getResourcesByCategory from '@salesforce/apex/DynamicResourcesController.getResourcesByCategory';
import savePromptBuilderRecord from '@salesforce/apex/DynamicResourcesController.savePromptBuilderRecord';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PromptBuilder extends LightningElement {

    @track filteredRecords = [];
    @track showSuggestions = false;
    @track searchInput = '';
    @api records;
    @track resourceOptions = [];
    @track selectedValue;
    @track resolutionEnabled = true;
    @track resolutionStatus = 'Enabled';
    @track responseMessage = 'No response available yet. Preview will appear here after generation.';
    @track isActivate = true;
    @api formData;
    @api selectedObject;
    @track selectedCategory;
    @track categoryOptions = [
        { label: 'Apex', value: 'Apex' },
        { label: 'Flows', value: 'Flows' },
        { label: 'Metadata', value: 'Metadata' }
    ];
    @track isResourceDropdownDisabled = true;
    @track apexResources = [];
    @track flowResources = [];
    @track metadataResources = [];
    @track savedRange = null;

    connectedCallback() {
        this.addSelectedObjectToPicklist();
    }

    addSelectedObjectToPicklist() {
        if (this.selectedObject) {
            // Check if selectedObject is already in categoryOptions
            const isPresent = this.categoryOptions.some(
                (option) => option.value === this.selectedObject
            );

            if (!isPresent) {
                // Add selectedObject to the picklist options
                this.categoryOptions = [
                    ...this.categoryOptions,
                    { label: this.selectedObject, value: this.selectedObject }
                ];
            }
        }
    }

    handleCategoryChange(event) {
        this.selectedCategory = event.detail.value;        
        this.isResourceDropdownDisabled = false;
        this.fetchResources();

    }

    fetchResources() {
        if (this.selectedCategory) {
            getResourcesByCategory({ selectedCategory: this.selectedCategory })
                .then((result) => {
                    this.resourceOptions = result.map(item => {
                        return { label: item.label, value: item.value };
                    });
                    this.isResourceDropdownDisabled = false; // Enable dropdown after fetching
                })
                .catch((error) => {
                    console.error('Error fetching resources:', error);
                });
        } else {
            this.resourceOptions = [];
            this.isResourceDropdownDisabled = true;
        }
    }
    // Save the cursor position when the div loses focus
    saveCursorPosition() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            this.savedRange = selection.getRangeAt(0);
        }
    }
    // Restore the cursor position and insert the span
    handleObjectChange(event) {
        this.selectedValue = event.detail.value; // Get the dropdown value
        const editableDiv = this.template.querySelector('.prompt-textarea');

       if (this.selectedCategory === 'Flows') {
        // Check if a "Flows" entry already exists
        const existingFlow = Array.from(editableDiv.querySelectorAll('span'))
            .find(span => span.textContent.includes('Flows :'));

        if (existingFlow) {
            // Display toast notification
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Duplicate Flow Entry',
                    message: 'A "Flow" is already inserted. Please remove the previous one before adding a new one.',
                    variant: 'error',
                    mode: 'dismissable'
                })
            );
            return; // Exit the function to prevent adding another "Flow"
        }
    }

        if (this.savedRange && editableDiv) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(this.savedRange); // Restore the saved range

            // Insert the span at the saved cursor position
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.setAttribute('contenteditable', 'false');

            let selectedCategoryColor = '';

            if (this.selectedCategory == 'Apex') {
                selectedCategoryColor = 'blue';
            } else if (this.selectedCategory == 'Flows') {
                selectedCategoryColor = 'black';
            } else if (this.selectedCategory == 'Metadata') {
                selectedCategoryColor = 'red';
            } else {
                selectedCategoryColor = '#6e2513';
            }

            span.style.color = selectedCategoryColor;
            if (this.selectedCategory == this.selectedObject) {
                span.textContent = `Input : ${this.selectedCategory} : ${this.selectedValue}`;
            }
            else {
                span.textContent = `${this.selectedCategory} : ${this.selectedValue}`;
            }
            range.deleteContents();
            range.insertNode(span);

            range.setStartAfter(span);
            range.setEndAfter(span);
            selection.removeAllRanges();
            selection.addRange(range);

            editableDiv.focus();
        }
    }


    handleResolutionToggle(event) {
        this.resolutionEnabled = event.target.checked;
        this.resolutionStatus = this.resolutionEnabled ? 'Enabled' : 'Disabled';
    }

    handleSearch(event) {
        this.searchInput = event.target.value;
        console.log('this.searchInput',this.searchInput);
        this.filteredRecords = this.records.filter(record =>
            record.label.toLowerCase().includes(this.searchInput.toLowerCase())
        );
        this.showSuggestions = this.filteredRecords.length > 0;
    }

    handleSelect(event) {
        const selectedLabel = event.target.textContent;
        this.searchInput = selectedLabel;
        this.showSuggestions = false;

        const searchInputElement = this.template.querySelector('.search-bar');
        if (searchInputElement) {
            searchInputElement.value = selectedLabel;
        }
    }

    toggleSuggestions() {
        this.showSuggestions = !!this.searchInput;
    }

    saveAsNewVersion() {
        savePromptBuilderRecord({
            templateContent: this.template.querySelector('.prompt-textarea').textContent.trim(),
            category: this.selectedCategory,
            resource: this.selectedValue,
            isNewVersion: true,
            newTemplateName: null
        })
        .then(() => {
            alert('Template saved as a new version successfully!');
        })
        .catch(error => {
            console.error('Error saving new version:', error);
            alert('Error: ' + error.body.message);
        });
    }

    saveAsNewTemplate() {
        if (!this.newTemplateName.trim()) {
            alert('Please enter a template name.');
            return;
        }
    
        savePromptBuilderRecord({
            templateContent: this.template.querySelector('.prompt-textarea').textContent.trim(),
            category: this.selectedCategory,
            resource: this.selectedValue,
            isNewVersion: false,
            newTemplateName: this.newTemplateName
        })
        .then(() => {
            alert('Template saved successfully!');
        })
        .catch(error => {
            console.error('Error saving template:', error);
            alert('Error: ' + error.body.message);
        });
    }

    handleTemplateNameChange(event) {
        this.newTemplateName = event.target.value;
    }
    
    

    // handleSaveAs(event) {
    //     const selectedOption = event.target.value;
    //     if (selectedOption === 'newVersion') {
    //         // console.log('Saving as a New Version...');
    //     } else if (selectedOption === 'newTemplate') {
    //         // console.log('Saving as a New Template...');
    //     }
    // }

    generatePreview() {
        this.responseMessage = 'This is a dynamically generated response.';
    }

    handleSave() {
        const editableDiv = this.template.querySelector('.prompt-textarea');
        const templateContent = editableDiv ? editableDiv.textContent.trim() : '';

        if (!templateContent || !this.selectedCategory || !this.selectedValue || !this.selectedObject) {
            alert('Please fill out all the required fields before saving.');
            return;
        }

        savePromptBuilderRecord({
            templateContent: templateContent,
            category: this.selectedCategory,
            resource: this.selectedValue
        })
            .then(() => {
                alert('Template saved successfully!');
            })
            .catch(error => {
                console.error('Error saving template:', error);
                alert('Error saving template: ' + error.body.message);
            });
    }

    get buttonLabel() {
        return this.isActivate ? 'Activate' : 'Deactivate';
    }

    handleDeactivate() {
        // console.log('Activating the template...');
        this.isActivate = !this.isActivate;
    }

    // Gpt Code
    @track userInput = '';
    @track response = '';

    getChatGptResponse() {
        this.userInput = this.template.querySelector('.prompt-textarea').textContent;
        if (this.userInput) {
            fetchChatGPTResponse({ prompt: this.userInput })
                .then(result => {
                    this.response = result;
                })
                .catch(error => {
                    this.response = 'Error: ' + error.body.message;
                });
        } else {
            this.response = 'Please enter a message.';
        }
    }

}