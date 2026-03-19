import { LightningElement, track, wire } from 'lwc';
import getAllObjects from '@salesforce/apex/GetObjectComponent.getAllObjects';
import getObjectFields from '@salesforce/apex/GetObjectComponent.getObjectFields';
import getCustomMetadata from '@salesforce/apex/GetObjectComponent.getCustomMetadata';
import getRecords from '@salesforce/apex/GetObjectComponent.getRecords';

export default class NewPromptBuilder extends LightningElement {

    @track records = [];
    @track objects = '';
    @track isModalOpen = true;
    isPromptTemplateAvailable = false;
    isLoading = false;
    @track apiName = '';
    @track selectedObject = '';
    @track objectOptions = []; 
    @track fieldOptions = [];
    @track selectedTemplateType;
    @track templateTypeOptions = [];
    @track formData = {"hi": "hello"};

    @wire(getCustomMetadata)
    wiredMetadata({ error, data }) {
    if (data) {
            console.log('data-->', data);
            if (Array.isArray(data) && data.length > 0) {
                this.templateTypeOptions = data.map(config => ({
                    label: config.MasterLabel,
                    value: config.Prompt_Builder_Type__c,
                }));
                console.log('Object:', JSON.stringify(this.templateTypeOptions));
            } 
            else if (error) {
                this.showToastMessage('Error loading object configurations: ' + error.body.message);
                console.error('Error loading object configurations:', error);
            }
        }
    }

    handlePromptTemplateType(event) 
    {
       this.selectedTemplateType = event.target.value;
        console.log('Selected Template Type: ', this.selectedTemplateType);
    }

    handleTemplateNameChange(event) {
        this.formData['promptTemplateName'] = event.detail.value;
        const templateName = event.target.value;
        this.apiName = templateName ? templateName.replace(/\s+/g, '_') : '';
        this.formData['promptTemplateApiName'] = this.apiName;
    }
    handleTemplateDescription(event) {
        this.formData['promptTemplateDescription'] = event.detail.value;
    }

    connectedCallback() {
            this.loadObjects();
    }

    loadObjects() {
        getAllObjects()
            .then(result => {
                this.objectOptions = result.map(object => ({
                    label: object, value: object
                }));
            })
            .catch(error => {
                this.objectOptions = [];
                console.error('Error fetching objects: ', error);
            });
    }

    handleObjectChange(event) {
        this.selectedObject = event.detail.value;
        this.formData['promptObject'] = event.detail.value;

        if (this.selectedObject) {
            this.loadObjectFields(this.selectedObject);
        } else {
            this.fieldOptions = [];
        }
    }

    hanldeObjectField(event) {
        this.formData['promptObjectField'] = event.detail.value;
         console.log('formdata', JSON.stringify(this.formData));
    }

    loadObjectFields(objectName) {
        getObjectFields({ objectName })
            .then(result => {
                this.fieldOptions = result.map(field => ({
                    label: field, value: field
                }));
            })
            .catch(error => {
                this.fieldOptions = [];
                console.error('Error fetching fields: ', error);
            });
    }

    handleSubmit() {
        const inputs = this.template.querySelectorAll('lightning-input, lightning-textarea');
        const values = {};
        inputs.forEach(input => {
            values[input.label] = input.value;
        });

        console.log('Submitted Values:', values);
        this.isModalOpen = false;
    }

    handleCloseModal() {
        this.isModalOpen = false;
    }

    handleNextClick(event) {
    const allInputs = this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea');
    let isValid = true;

    allInputs.forEach(input => {
        if (!input.checkValidity()) {
            input.reportValidity();
            isValid = false;
        }
    });

    if (isValid) {
        this.isLoading = true;
        this.fetchRecords();

    } else {
        console.warn('Please fill out all required fields before proceeding.');
    }
}

    fetchRecords() {
        this.isLoading = true;
        getRecords({ objectApiName: this.selectedObject })
            .then(result => {
                this.records = result.map(record => ({
                    label: record.Name,
                    value: record.Id
                }));
                // console.log('record in parent',JSON.stringify(this.records));
                this.isModalOpen = false;
                setTimeout(() => {
                this.isPromptTemplateAvailable = true;
                this.isLoading = false;
        }, 2000);
            })
            .catch(error => {
                console.error('Error fetching records:', error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

}