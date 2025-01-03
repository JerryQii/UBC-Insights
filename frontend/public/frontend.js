// frontend.js

import { handleFileUpload, addDataset, listDatasets } from './datasetManager.js';
import { runQuery } from './queryManager.js';
import { initializeListManager } from './listManager.js';

// Event Listeners
document.getElementById("datasetForm").addEventListener("submit", addDataset);
document.getElementById("fileUpload").addEventListener("change", handleFileUpload);
document.getElementById("runQueryButton").addEventListener("click", runQuery);

// Initialize dataset list on page load
document.addEventListener("DOMContentLoaded", () => {
    listDatasets();
    initializeListManager();
});
