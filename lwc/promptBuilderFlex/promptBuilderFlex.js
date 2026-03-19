import { LightningElement, track, wire } from 'lwc';
import getAllObjects from '@salesforce/apex/GetObjectComponent.getAllObjects';
import getCustomMetadata from '@salesforce/apex/GetObjectComponent.getCustomMetadata';
import getObjectFields from '@salesforce/apex/GetObjectComponent.getObjectFields';
import getRecords from '@salesforce/apex/GetObjectComponent.getRecords';

export default class NewPromptBuilder extends LightningElement {
    @track records = [];
    @track resources = [];
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
    @track formData = { hi: "hello" };
    @track isFlexTemplate = false;
    resourceId = 0;

    @wire(getCustomMetadata)
    wiredMetadata({ error, data }) {
        if (data) {
            this.templateTypeOptions = data.map(config => ({
                label: config.MasterLabel,
                value: config.Prompt_Builder_Type__c,
            }));
        } else if (error) {
            console.error('Error loading metadata:', error);
        }
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
                console.error('Error fetching objects:', error);
            });
    }

    handlePromptTemplateType(event) {
        this.selectedTemplateType = event.target.value;
        this.isFlexTemplate = this.selectedTemplateType === 'Flex';
    }

    addResource() {
        if (this.resources.length < 5) {
            this.resources.push({
                id: this.resourceId++,
                name: '',
                apiName: '',
                sourceType: '',
                object: ''
            });
        }
    }

    removeResource(event) {
        const resourceId = parseInt(event.target.dataset.id, 10);
        this.resources = this.resources.filter(resource => resource.id !== resourceId);
    }

    handleResourceChange(event) {
        const resourceId = parseInt(event.target.dataset.id, 10);
        const fieldName = event.target.label.toLowerCase().replace(' ', '');
        const resource = this.resources.find(res => res.id === resourceId);
        if (resource) {
            resource[fieldName] = event.target.value;
        }
    }

    handleCloseModal() {
        this.isModalOpen = false;
    }

    handleNextClick() {
        if (this.isFlexTemplate) {
            console.log('Resources:', JSON.stringify(this.resources));
        } else {
            console.log('Prompt Template Details submitted.');
        }
    }

    get disableAddResource() {
        return this.resources.length >= 5;
    }
}