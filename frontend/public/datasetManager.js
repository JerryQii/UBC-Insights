// datasetManager.js

import { showNotification } from './utils.js';

let selectedDataset = null;
let ZIP_FILE_DATA = null;

export function getSelectedDataset() {
    return selectedDataset;
}

export function handleFileUpload(event) {
    const file = event.target.files[0]; // Get the selected file

    if (file) {
        const reader = new FileReader();

        reader.onload = () => {
            // Convert result to Uint8Array for fetch
            ZIP_FILE_DATA = new Uint8Array(reader.result);
        };

        reader.onerror = () => {
            console.error("Error reading file:", reader.error);
            showNotification("Error while reading selected file", 'error');
        };

        // Read the file as an ArrayBuffer
        reader.readAsArrayBuffer(file);
    } else {
        showNotification("No file selected", 'error');
    }
}

export function addDataset(event) {
    event.preventDefault();

    const id = document.getElementById("datasetId").value.trim();
    const kind = document.getElementById("datasetKind").value.toLowerCase();

    if (!id || id.includes("_") || /^\s*$/.test(id)) {
        showNotification("Invalid dataset ID. Please enter a valid ID without underscores.", 'error');
        return;
    }

    if (!ZIP_FILE_DATA) {
        showNotification("No file selected or file is still loading.", 'error');
        return;
    }

    fetch(`/dataset/${encodeURIComponent(id)}/${encodeURIComponent(kind)}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/x-zip-compressed",
        },
        body: ZIP_FILE_DATA,
    })
        .then((response) =>
            response.json().then((data) => ({ status: response.status, body: data }))
        )
        .then(({ status, body }) => {
            if (status === 200) {
                showNotification(`Dataset "${id}" added successfully.`, 'success');
                // Update dataset list
                listDatasets();
            } else {
                showNotification(`Error adding dataset: ${body.error}`, 'error');
            }
        })
        .catch((err) => {
            console.error(err);
            showNotification("Error while adding dataset.", 'error');
        });
}

export function listDatasets() {
    fetch("/datasets")
        .then((response) => response.json())
        .then((data) => {
            if (data.result) {
                updateDatasetTable(data.result);
            } else {
                showNotification("Error fetching datasets.", 'error');
            }
        })
        .catch((err) => {
            console.error(err);
            showNotification("Error fetching datasets.", 'error');
        });
}

function updateDatasetTable(datasets) {
    const tbody = document.querySelector(".dataset-list tbody");
    tbody.innerHTML = ""; // Clear existing rows

    datasets.forEach((dataset) => {
        const row = document.createElement("tr");

        // Select Cell
        const selectCell = document.createElement("td");
        const radioInput = document.createElement("input");
        radioInput.type = "radio";
        radioInput.name = "dataset";
        radioInput.value = dataset.id;
        selectCell.appendChild(radioInput);
        row.appendChild(selectCell);

        // Event Listener for dataset selection
        radioInput.addEventListener("change", () => {
            if (radioInput.checked) {
                selectedDataset = dataset;
                showNotification(`Selected dataset "${dataset.id}"`, 'success');
            }
        });

        // ID Cell
        const idCell = document.createElement("td");
        idCell.textContent = dataset.id;
        row.appendChild(idCell);

        // Kind Cell
        const kindCell = document.createElement("td");
        kindCell.textContent = dataset.kind;
        row.appendChild(kindCell);

        // Rows Cell
        const rowsCell = document.createElement("td");
        rowsCell.textContent = dataset.numRows;
        row.appendChild(rowsCell);

        // Actions Cell
        const actionsCell = document.createElement("td");
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";
        removeButton.addEventListener("click", () => removeDataset(dataset.id));
        actionsCell.appendChild(removeButton);
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
}

function removeDataset(id) {
    fetch(`/dataset/${encodeURIComponent(id)}`, {
        method: "DELETE",
    })
        .then((response) =>
            response.json().then((data) => ({ status: response.status, body: data }))
        )
        .then(({ status, body }) => {
            if (status === 200) {
                showNotification(`Dataset "${id}" removed successfully.`, 'success');
                // Update dataset list
                listDatasets();
                // Clear chart if the removed dataset was selected
                if (selectedDataset && selectedDataset.id === id) {
                    selectedDataset = null;
                }
            } else {
                showNotification(`Error removing dataset: ${body.error}`, 'error');
            }
        })
        .catch((err) => {
            console.error(err);
            showNotification("Error while removing dataset.", 'error');
        });
}
