// listManager.js

import { showNotification } from './utils.js';

const listItems = new Set();
const inputField = document.getElementById("stringInput");
const addButton = document.getElementById("addButton");
const stringList = document.getElementById("stringList");

export function initializeListManager() {
    addButton.addEventListener("click", addToList);
}

function addToList() {
    const userInput = inputField.value.trim(); // get the input value and trim whitespace

    if (userInput === "") {
        showNotification("Course id is empty!", 'error');
        inputField.value = ""; // clear the input field
        return;
    }

    if (listItems.has(userInput)) {
        showNotification("This class is already in the list!", 'error');
        inputField.value = ""; // clear the input field
        return;
    }

    if (userInput) {
        // create a new list item
        const listItem = document.createElement("li");
        listItem.textContent = userInput;

        // add a delete button to the list item
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => {
            stringList.removeChild(listItem); // remove item
            listItems.delete(userInput);
        });

        listItem.appendChild(deleteButton); // append button to item
        stringList.appendChild(listItem); // append item to list
        listItems.add(userInput);
        inputField.value = "";
    } else {
        showNotification("Please enter a valid course!", 'error');
    }
}
